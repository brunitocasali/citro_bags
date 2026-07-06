import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import crypto from 'node:crypto';
import heicConvert from 'heic-convert';
import { Jimp } from 'jimp';
import { config } from './config.mjs';

// Lado más largo máximo (px) que mandamos a OpenAI. Suficiente como referencia y evita payloads gigantes.
const MAX_DIM = 2048;
const JPEG_QUALITY = 85;

/**
 * ¿El archivo es HEIC/HEIF? (fotos de iPhone). No confiamos solo en el mimetype
 * porque iPhone/Safari a veces lo mandan como application/octet-stream o vacío.
 * Chequeamos mimetype, extensión y "magic bytes" del contenedor ISO-BMFF (ftyp...).
 */
export function isHeic(file) {
  const mime = (file.mimetype || '').toLowerCase();
  if (mime === 'image/heic' || mime === 'image/heif' || mime === 'image/heic-sequence' || mime === 'image/heif-sequence') {
    return true;
  }
  const name = (file.originalname || '').toLowerCase();
  if (/\.(heic|heif)$/.test(name)) return true;

  // Magic bytes: en un archivo HEIC/HEIF, los bytes 4..8 son "ftyp" y el "major brand"
  // que sigue suele ser heic/heix/heif/mif1/msf1/hevc/hevx.
  const buf = file.buffer;
  if (buf && buf.length >= 12) {
    const ftyp = buf.toString('ascii', 4, 8);
    if (ftyp === 'ftyp') {
      const brand = buf.toString('ascii', 8, 12).toLowerCase();
      if (['heic', 'heix', 'heif', 'mif1', 'msf1', 'hevc', 'hevx', 'heim', 'heis', 'hevm', 'hevs'].includes(brand)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Normaliza una foto del cliente para mandarla a OpenAI, sirva de cualquier teléfono:
 *   1. Si es HEIC/HEIF (iPhone) → la convierte a JPEG en memoria.
 *   2. Si el lado más largo supera MAX_DIM (2048px) → la reduce manteniendo proporción.
 *   3. La re-encodea a JPEG (~0.85) para bajar el peso.
 * Todo pure-JS (heic-convert + jimp), sin binarios nativos.
 * Devuelve { buffer, mimetype, filename } coherentes con el buffer final.
 */
export async function normalizeImage(file) {
  const rawName = file.originalname || 'foto';
  const base = rawName.replace(/\.[^.]+$/, '') || 'foto';

  let working = file.buffer;
  let mimetype = file.mimetype || 'image/png';
  let filename = rawName.indexOf('.') >= 0 ? rawName : `${rawName}.png`;

  // 1) HEIC/HEIF → JPEG
  if (isHeic(file)) {
    try {
      const jpegBuffer = await heicConvert({ buffer: file.buffer, format: 'JPEG', quality: 0.9 });
      working = Buffer.from(jpegBuffer);
      mimetype = 'image/jpeg';
      filename = `${base}.jpg`;
      console.log(`[kit-preview] HEIC/HEIF detectado ("${rawName}") → convertido a JPEG`);
    } catch (e) {
      const err = new Error(`No se pudo convertir la foto HEIC: ${e?.message ?? e}`);
      err.code = 'HEIC_CONVERT_ERROR';
      throw err;
    }
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
  } catch (e) {
    // Si jimp no pudo leer/re-encodear (formato raro), mandamos lo que ya tengamos
    // (el HEIC ya quedó convertido a JPEG arriba; un JPEG/PNG normal se manda tal cual).
    console.warn(`[kit-preview] no se pudo redimensionar/re-encodear ("${rawName}"), se envía original:`, e?.message ?? e);
  }

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

Respetar al máximo la identidad real de cada animal: cara, ojos, hocico, orejas, manchas, color del pelaje, textura, expresión, tamaño y proporciones. No cambiar la raza. No inventar otra mascota. No hacerla genérica. No modificar rasgos importantes.

Si la foto de referencia es de baja calidad, a distancia o con reflejos, priorizar el patrón de color y las siluetas reconocibles de cada mascota por sobre el detalle fino; nunca inventar una mascota distinta.

Crear una preview / mockup completa estilo "Kit Hincha de Argentina" en una sola escena cálida, premium y comercial, lista para mostrar al cliente. Escena horizontal, estética boutique cálida: mesa de madera, luz suave, fondo acogedor, plantas, decoración sutil, tonos naturales y aspecto profesional de tienda online.

NO hacer collage dividido en cuadros. Mostrar juntos estos productos en una sola escena:
1. Remera blanca colgada en percha de madera.
2. Tote bag color natural.
3. Taza blanca.
4. Cuadro enmarcado grande.
5. Gorra blanca con visera celeste/azul, apoyada como producto físico sobre la mesa.

Cada producto lleva una ilustración diferente de la misma mascota (o grupo de mascotas) en versión hincha de Argentina:
REMERA: la mascota con camiseta argentina celeste y blanca, con una pelota de fútbol cerca. Una sola ilustración centrada, respetando área real de impresión y márgenes blancos.
TOTE: la mascota con bandera argentina como capa, en pose tierna de hincha.
TAZA: la mascota abrazando o sosteniendo una copa dorada estilo trofeo.
CUADRO: la mascota en pose más dinámica (corriendo, festejando o jugando con pelota).
GORRA: retrato simple de la mascota con detalles celestes y blancos.

Estilo de ilustración: acuarela premium, tierna y realista. Salpicaduras celestes y blancas detrás de la mascota. Toques dorados sutiles. Huellitas o corazones pequeños si quedan bien. El diseño debe verse impreso de forma realista sobre cada producto.

${nombres ? `Nombre de la mascota escrito debajo de cada diseño en tipografía script azul, diciendo exactamente: "${nombres}".` : 'Sin texto de nombre.'}

Tema Argentina: camiseta celeste y blanca; bandera argentina como capa en un diseño; pelota de fútbol; copa dorada; puede incluir sol argentino decorativo. No usar marcas deportivas oficiales.

Reglas: No collage separado en cuadrados. No agregar productos extra. No repetir exactamente la misma pose en todos los productos. No poner cuerpo humano. No deformar anatomía. No agregar patas ni ojos extra. No cambiar la raza. No hacer el diseño demasiado grande en la remera. No tapar rasgos importantes. Mantener área de impresión realista en cada producto. La gorra es un producto físico dentro del mockup, no puesta en la cabeza del animal. El cuadro debe verse grande y claro.

${varias ? 'Hay más de una mascota (hasta 5): deben aparecer todas juntas en cada producto, respetando cuál es cada una (color, tamaño, manchas, orejas, expresión, pelaje, proporciones). No agregar ni eliminar mascotas. No confundir los nombres.' : ''}

Resultado final: una imagen de preview premium, cálida y comercial, con el kit completo personalizado de la mascota o mascotas como hinchas de Argentina, con todos los productos juntos en una sola escena.`;
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
  for (const f of files.slice(0, 5)) {
    prepared.push(await normalizeImage(f));
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
