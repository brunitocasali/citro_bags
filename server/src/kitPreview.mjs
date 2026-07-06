import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import crypto from 'node:crypto';
import heicConvert from 'heic-convert';
import { Jimp } from 'jimp';
import { config } from './config.mjs';

// Lado más largo máximo (px) que mandamos a OpenAI. Suficiente como referencia y evita payloads gigantes.
const MAX_DIM = 2048;
const JPEG_QUALITY = 85;

// Marcas ISO-BMFF (ftyp) típicas de HEIC/HEIF de iPhone y variantes.
const HEIC_BRANDS = new Set([
  'heic', 'heix', 'heif', 'mif1', 'msf1', 'hevc', 'hevx', 'heim', 'heis', 'hevm', 'hevs',
  'hvc1', 'hvi1', 'avif', 'avis', 'av01', 'avci', 'avcs',
]);

/** ¿El buffer tiene cabecera JPEG/PNG/WebP/GIF? (formato que OpenAI acepta directo) */
function isKnownRaster(buf) {
  if (!buf || buf.length < 12) return false;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true; // JPEG
  if (buf.toString('ascii', 0, 4) === '\x89PNG') return true;
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return true;
  if (buf.toString('ascii', 0, 3) === 'GIF') return true;
  return false;
}

/** Busca caja ftyp en los primeros bytes y devuelve major brand si parece HEIC/HEIF. */
function sniffHeicBrand(buf) {
  if (!buf || buf.length < 12) return null;

  const checkAt = (brandOffset) => {
    const major = buf.toString('ascii', brandOffset, brandOffset + 4).replace(/\0/g, '').toLowerCase();
    if (HEIC_BRANDS.has(major)) return major;
    for (let i = brandOffset + 8; i + 4 <= buf.length && i < brandOffset + 96; i += 4) {
      const compat = buf.toString('ascii', i, i + 4).replace(/\0/g, '').toLowerCase();
      if (HEIC_BRANDS.has(compat)) return compat;
    }
    return null;
  };

  if (buf.toString('ascii', 4, 8) === 'ftyp') {
    const brand = checkAt(8);
    if (brand) return brand;
  }

  for (let i = 0; i + 12 <= buf.length && i < 128; i += 1) {
    if (buf.toString('ascii', i, i + 4) === 'ftyp') {
      const brand = checkAt(i + 4);
      if (brand) return brand;
    }
  }
  return null;
}

/**
 * ¿El archivo es HEIC/HEIF? (fotos de iPhone). No confiamos solo en el mimetype
 * porque iPhone/Safari a veces lo mandan como application/octet-stream, vacío,
 * o con nombre genérico sin extensión (.heic).
 */
export function isHeic(file) {
  const mime = (file.mimetype || '').toLowerCase();
  if (
    mime.includes('heic') ||
    mime.includes('heif') ||
    mime === 'image/heic-sequence' ||
    mime === 'image/heif-sequence'
  ) {
    return true;
  }
  const name = (file.originalname || '').toLowerCase();
  if (/\.(heic|heif)$/i.test(name)) return true;

  const buf = file.buffer;
  if (sniffHeicBrand(buf)) return true;

  // iPhone a veces manda octet-stream sin extensión pero el contenido es HEIC.
  if (
    buf &&
    buf.length > 12 &&
    !isKnownRaster(buf) &&
    (mime === 'application/octet-stream' || mime === 'binary/octet-stream' || mime === '')
  ) {
    return Boolean(sniffHeicBrand(buf));
  }
  return false;
}

/** Log de diagnóstico para fotos de iPhone / Safari. */
function logIncomingFile(file, index = 0) {
  const buf = file.buffer;
  const magic = buf && buf.length >= 4 ? buf.toString('hex', 0, Math.min(16, buf.length)) : 'n/a';
  const brand = buf ? sniffHeicBrand(buf) : null;
  const heic = isHeic(file);
  console.log(
    `[kit-preview] foto #${index + 1}: name="${file.originalname || ''}" mime="${file.mimetype || ''}" ` +
      `size=${buf?.length ?? 0} magic=${magic} ftypBrand=${brand || '-'} isHeic=${heic}`
  );
}

