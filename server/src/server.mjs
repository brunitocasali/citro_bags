import express from 'express';
import crypto from 'node:crypto';
import { existsSync, statSync, createReadStream } from 'node:fs';
import { join } from 'node:path';
import { config } from './config.mjs';
import { priceItems, getProduct } from './catalog.mjs';
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
import { sendDownloadEmail } from './mail.mjs';
import { basicAuth, salesReportHtml, salesReportCsv } from './admin.mjs';

/** Envía el email de descarga una sola vez por orden. No rompe el flujo si falla. */
async function deliverEmailOnce(orderId) {
  const order = getOrder(orderId);
  if (!order || order.status !== 'approved' || order.email_sent) return;
  try {
    const sent = await sendDownloadEmail(order);
    if (sent) {
      markOrderEmailSent(orderId);
      console.log(`[mail] Email de descarga enviado a ${order.email} (orden ${orderId}).`);
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
    response.downloads = order.items.map((i) => ({
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
