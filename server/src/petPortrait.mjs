import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import crypto from 'node:crypto';
import { config } from './config.mjs';
import { normalizeImage } from './kitPreview.mjs';

/**
 * Prompt del RETRATO DIGITAL DE MASCOTA (producto del ebook).
 * OJO: NO es el prompt del Kit Mundial. Esto es un retrato artístico pintado, sin productos ni mockups.
 */
const PORTRAIT_PROMPT = `Usa la imagen subida como referencia principal y obligatoria de la mascota y crea a partir de ella un retrato artístico pintado, no una copia fotográfica ni una versión hiperrealista.

OBJETIVO PRINCIPAL
Transformar la fotografía de la mascota en una ilustración artística con apariencia de pintura tradicional hecha a mano, conservando claramente su identidad y sus rasgos característicos. La mascota final debe reconocerse inmediatamente como el mismo animal de la fotografía original, pero la imagen debe sentirse como una obra de arte pintada, con pinceladas visibles, interpretación artística y textura pictórica.
La fotografía debe utilizarse únicamente como referencia para: forma de la cabeza, proporciones del rostro, tamaño y posición de los ojos, forma y posición de las orejas, forma del hocico, nariz, expresión, manchas y distribución del color del pelaje, largo y textura general del pelo, postura corporal cuando sea visible, proporciones del cuerpo, y características particulares que hagan reconocible a esa mascota. No modificar estos rasgos para convertirla en una mascota genérica.

NIVEL DE FIDELIDAD
Mantener una alta fidelidad en la identidad, pero una baja fidelidad fotográfica en el acabado. El resultado NO debe parecer una fotografía procesada con un filtro. Debe parecer que un artista observó la fotografía y luego realizó un retrato interpretativo de la mascota con pintura. Conservar especialmente: expresión de los ojos, relación entre ojos, nariz y hocico, forma específica de las orejas, color real del pelaje, manchas particulares, expresión emocional y silueta característica. No embellecer modificando excesivamente la anatomía. No agrandar demasiado los ojos. No convertir al animal en caricatura. No cambiar su raza. No estilizar el rostro hasta perder parecido.

ESTILO ARTÍSTICO
Crear una pintura contemporánea delicada, cálida y expresiva. Estética de retrato artístico de mascota pintado a mano, combinando pintura acrílica suave, acuarela, gouache, pinceladas visibles, manchas pictóricas, bordes parcialmente difuminados, variación natural en la densidad de la pintura, y pequeñas zonas donde se perciba la textura del papel o lienzo. La mascota debe tener más definición en ojos, nariz, hocico y expresión facial. El resto del cuerpo puede resolverse con pinceladas progresivamente más sueltas. Evitar el detalle fotográfico de cada pelo individual. El pelaje debe construirse mediante masas de color y pinceladas, no mediante reproducción hiperrealista.

TRATAMIENTO DEL ROSTRO
El rostro es la parte más importante del retrato. Pintar los ojos de manera expresiva y profunda, manteniendo exactamente su forma y posición según la fotografía. Crear pequeños reflejos naturales en los ojos, sin exagerarlos. Representar nariz y hocico mediante pinceladas y capas de pintura. Mantener pliegues, marcas y características del rostro cuando sean parte importante de la identidad del animal. No suavizar tanto el rostro que pierda personalidad. No utilizar líneas digitales perfectamente definidas. El acabado debe sentirse orgánico y manual.

PINCELADAS
Usar pinceladas claramente perceptibles. Combinar pinceladas cortas para determinadas zonas del pelaje, pinceladas amplias y suaves en cuello y cuerpo, manchas de color superpuestas, pequeñas imperfecciones naturales propias de una pintura, y transiciones parcialmente mezcladas. Algunas pinceladas pueden extenderse ligeramente fuera de la silueta para dar sensación artística. Evitar contornos negros rígidos. La silueta puede perderse parcialmente en algunas zonas dentro del fondo acuarelado.

FONDO
Crear un fondo artístico simple y elegante. No reproducir el fondo original de la fotografía. Eliminar completamente muebles, mantas, suelo, paredes, personas, correas, objetos, texto y elementos ambientales que aparezcan en la foto. Reemplazarlo por un fondo de acuarela y pintura pastel abstracta, compuesto por manchas suaves, pinceladas y lavados de color situados principalmente detrás de la mascota. Utilizar una combinación armoniosa de rosa pastel, rosa empolvado, lila, lavanda, celeste pastel, azul muy suave y pequeños toques beige o crema. Los colores deben mezclarse suavemente. Evitar colores neón o saturados. Evitar rojo intenso, naranja fuerte, verde intenso o amarillo chillón. Dejar zonas claras alrededor para que la composición respire. El fondo no debe competir visualmente con la mascota.

COMPOSICIÓN
Realizar un único retrato de una sola mascota. No crear collage. No duplicar al animal. No agregar elementos decorativos innecesarios. Colocar la mascota aproximadamente centrada. Si la fotografía muestra suficiente cuerpo, realizar preferentemente un retrato de cuerpo completo o aproximadamente tres cuartos. Si la fotografía solamente permite ver claramente el rostro, crear un retrato desde el pecho hacia arriba. No inventar partes del cuerpo de forma extraña. Mantener una composición limpia, elegante y apta para utilizar luego en productos personalizados e impresiones artísticas.

ACABADO PICTÓRICO
El resultado debe situarse claramente entre una ilustración y una pintura tradicional. Debe percibirse artístico, artesanal, emocional, delicado, cálido, elegante y contemporáneo. Debe parecer una obra pintada especialmente para esa mascota. No utilizar acabado 3D. No utilizar estilo render. No utilizar apariencia vectorial. No utilizar estética de fotografía de estudio. No utilizar hiperrealismo. No utilizar filtros fotográficos. No utilizar efecto óleo extremadamente realista. El objetivo es un estilo de pintura expresiva y reconocible, no una reproducción perfecta de la fotografía.

DETALLES QUE DEBEN ELIMINARSE
Si la mascota lleva accesorios en la fotografía, eliminarlos salvo que se solicite expresamente conservarlos. Eliminar por defecto arnés, pretal, correa, collar grande, ropa, moños y accesorios. Reconstruir de manera natural el pelaje que estaría debajo de esos elementos. No dejar marcas visuales ni restos del accesorio.

PALETA DE LA MASCOTA
Mantener los colores naturales reales de la mascota. No teñir al animal con los colores pastel del fondo. Los tonos rosa, lila y celeste deben utilizarse principalmente en el fondo y en algunas pinceladas ambientales. El pelaje debe conservar color real, sombras naturales, variaciones de tono y marcas características. Se pueden suavizar ligeramente los colores para integrarlos con la estética pictórica, pero sin cambiar la identidad cromática del animal.

ILUMINACIÓN
Iluminación suave y natural. Dar volumen al rostro mediante luces y sombras pintadas. Evitar iluminación dramática o contrastes extremadamente fuertes. Preferir una sensación luminosa, suave y cálida.

TEXTURA
Añadir textura visual sutil de papel de acuarela, lienzo muy fino, pincel, pigmento y pintura ligeramente seca en algunas zonas. La textura debe ser sutil. No añadir ruido digital.

RESULTADO FINAL DESEADO
Un retrato artístico individual de la mascota, inspirado fielmente en la imagen de referencia, pero reinterpretado como una pintura contemporánea realizada a mano. Debe verse claramente que se trata de la misma mascota, conservando expresión, proporciones y rasgos particulares. Al mismo tiempo, debe alejarse claramente de una fotografía y tener pinceladas visibles, textura pictórica, simplificación artística del pelaje, fondo abstracto en acuarela pastel, bordes suaves e imperfectos y sensación de obra hecha a mano. El equilibrio ideal es 70 % pintura artística / 30 % realismo anatómico. Mantener la identidad de la mascota con mucha precisión, pero permitir libertad artística en pinceladas, texturas, luces y fondo.

EVITAR ESPECÍFICAMENTE
No hacer una copia exacta de la fotografía. No producir un resultado hiperrealista. No crear una fotografía con filtro de acuarela. No dibujar cada pelo individual. No usar bordes digitales perfectos. No convertir la mascota en caricatura. No exagerar ojos, cabeza o expresión. No cambiar la anatomía. No cambiar la raza. No modificar colores o manchas importantes. No agregar accesorios que no existan. No agregar flores, objetos, marcos, texto ni decoraciones alrededor salvo que se solicite. No mostrar la fotografía original dentro del resultado. No hacer mockup. No mostrar camisetas, bolsos, tazas, cuadros ni productos. Generar únicamente la obra artística final de la mascota.

INSTRUCCIÓN FINAL
Analiza primero cuidadosamente la fotografía subida para identificar los rasgos que hacen única a esta mascota. Después crea una interpretación pictórica expresiva y delicada, manteniendo esos rasgos esenciales. Ante cualquier elección entre "hacerla más bonita" o "mantener el parecido", priorizar siempre mantener el parecido. Ante cualquier elección entre "hacerla más realista" o "hacerla más pictórica", priorizar el acabado pictórico, siempre que la mascota siga siendo claramente reconocible.`;

