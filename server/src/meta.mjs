import crypto from 'node:crypto';
import { config } from './config.mjs';

/** SHA-256 en minúsculas y sin espacios (formato que pide Meta para datos de usuario). */
function hash(value) {
  return crypto.createHash('sha256').update(String(value).trim().toLowerCase()).digest('hex');
}

/**
 * Envía el evento Purchase a la Conversions API de Meta (server-side).
 * Se dispara SOLO cuando Mercado Pago confirma el pago como `approved`.
 * Usa `order.event_id` (el mismo que dispara el navegador en /gracias) para que Meta deduplique.
 *
 * @returns {Promise<boolean>} true si Meta aceptó el evento.
 */
export async function sendPurchaseEvent(order) {
  if (!config.metaCapiToken || !config.metaPixelId) {
    console.warn('[meta] Falta META_CAPI_TOKEN o META_PIXEL_ID; se omite el Purchase de Conversions API.');
    return false;
  }
  if (!order?.event_id) {
    console.warn(`[meta] Orden ${order?.id} sin event_id; no se envía Purchase (no habría deduplicación).`);
    return false;
  }

  const url = `https://graph.facebook.com/${config.metaApiVersion}/${config.metaPixelId}/events?access_token=${encodeURIComponent(
    config.metaCapiToken
  )}`;

  const eventTime = order.paid_at
    ? Math.floor(new Date(order.paid_at).getTime() / 1000)
    : Math.floor(Date.now() / 1000);

  let utm = {};
  try {
    utm = order.utm_json ? JSON.parse(order.utm_json) : {};
  } catch {
    utm = {};
  }

  const userData = { em: [hash(order.email)] };
  if (order.fbp) userData.fbp = order.fbp;
  if (order.fbc) userData.fbc = order.fbc;
  if (order.client_ip) userData.client_ip_address = order.client_ip;
  if (order.client_ua) userData.client_user_agent = order.client_ua;

  const customData = {
    currency: order.currency || 'ARS',
    value: Number(order.amount), // importe REAL pagado (incluye order bumps)
    content_type: 'product',
    content_ids: order.items.map((i) => i.slug),
    contents: order.items.map((i) => ({ id: i.slug, quantity: i.quantity ?? 1, item_price: i.price })),
    order_id: order.id,
    ...utm,
  };

  const body = {
    data: [
      {
        event_name: 'Purchase',
        event_time: eventTime,
        event_id: order.event_id,
        event_source_url: order.landing_url || `${config.siteUrl}/gracias?order=${order.id}`,
        action_source: 'website',
        user_data: userData,
        custom_data: customData,
      },
    ],
  };
  if (config.metaTestEventCode) body.test_event_code = config.metaTestEventCode;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('[meta] Conversions API rechazó el evento:', res.status, JSON.stringify(json));
      return false;
    }
    console.log(
      `[meta] Purchase enviado (orden ${order.id}, event_id ${order.event_id}, recibidos: ${json.events_received ?? '?'}).`
    );
    return true;
  } catch (err) {
    console.error('[meta] Error de red al enviar Purchase:', err?.message ?? err);
    return false;
  }
}
