// Prueba de detección HEIC + normalizeImage (buffers simulados).
import { Jimp } from 'jimp';
import { isHeic, normalizeImage } from './src/kitPreview.mjs';

function assert(cond, msg) {
  if (!cond) { console.error('❌', msg); process.exitCode = 1; }
  else console.log('✅', msg);
}

function fakeHeicBuffer(brand = 'heic') {
  const buf = Buffer.alloc(64, 0);
  buf.writeUInt32BE(32, 0);
  buf.write('ftyp', 4);
  buf.write(brand, 8);
  return buf;
}

async function main() {
  // Detección: mimetype octet-stream sin extensión pero magic HEIC
  const heicOctet = {
    buffer: fakeHeicBuffer('heic'),
    mimetype: 'application/octet-stream',
    originalname: 'IMG_1234',
  };
  assert(isHeic(heicOctet), 'detecta HEIC por magic bytes (octet-stream, sin extensión)');

  // Detección: extensión .HEIC mayúsculas
  assert(
    isHeic({ buffer: Buffer.alloc(8), mimetype: '', originalname: 'photo.HEIC' }),
    'detecta HEIC por extensión .HEIC'
  );

  // JPEG normal NO es HEIC
  const jpeg = new Jimp({ width: 800, height: 600, color: 0xff0000ff });
  const jpegBuf = await jpeg.getBuffer('image/jpeg', { quality: 90 });
  assert(
    !isHeic({ buffer: jpegBuf, mimetype: 'image/jpeg', originalname: 'foto.jpg' }),
    'JPEG normal no se detecta como HEIC'
  );

  // normalizeImage con JPEG grande → resize
  const big = new Jimp({ width: 3000, height: 2000, color: 0x3366ccff });
  const bigJpg = await big.getBuffer('image/jpeg', { quality: 90 });
  const out = await normalizeImage(
    { buffer: bigJpg, mimetype: 'image/jpeg', originalname: 'grande.jpg' },
    0
  );
  const outImg = await Jimp.read(out.buffer);
  assert(Math.max(outImg.width, outImg.height) <= 2048, 'JPEG grande normalizado a <=2048px');
  assert(out.mimetype === 'image/jpeg', 'salida JPEG');

  // HEIC fake → debe fallar conversión con HEIC_CONVERT_ERROR (no es HEIC real)
  try {
    await normalizeImage(
      { buffer: fakeHeicBuffer('heic'), mimetype: 'image/heic', originalname: 'fake.heic' },
      1
    );
    console.error('❌ fake HEIC debería fallar conversión');
    process.exitCode = 1;
  } catch (e) {
    assert(e.code === 'HEIC_CONVERT_ERROR', 'fake HEIC lanza HEIC_CONVERT_ERROR (esperado)');
  }

  console.log('\nHecho.');
}

main().catch((e) => { console.error('ERROR:', e); process.exit(1); });
