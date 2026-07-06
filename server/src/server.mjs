import express from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import { existsSync, statSync, createReadStream } from 'node:fs';
import { join } from 'node:path';
import { config } from './config.mjs';
import { generateKitPreview } from './kitPreview.mjs';
import { priceItems, getProduct } from './catalog.mjs';
import { priceShopItems } from './shopCatalog.mjs';
import {
  createOrder,
  getOrder,
  setOrderPreference,
  markOrderApproved,
  setOrderStatus,
  markOrderEmailSent,
} from './db.mjs';
import { createPreference, getPayment } from './mp.mjs';
import { makeDownloadToken, verifyDownloadToken } from './tokens.mjs';
import { sendDownloadEmail, sendOrderConfirmationEmail } from './mail.mjs';
import { basicAuth, salesReportHtml, salesReportCsv } from './admin.mjs';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** ¿La orden tiene productos digitales (con archivo para descargar)? */
function orderHasDownloads(order) {
  return order.items.some((i) => i.file);
}

/**
 * Envía el email de la orden una sola vez. No rompe el flujo si falla.
 * - Ebooks (con archivo): email con links de descarga firmados.
 * - Productos físicos (sin archivo): email de confirmación + aviso de coordinación de envío.
 */
async function deliverEmailOnce(orderId) {
  const order = getOrder(orderId);
  if (!order || order.status !== 'approved' || order.email_sent) return;
  try {
    const sent = orderHasDownloads(order)
      ? await sendDownloadEmail(order)
      : await sendOrderConfirmationEmail(order);
    if (sent) {
      markOrderEmailSent(orderId);
      console.log(`[mail] Email enviado a ${order.email} (orden ${orderId}).`);
    }
  } catch (err) {
    console.error(`[mail] No se pudo enviar el email de la orden ${orderId}:`, err?.message ?? err);
  }
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS mínimo: permitir que el sitio (otro origen en dev) llame a la API.
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && (origin === config.siteUrl || origin.startsWith('http://localhost'))) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Subida de fotos en memoria para el preview del Kit Mundial (máx. 5 imágenes, 20MB c/u).
// El límite es generoso porque comprimimos/redimensionamos server-side antes de OpenAI
// (fotos grandes de iPhone/Android entran igual). Aceptamos image/* y también HEIC/HEIF
// de iPhone (Safari a veces manda mimetype raro, ej. application/octet-stream, así que
// también dejamos pasar por extensión .heic/.heif).
const uploadPreview = multer({
  storage: multer.memoryStorage(),
  limits: { files: 5, fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const okMime = /^image\//i.test(file.mimetype || '');
    const okExt = /\.(heic|heif)$/i.test(file.originalname || '');
    cb(null, okMime || okExt);
  },
});

/**
 * Genera el preview "Kit Mundial" con IA a partir de la/s foto/s de la mascota.
 * Multipart: foto (una o varias), nombre_mascota, cantidad_mascotas, nombre_cliente.
 * Devuelve { image: "data:image/png;base64,..." }. Guarda una copia nuestra en disco.
 */
app.post('/api/kit-preview', uploadPreview.array('foto', 5), async (req, res) => {
  try {
    if (!config.openaiApiKey) {
      return res.status(503).json({ error: 'generación no disponible', code: 'NO_KEY' });
    }
    const files = req.files ?? [];
    if (files.length === 0) return res.status(400).json({ error: 'Falta la foto.', code: 'NO_IMAGE' });

    const petName = String(req.body?.nombre_mascota ?? '').slice(0, 120);
    const count = String(req.body?.cantidad_mascotas ?? '');
    const clientName = String(req.body?.nombre_cliente ?? '').slice(0, 120);
    const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').toString();

    const { b64, savedPath } = await generateKitPreview({ files, petName, count, clientName, ip });
    console.log(`[kit-preview] generado para "${petName}" (${files.length} foto/s) → ${savedPath}`);
    res.json({ image: `data:image/png;base64,${b64}` });
  } catch (err) {
    console.error('[kit-preview] error:', err?.message ?? err);
    const code = err?.code ?? 'ERROR';
    if (code === 'HEIC_CONVERT_ERROR') {
      return res
        .status(400)
        .json({ error: 'No pudimos procesar esa foto. Probá con otra (o sacale una captura).', code });
    }
    const status = code === 'NO_KEY' ? 503 : code === 'NO_IMAGE' ? 400 : 502;
    res.status(status).json({ error: 'No se pudo generar el preview.', code });
  }
});

