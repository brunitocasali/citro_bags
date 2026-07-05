import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { config } from './config.mjs';

const client = new MercadoPagoConfig({ accessToken: config.mpAccessToken });
const preferenceApi = new Preference(client);
const paymentApi = new Payment(client);

/**
 * Crea una preferencia de Checkout Pro para una orden.
 * @returns {Promise<{ id: string, initPoint: string }>}
 */
export async function createPreference(order) {
  const backUrl = `${config.siteUrl}/gracias?order=${order.id}`;
  // Mercado Pago rechaza auto_return con URLs localhost. Solo lo activamos con dominio público.
  const isPublic = /^https:\/\//.test(config.siteUrl) && !/localhost|127\.0\.0\.1/.test(config.siteUrl);

  const body = {
    items: order.items.map((i) => ({
      id: i.slug,
      title: i.title,
      quantity: i.quantity ?? 1,
      unit_price: i.price,
      currency_id: config.currency,
    })),
    payer: { email: order.email },
    external_reference: order.id,
    back_urls: { success: backUrl, failure: backUrl, pending: backUrl },
    statement_descriptor: 'VICTORIACITRO',
    metadata: { order_id: order.id },
  };
  if (isPublic) {
    body.auto_return = 'approved';
    body.notification_url = `${config.apiUrl}/api/mp/webhook`;
  }

  const res = await preferenceApi.create({ body });
  return { id: res.id, initPoint: res.init_point };
}

/** Consulta el estado real de un pago en la API de MP (fuente autoritativa). */
export async function getPayment(paymentId) {
  return paymentApi.get({ id: paymentId });
}
