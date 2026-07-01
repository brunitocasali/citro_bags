import { config } from './config.mjs';
import { makeDownloadToken } from './tokens.mjs';

/**
 * Envía el email de confirmación con los links de descarga.
 * Usa la API HTTP de Resend (sin dependencias: fetch nativo de Node 18+).
 *
 * Los links van con TTL largo (config.emailDownloadTtlHours) porque el mail
 * se abre más tarde; igual, al descargar se re-verifica que la orden esté aprobada.
 *
 * @returns {Promise<boolean>} true si se envió (o si no hay que enviar).
 */
export async function sendDownloadEmail(order) {
  if (!config.resendApiKey) {
    console.warn('[mail] RESEND_API_KEY no configurada: se omite el email (la descarga en pantalla sigue OK).');
    return false;
  }

  const links = order.items.map((i) => ({
    title: i.title,
    url: `${config.apiUrl}/api/download/${makeDownloadToken(order.id, i.slug, config.emailDownloadTtlHours)}`,
  }));

  const html = buildHtml(order, links);
  const text = buildText(order, links);

  const body = {
    from: config.mailFrom,
    to: [order.email],
    subject: `Tu compra está lista 💛 — ${config.brandName}`,
    html,
    text,
  };
  if (config.mailReplyTo) body.reply_to = config.mailReplyTo;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Resend respondió ${res.status}: ${detail}`);
  }
  return true;
}

function buildHtml(order, links) {
  const items = links
    .map(
      (l) => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #eee;">
          <strong style="color:#4a3728;font-size:15px;">${escapeHtml(l.title)}</strong>
        </td>
        <td style="padding:12px 0;border-bottom:1px solid #eee;text-align:right;">
          <a href="${l.url}" style="background:#a68b67;color:#fff;text-decoration:none;padding:9px 16px;border-radius:8px;font-size:14px;font-weight:600;display:inline-block;">Descargar</a>
        </td>
      </tr>`
    )
    .join('');

  return `<!doctype html>
<html lang="es"><body style="margin:0;background:#f7f1e8;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#4a3728;">
  <div style="max-width:560px;margin:0 auto;padding:24px;">
    <div style="text-align:center;padding:8px 0 20px;">
      <div style="font-family:Georgia,serif;font-size:22px;color:#4a3728;">${escapeHtml(config.brandName)}</div>
      <div style="font-size:12px;letter-spacing:2px;color:#a68b67;text-transform:uppercase;">Arte &amp; duelo</div>
    </div>
    <div style="background:#fff;border-radius:16px;padding:28px;box-shadow:0 8px 24px rgba(61,52,45,.08);">
      <h1 style="font-family:Georgia,serif;font-weight:500;font-size:22px;margin:0 0 6px;">¡Gracias por tu compra! 💛</h1>
      <p style="color:#7a6a58;font-size:14px;line-height:1.5;margin:0 0 20px;">
        Tu pago fue confirmado. Acá tenés el acceso a todo lo que compraste. Podés descargarlo desde cualquier dispositivo.
      </p>
      <table style="width:100%;border-collapse:collapse;">${items}</table>
      <p style="color:#9a8a78;font-size:12px;line-height:1.5;margin:22px 0 0;">
        Guardá este email por si querés volver a descargar más adelante. Si tenés cualquier problema, respondé a este mensaje y te ayudamos.
      </p>
    </div>
    <p style="text-align:center;color:#b0a290;font-size:11px;margin:18px 0 0;">
      Orden ${escapeHtml(order.id)} · Pago seguro con Mercado Pago
    </p>
  </div>
</body></html>`;
}

function buildText(order, links) {
  const lines = links.map((l) => `• ${l.title}: ${l.url}`).join('\n');
  return [
    `¡Gracias por tu compra! Tu pago fue confirmado.`,
    ``,
    `Descargá tu material:`,
    lines,
    ``,
    `Guardá este email por si querés volver a descargar más adelante.`,
    `Orden ${order.id} — ${config.brandName}`,
  ].join('\n');
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