// Clave pública para el front (Checkout Pro no la necesita, pero queda disponible).
app.get('/api/config', (_req, res) => res.json({ publicKey: config.mpPublicKey, currency: config.currency }));

/**
 * Crea el checkout. Body: { items: string[] (slugs), email: string }
 * Devuelve { orderId, initPoint } para redirigir a Mercado Pago.
 */
app.post('/api/checkout', async (req, res) => {
  try {
    const { items, email } = req.body ?? {};
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'Sin productos.' });
    if (typeof email !== 'string' || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return res.status(400).json({ error: 'Email inválido.' });
    }

    const { items: pricedItems, total } = priceItems(items);
    const orderId = crypto.randomUUID();

    const order = createOrder({
      id: orderId,
      email: email.trim().toLowerCase(),
      items: pricedItems,
      amount: total,
      currency: config.currency,
    });

    const pref = await createPreference(order);
    setOrderPreference(orderId, pref.id);

    res.json({ orderId, initPoint: pref.initPoint });
  } catch (err) {
    console.error('[checkout] error:', err?.message ?? err);
    res.status(400).json({ error: err?.message ?? 'No se pudo crear el checkout.' });
  }
});

/**
 * Checkout GENÉRICO para productos del catálogo físico (kits, productos sueltos, etc.).
 * Los precios SIEMPRE se validan contra `src/data/shopProducts.json` (nunca se confía en el cliente).
 *
 * Body: { items: Array<{ id: string, quantity?: number }>, email: string }
 * (También acepta { productId, quantity } por comodidad para un solo producto.)
 * Devuelve { orderId, initPoint } para redirigir a Mercado Pago.
 */
app.post('/api/checkout/product', async (req, res) => {
  try {
    let { items, email, productId, quantity } = req.body ?? {};
    // Atajo: un solo producto por { productId, quantity }.
    if (!items && productId) items = [{ id: productId, quantity }];

    if (typeof email !== 'string' || !EMAIL_RE.test(email)) {
      return res.status(400).json({ error: 'Email inválido.' });
    }

    const { items: pricedItems, total } = priceShopItems(items);
    const orderId = crypto.randomUUID();

    const order = createOrder({
      id: orderId,
      email: email.trim().toLowerCase(),
      items: pricedItems,
      amount: total,
      currency: config.currency,
    });

    const pref = await createPreference(order);
    setOrderPreference(orderId, pref.id);

    res.json({ orderId, initPoint: pref.initPoint });
  } catch (err) {
    console.error('[checkout/product] error:', err?.message ?? err);
    res.status(400).json({ error: err?.message ?? 'No se pudo crear el checkout.' });
  }
});

/**
 * Link de pago a PRECIO NEGOCIADO (protegido con usuario/clave del panel).
 * Pensado para el cierre MANUAL de Victoria: negocia por WhatsApp (bolsos a medida, kits
 * personalizados) y genera un link de Mercado Pago con el monto acordado.
 *
 * Body: { title: string, amount: number, quantity?: number, email?: string, description?: string }
 * Devuelve { orderId, initPoint }.
 */
app.post('/api/checkout/link', basicAuth, async (req, res) => {
  try {
    const { title, amount, quantity, email, description } = req.body ?? {};

    const cleanTitle = String(title ?? '').trim();
    if (!cleanTitle) return res.status(400).json({ error: 'Falta el título del producto.' });

    const price = Math.trunc(Number(amount));
    if (!Number.isFinite(price) || price <= 0) return res.status(400).json({ error: 'Monto inválido.' });
    if (price > config.maxCustomAmountArs) {
      return res.status(400).json({ error: `El monto supera el máximo permitido (${config.maxCustomAmountArs}).` });
    }

    const qty = Math.trunc(Number(quantity ?? 1));
    if (!Number.isFinite(qty) || qty < 1 || qty > 20) return res.status(400).json({ error: 'Cantidad inválida.' });

    // El email es opcional: si no lo pasan, se usa un placeholder y MP lo pide en el checkout.
    const cleanEmail = typeof email === 'string' && EMAIL_RE.test(email) ? email.trim().toLowerCase() : 'sin-email@victoriacitro.net';

    const orderId = crypto.randomUUID();
    const item = { slug: 'custom', title: cleanTitle.slice(0, 200), price, quantity: qty };
    if (description) item.description = String(description).slice(0, 500);

    const order = createOrder({
      id: orderId,
      email: cleanEmail,
      items: [item],
      amount: price * qty,
      currency: config.currency,
    });

    const pref = await createPreference(order);
    setOrderPreference(orderId, pref.id);

    res.json({ orderId, initPoint: pref.initPoint });
  } catch (err) {
    console.error('[checkout/link] error:', err?.message ?? err);
    res.status(400).json({ error: err?.message ?? 'No se pudo crear el link de pago.' });
  }
});