/** Guarda el retrato generado como respaldo nuestro. */
function savePortrait(b64, meta) {
  mkdirSync(config.petPortraitsDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const id = crypto.randomBytes(4).toString('hex');
  const base = `${stamp}_${(meta.orderId || 'orden').slice(0, 12)}_${id}`;
  writeFileSync(join(config.petPortraitsDir, `${base}.png`), Buffer.from(b64, 'base64'));
  writeFileSync(
    join(config.petPortraitsDir, `${base}.json`),
    JSON.stringify({ ...meta, file: `${base}.png`, createdAt: new Date().toISOString() }, null, 2)
  );
  return `${base}.png`;
}

/**
 * Genera el retrato digital de la mascota con OpenAI a partir de una foto de referencia.
 * @param {{ files: {buffer:Buffer, mimetype:string, originalname:string}[], orderId?:string }} input
 * @returns {Promise<{ b64: string, savedPath: string }>}
 */
export async function generatePetPortrait({ files, orderId }) {
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

  // Un solo retrato: usamos la primera foto. Normaliza HEIC→JPEG + resize.
  const prepared = [await normalizeImage(files[0], 0)];

  const fd = new FormData();
  fd.append('model', config.openaiImageModel);
  fd.append('prompt', PORTRAIT_PROMPT);
  fd.append('size', '1024x1024'); // retrato cuadrado, ideal para impresión/productos
  if (config.openaiImageQuality) fd.append('quality', config.openaiImageQuality);
  fd.append('n', '1');
  for (const p of prepared) {
    fd.append('image[]', new Blob([p.buffer], { type: p.mimetype }), p.filename);
  }

  console.log(
    `[pet-portrait] pidiendo a OpenAI → model=${config.openaiImageModel} quality=${config.openaiImageQuality} size=1024x1024 orden=${orderId || '-'}`
  );

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 180000);
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

  const fileName = savePortrait(b64, { orderId: orderId || '' });
  return { b64, fileName };
}
