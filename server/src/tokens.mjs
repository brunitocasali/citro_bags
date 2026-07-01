import crypto from 'node:crypto';
import { config } from './config.mjs';

function b64url(buf) {
  return Buffer.from(buf).toString('base64url');
}

function sign(data) {
  return crypto.createHmac('sha256', config.downloadSecret).update(data).digest('base64url');
}

/**
 * Genera un token de descarga firmado para un (orden, producto), con vencimiento.
 * El token por sí solo NO habilita nada: al descargar se re-verifica en la BD
 * que la orden esté aprobada y contenga ese producto.
 */
export function makeDownloadToken(orderId, slug, ttlHours = config.downloadTtlHours) {
  const exp = Date.now() + ttlHours * 3600 * 1000;
  const payload = b64url(JSON.stringify({ o: orderId, s: slug, e: exp }));
  const sig = sign(payload);
  return `${payload}.${sig}`;
}

export function verifyDownloadToken(token) {
  if (typeof token !== 'string' || !token.includes('.')) return null;
  const [payload, sig] = token.split('.');
  const expected = sign(payload);
  // Comparación en tiempo constante.
  if (
    sig.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
  ) {
    return null;
  }
  let data;
  try {
    data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
  } catch {
    return null;
  }
  if (!data?.o || !data?.s || !data?.e) return null;
  if (Date.now() > Number(data.e)) return null;
  return { orderId: data.o, slug: data.s, exp: data.e };
}