/**
 * Webhook de Mercado Pago. MP avisa que "algo pasó"; NO confiamos en el contenido:
 * consultamos la API para saber el estado real del pago y recién ahí liberamos la descarga.
 */
async function handleWebhook(req, res) {
  // Respondemos 200 rápido; MP reintenta si fallamos.
  res.sendStatus(200);
  try {
    const type = req.query.type ?? req.query.topic ?? req.body?.type;
    const paymentId = req.query['data.id'] ?? req.body?.data?.id ?? req.query.id;
    if (type !== 'payment' || !paymentId) return;

    const payment = await getPayment(paymentId);
    const orderId = payment?.external_reference ?? payment?.metadata?.order_id;
    if (!orderId) return;

    const order = getOrder(orderId);
    if (!order) return;

    if (payment.status === 'approved') {
      markOrderApproved(orderId, { paymentId: payment.id, paymentMethod: payment.payment_type_id });
      console.log(`[webhook] Orden ${orderId} APROBADA (pago ${payment.id}).`);
      await deliverEmailOnce(orderId);
    } else if (payment.status === 'refunded' || payment.status === 'charged_back') {
      setOrderStatus(orderId, 'refunded');
    } else if (['rejected', 'cancelled'].includes(payment.status)) {
      setOrderStatus(orderId, 'rejected');
    }
  } catch (err) {
    console.error('[webhook] error:', err?.message ?? err);
  }
}
app.post('/api/mp/webhook', handleWebhook);
app.get('/api/mp/webhook', handleWebhook);

/**
 * Estado de una orden + links de descarga si está aprobada.
 * La pantalla /gracias consulta esto (con reintentos) hasta que el pago se confirma.
 */
app.get('/api/order/:id', (req, res) => {
  const order = getOrder(req.params.id);
  if (!order) return res.status(404).json({ error: 'Orden inexistente.' });

  const response = {
    status: order.status,
    email: order.email,
    items: order.items.map((i) => ({ slug: i.slug, title: i.title })),
    downloads: [],
  };
  if (order.status === 'approved') {
    // Sólo los ítems digitales (con archivo) generan links de descarga.
    response.downloads = order.items
      .filter((i) => i.file)
      .map((i) => ({
        title: i.title,
        url: `${config.apiUrl}/api/download/${makeDownloadToken(order.id, i.slug)}`,
      }));
    // Respaldo: si el webhook aprobó pero el email no salió, reintentar (no bloquea la respuesta).
    if (!order.email_sent) deliverEmailOnce(order.id);
  }
  res.json(response);
});

/** Descarga protegida: valida el token firmado y re-chequea la orden en la BD. */
app.get('/api/download/:token', (req, res) => {
  const data = verifyDownloadToken(req.params.token);
  if (!data) return res.status(403).send('Link inválido o vencido.');

  const order = getOrder(data.orderId);
  if (!order || order.status !== 'approved') return res.status(403).send('Pago no confirmado.');

  const item = order.items.find((i) => i.slug === data.slug);
  if (!item) return res.status(403).send('Producto no pertenece a esta compra.');

  const product = getProduct(data.slug);
  const fileName = product?.file ?? item.file;
  const filePath = join(config.privateEbooksDir, fileName);
  if (!fileName || !existsSync(filePath)) return res.status(404).send('Archivo no encontrado.');

  const safeName = `${product?.title ?? 'ebook'}.pdf`.replace(/[\\/:*?"<>|]/g, '');
  res.set('Content-Type', 'application/pdf');
  res.set('Content-Length', String(statSync(filePath).size));
  res.set('Content-Disposition', `attachment; filename="${safeName}"`);
  createReadStream(filePath).pipe(res);
});

// Panel de ventas / reporte contable (protegido con usuario y contraseña).
app.get('/admin', basicAuth, salesReportHtml);
app.get('/admin/sales.csv', basicAuth, salesReportCsv);

app.listen(config.port, () => {
  console.log(`✅ Backend de ebooks escuchando en http://localhost:${config.port}`);
  console.log(`   Sitio (back_urls): ${config.siteUrl}`);
  console.log(`   API pública (webhook/descargas): ${config.apiUrl}`);
  console.log(`   PDFs privados: ${config.privateEbooksDir}`);
});