function toArrayBuffer(buf) {
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

/** Convierte HEIC/HEIF a JPEG con heic-convert; fallback a .all() si hace falta. */
async function convertHeicToJpeg(buffer, label = 'foto') {
  const input = toArrayBuffer(buffer);
  try {
    const out = await heicConvert({ buffer: input, format: 'JPEG', quality: 0.9 });
    console.log(`[kit-preview] HEIC convertido OK ("${label}") → JPEG ${Buffer.from(out).length} bytes`);
    return Buffer.from(out);
  } catch (e1) {
    console.warn(`[kit-preview] heic-convert directo falló ("${label}"):`, e1?.message ?? e1);
    try {
      const images = await heicConvert.all({ buffer: input, format: 'JPEG' });
      if (images?.length) {
        const out = await images[0].convert();
        console.log(`[kit-preview] HEIC convertido OK vía .all() ("${label}") → JPEG ${Buffer.from(out).length} bytes`);
        return Buffer.from(out);
      }
    } catch (e2) {
      const err = new Error(`heic-convert: ${e1?.message ?? e1} | all: ${e2?.message ?? e2}`);
      err.code = 'HEIC_CONVERT_ERROR';
      throw err;
    }
    const err = new Error(`heic-convert: ${e1?.message ?? e1}`);
    err.code = 'HEIC_CONVERT_ERROR';
    throw err;
  }
}

/**
 * Normaliza una foto del cliente para mandarla a OpenAI, sirva de cualquier teléfono:
 *   1. Si es HEIC/HEIF (iPhone) → la convierte a JPEG en memoria.
 *   2. Si el lado más largo supera MAX_DIM (2048px) → la reduce manteniendo proporción.
 *   3. La re-encodea a JPEG (~0.85) para bajar el peso.
 * Todo pure-JS (heic-convert + jimp), sin binarios nativos.
 * Devuelve { buffer, mimetype, filename } coherentes con el buffer final.
 */
export async function normalizeImage(file, index = 0) {
  logIncomingFile(file, index);

  const rawName = file.originalname || 'foto';
  const base = rawName.replace(/\.[^.]+$/, '') || 'foto';

  let working = file.buffer;
  let mimetype = file.mimetype || 'application/octet-stream';
  let filename = rawName.indexOf('.') >= 0 ? rawName : `${rawName}.jpg`;
  let heicDetected = isHeic(file);

  // 1) HEIC/HEIF → JPEG (iPhone)
  if (heicDetected) {
    working = await convertHeicToJpeg(working, rawName);
    mimetype = 'image/jpeg';
    filename = `${base}.jpg`;
  }

  // 2 + 3) resize (si hace falta) + re-encode a JPEG para bajar peso
  try {
    const img = await Jimp.read(working);
    const longest = Math.max(img.width, img.height);
    if (longest > MAX_DIM) {
      const scale = MAX_DIM / longest;
      img.resize({ w: Math.round(img.width * scale), h: Math.round(img.height * scale) });
      console.log(`[kit-preview] foto redimensionada de ${longest}px a ${MAX_DIM}px (lado largo)`);
    }
    working = await img.getBuffer('image/jpeg', { quality: JPEG_QUALITY });
    mimetype = 'image/jpeg';
    filename = `${base}.jpg`;
  } catch (jimpErr) {
    // Fallback: a veces iPhone manda octet-stream sin extensión; probamos HEIC aunque no lo hayamos detectado antes.
    if (!heicDetected && sniffHeicBrand(working)) {
      console.warn(`[kit-preview] jimp no leyó "${rawName}", reintento como HEIC:`, jimpErr?.message ?? jimpErr);
      try {
        working = await convertHeicToJpeg(working, rawName);
        heicDetected = true;
        const img = await Jimp.read(working);
        const longest = Math.max(img.width, img.height);
        if (longest > MAX_DIM) {
          const scale = MAX_DIM / longest;
          img.resize({ w: Math.round(img.width * scale), h: Math.round(img.height * scale) });
        }
        working = await img.getBuffer('image/jpeg', { quality: JPEG_QUALITY });
        mimetype = 'image/jpeg';
        filename = `${base}.jpg`;
      } catch (e) {
        const err = new Error(`No se pudo procesar la foto (HEIC/iPhone): ${e?.message ?? e}`);
        err.code = 'HEIC_CONVERT_ERROR';
        throw err;
      }
    } else if (heicDetected) {
      const err = new Error(`HEIC convertido pero jimp no pudo leer el JPEG: ${jimpErr?.message ?? jimpErr}`);
      err.code = 'HEIC_CONVERT_ERROR';
      throw err;
    } else {
      console.warn(`[kit-preview] no se pudo leer/re-encodear ("${rawName}"), se envía original:`, jimpErr?.message ?? jimpErr);
    }
  }

  console.log(
    `[kit-preview] foto #${index + 1} lista → ${filename} ${mimetype} ${working.length} bytes` +
      (heicDetected ? ' (desde HEIC)' : '')
  );

  return { buffer: working, mimetype, filename };
}

/**
 * Prompt maestro "Kit Mundial" (ver docs/citro-arte-pod/Prompt_KitMundial.md).
 * La marca de agua NO se pide acá (el modelo inventa firmas): se superpone aparte si se quiere.
 */
function buildPrompt({ petName, count }) {
  const varias = Number(count) > 1 || /(\by\b|,|&)/i.test(petName || '');
  const nombres = (petName || '').trim();
  return `Usar la foto subida como referencia principal de la mascota o mascotas.

PRIORIDAD MÁXIMA — ANATOMÍA CORRECTA Y REALISTA (esto es lo más importante de todo):
Cada mascota ilustrada debe tener anatomía natural, correcta y creíble, exactamente como un animal real:
- Exactamente CUATRO (4) patas, ni más ni menos.
- Exactamente UNA (1) cola.
- Exactamente DOS (2) ojos, bien ubicados y simétricos.
- Exactamente DOS (2) orejas.
- Una (1) sola cabeza y un (1) solo cuerpo, con proporciones naturales de la raza.
Está TERMINANTEMENTE PROHIBIDO: patas de más o de menos, ojos de más, orejas de más, colas de más, dedos o garras extra, miembros fusionados o pegados entre sí, extremidades torcidas o dobladas de forma imposible, cuerpos deformados, caras derretidas o distorsionadas, rasgos duplicados. Si una pose es difícil de resolver, elegí una pose más simple y clara antes que arriesgar un error anatómico. Preferí poses simples, estables y de frente, con el cuerpo completo y las patas bien visibles y contadas.

Respetar al máximo la identidad real de cada animal: cara, ojos, hocico, orejas, manchas, color y patrón exacto del pelaje, textura, expresión, tamaño y proporciones. No cambiar la raza. No inventar otra mascota. No hacerla genérica. No modificar rasgos importantes. La MISMA mascota debe verse claramente reconocible y consistente (mismo color, manchas y expresión) en TODOS los productos del kit.

Si la foto de referencia es de baja calidad, a distancia o con reflejos, priorizar el patrón de color y las siluetas reconocibles de cada mascota por sobre el detalle fino; nunca inventar una mascota distinta y nunca sacrificar la anatomía correcta.

Crear una preview / mockup completa estilo "Kit Hincha de Argentina" en una sola escena cálida, premium y comercial, lista para mostrar al cliente. Escena horizontal, estética boutique cálida: mesa de madera, luz suave, fondo acogedor, plantas, decoración sutil, tonos naturales y aspecto profesional de tienda online.

NO hacer collage dividido en cuadros. Mostrar juntos estos productos en una sola escena:
1. Remera blanca colgada en percha de madera.
2. Tote bag color natural.
3. Taza blanca.
4. Cuadro enmarcado grande.
5. Gorra blanca con visera celeste/azul, apoyada como producto físico sobre la mesa.

Cada producto lleva una ilustración de la misma mascota (o grupo de mascotas) en versión hincha de Argentina, con poses SIMPLES y CLARAS que dejen ver bien la anatomía completa:
REMERA: la mascota sentada o de pie, de frente, con camiseta argentina celeste y blanca y una pelota de fútbol al lado. Ilustración centrada, con las cuatro patas visibles, respetando márgenes de impresión.
TOTE: la mascota sentada de frente con una pequeña bandera argentina como capa, pose tierna y tranquila.
TAZA: retrato de medio cuerpo de la mascota junto a una copa dorada estilo trofeo (sin poses forzadas de las patas).
CUADRO: la mascota de cuerpo entero, de pie y de frente o en pose calma, con las cuatro patas apoyadas y bien visibles.
GORRA: retrato simple de la cabeza/busto de la mascota con detalles celestes y blancos.

Estilo de ilustración: acuarela premium, tierna y realista. Salpicaduras celestes y blancas detrás de la mascota. Toques dorados sutiles. Huellitas o corazones pequeños si quedan bien. El diseño debe verse impreso de forma realista sobre cada producto.

${nombres ? `Nombre de la mascota escrito debajo de cada diseño en tipografía script azul, diciendo exactamente: "${nombres}".` : 'Sin texto de nombre.'}

Tema Argentina: camiseta celeste y blanca; bandera argentina como capa en un diseño; pelota de fútbol; copa dorada; puede incluir sol argentino decorativo. No usar marcas deportivas oficiales.

EVITAR EXPLÍCITAMENTE (errores frecuentes a no cometer): perros o gatos con tres patas o cinco patas, patas extra, ojos extra, orejas extra, dos colas, dedos o garras de más, patas fusionadas, extremidades deformes o en ángulos imposibles, animal derretido o distorsionado, dos cabezas, rasgos duplicados, mezcla de dos animales, cuerpo humano, manos humanas.

Reglas: No collage separado en cuadrados. No agregar productos extra. Variar levemente el encuadre entre productos pero SIEMPRE con anatomía correcta. No poner cuerpo humano. No deformar la anatomía. Mantener exactamente 4 patas, 1 cola, 2 ojos y 2 orejas en cada ilustración. No cambiar la raza. No hacer el diseño demasiado grande en la remera. No tapar rasgos importantes. Mantener área de impresión realista en cada producto. La gorra es un producto físico dentro del mockup, no puesta en la cabeza del animal. El cuadro debe verse grande y claro.

${varias ? 'Hay más de una mascota (hasta 5): deben aparecer todas juntas en cada producto, cada una con su propia anatomía correcta (4 patas, 1 cola, 2 ojos, 2 orejas) y respetando cuál es cada una (color, tamaño, manchas, orejas, expresión, pelaje, proporciones). No fusionar mascotas entre sí. No agregar ni eliminar mascotas. No confundir los nombres.' : ''}

Resultado final: una imagen de preview premium, cálida y comercial, con el kit completo personalizado de la mascota o mascotas como hinchas de Argentina, con todos los productos juntos en una sola escena, y con la anatomía de cada animal perfectamente correcta y realista.`;
}

/** Guarda el preview generado + metadata como archivo nuestro de respaldo. */
function savePreview(b64, meta) {
  mkdirSync(config.kitPreviewsDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const slug = (meta.petName || 'mascota')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40) || 'mascota';
  const id = crypto.randomBytes(4).toString('hex');
  const base = `${stamp}_${slug}_${id}`;
  const imgPath = join(config.kitPreviewsDir, `${base}.png`);
  const metaPath = join(config.kitPreviewsDir, `${base}.json`);
  writeFileSync(imgPath, Buffer.from(b64, 'base64'));
  writeFileSync(metaPath, JSON.stringify({ ...meta, file: `${base}.png`, createdAt: new Date().toISOString() }, null, 2));
  return imgPath;
}

/**
 * Genera el preview del Kit Mundial con OpenAI a partir de la/las foto/s de referencia.
 * @param {{ files: {buffer:Buffer, mimetype:string, originalname:string}[], petName:string, count:string, clientName?:string, ip?:string }} input
 * @returns {Promise<{ b64: string, savedPath: string }>}
 */
export async function generateKitPreview({ files, petName, count, clientName, ip }) {
  if (!config.openaiApiKey) {
    const err = new Error('OPENAI_API_KEY no configurada.');
    err.code = 'NO_KEY';
    throw err;
  }
  if (!files || files.length === 0) {
    const err = new Error('Falta la foto de la mascota.');
    err.code = 'NO_IMAGE';
    throw err;
  }

  const prompt = buildPrompt({ petName, count });

  // Normalizamos cada foto: HEIC→JPEG + resize ≤2048px + re-encode JPEG (sirve de cualquier teléfono).
  const prepared = [];
  for (let i = 0; i < files.slice(0, 5).length; i++) {
    prepared.push(await normalizeImage(files[i], i));
  }

  const fd = new FormData();
  fd.append('model', config.openaiImageModel);
  fd.append('prompt', prompt);
  fd.append('size', config.openaiImageSize);
  if (config.openaiImageQuality) fd.append('quality', config.openaiImageQuality);
  fd.append('n', '1');
  for (const p of prepared) {
    fd.append('image[]', new Blob([p.buffer], { type: p.mimetype }), p.filename);
  }

  console.log(
    `[kit-preview] pidiendo a OpenAI → model=${config.openaiImageModel} quality=${config.openaiImageQuality} size=${config.openaiImageSize} imgs=${prepared.length}`
  );

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 180000); // 3 min

  let resp;
  try {
    resp = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.openaiApiKey}` },
      body: fd,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    const err = new Error(`OpenAI respondió ${resp.status}: ${text.slice(0, 300)}`);
    err.code = 'OPENAI_ERROR';
    throw err;
  }

  const data = await resp.json();
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) {
    const err = new Error('OpenAI no devolvió imagen.');
    err.code = 'OPENAI_EMPTY';
    throw err;
  }

  const savedPath = savePreview(b64, {
    petName: petName || '',
    count: count || '',
    clientName: clientName || '',
    ip: ip || '',
    origen: 'web-kit-mundial',
  });

  return { b64, savedPath };
}
