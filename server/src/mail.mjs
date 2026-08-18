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

/**
 * Envía el email de confirmación de un pedido FÍSICO (sin descarga): kits, productos
 * sueltos, etc. Confirma el pago y avisa que se coordina el envío por WhatsApp.
 *
 * @returns {Promise<boolean>} true si se envió (o si no hay que enviar).
 */
export async function sendOrderConfirmationEmail(order) {
  if (!config.resendApiKey) {
    console.warn('[mail] RESEND_API_KEY no configurada: se omite el email de confirmación.');
    return false;
  }

  const html = buildConfirmationHtml(order);
  const text = buildConfirmationText(order);

  const body = {
    from: config.mailFrom,
    to: [order.email],
    subject: `¡Recibimos tu pago! 💛 — ${config.brandName}`,
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

function buildConfirmationHtml(order) {
  const rows = order.items
    .map(
      (i) => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #eee;color:#4a3728;font-size:15px;">
          <strong>${escapeHtml(i.title)}</strong>${i.quantity && i.quantity > 1 ? ` × ${i.quantity}` : ''}
        </td>
      </tr>`
    )
    .join('');

  return `<!doctype html>
<html lang="es"><body style="margin:0;background:#f7f1e8;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#4a3728;">
  <div style="max-width:560px;margin:0 auto;padding:24px;">
    <div style="text-align:center;padding:8px 0 20px;">
      <div style="font-family:Georgia,serif;font-size:22px;color:#4a3728;">${escapeHtml(config.brandName)}</div>
    </div>
    <div style="background:#fff;border-radius:16px;padding:28px;box-shadow:0 8px 24px rgba(61,52,45,.08);">
      <h1 style="font-family:Georgia,serif;font-weight:500;font-size:22px;margin:0 0 6px;">¡Gracias por tu compra! 💛</h1>
      <p style="color:#7a6a58;font-size:14px;line-height:1.5;margin:0 0 20px;">
        Recibimos tu pago. En breve nos comunicamos con vos para coordinar los detalles y el envío de tu pedido.
      </p>
      <table style="width:100%;border-collapse:collapse;">${rows}</table>
      <p style="color:#9a8a78;font-size:12px;line-height:1.5;margin:22px 0 0;">
        Si tenés cualquier consulta, respondé a este email y te ayudamos.
      </p>
    </div>
    <p style="text-align:center;color:#b0a290;font-size:11px;margin:18px 0 0;">
      Orden ${escapeHtml(order.id)} · Pago seguro con Mercado Pago
    </p>
  </div>
</body></html>`;
}

function buildConfirmationText(order) {
  const lines = order.items.map((i) => `• ${i.title}${i.quantity && i.quantity > 1 ? ` × ${i.quantity}` : ''}`).join('\n');
  return [
    `¡Gracias por tu compra! Recibimos tu pago.`,
    ``,
    `Tu pedido:`,
    lines,
    ``,
    `En breve nos comunicamos para coordinar los detalles y el envío.`,
    `Orden ${order.id} — ${config.brandName}`,
  ].join('\n');
}

/** Email postcompra: entrega + venta del resto del trabajo de Victoria. Mobile-first, botones HTML reales. */
function buildHtml(order, links) {
  const site = config.siteUrl;
  const img = (f) => `${site}/email/${f}`;
  const gracias = `${site}/gracias?order=${order.id}`;
  const IG = 'https://www.instagram.com/victoria.citro/';
  const WEB = 'https://victoriacitro.net/';
  const hasRetrato = order.items.some((i) => i.slug === 'retrato-mascota');

  const main = links[0];
  const bonus = links.slice(1);
  const bonusHtml = bonus.length
    ? `<p style="font-size:13px;color:#7a6a58;line-height:1.9;margin:10px 0 0;text-align:center;">Todo lo incluido: ${bonus
        .map((l) => `<a href="${l.url}" style="color:#a68b67;text-decoration:underline;">${escapeHtml(l.title)}</a>`)
        .join(' · ')}</p>`
    : '';

  const btn = (text, url, bg = '#a68b67', color = '#fff') =>
    `<a href="${url}" style="display:block;background:${bg};color:${color};text-decoration:none;padding:14px 20px;border-radius:999px;font-size:16px;font-weight:700;text-align:center;margin:0 auto 10px;max-width:340px;">${text}</a>`;

  const secImg = (f, alt) =>
    `<img src="${img(f)}" alt="${escapeHtml(alt)}" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0;border-radius:14px;margin:0 auto;" />`;

  const H = (t) =>
    `<h2 style="font-family:Georgia,serif;font-weight:500;font-size:22px;color:#4a3728;text-align:center;margin:0 0 6px;line-height:1.25;">${t}</h2>`;
  const P = (t) => `<p style="color:#7a6a58;font-size:15px;line-height:1.55;text-align:center;margin:0 0 16px;">${t}</p>`;
  const gap = `<div style="height:34px;line-height:34px;">&nbsp;</div>`;

  return `<!doctype html>
<html lang="es"><body style="margin:0;background:#fbf7f0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#4a3728;">
  <div style="max-width:600px;margin:0 auto;padding:22px 18px 40px;">

    <!-- 1) ENTREGA -->
    <div style="text-align:center;padding:6px 0 14px;">
      <div style="font-family:Georgia,serif;font-size:22px;color:#4a3728;">${escapeHtml(config.brandName)}</div>
      <div style="font-size:11px;letter-spacing:3px;color:#a68b67;text-transform:uppercase;">Arte &amp; duelo</div>
    </div>
    ${H('¡Gracias por tu compra! 💛')}
    ${P('Tu ebook y tu retrato digital ya están listos.')}
    ${secImg('01_portada_ebook.jpg', 'Cuando a los ángeles les devuelven las alas')}
    <div style="height:18px;"></div>
    ${btn('⬇ Descargar mi ebook', main.url)}
    ${hasRetrato ? btn('⬇ Descargar retrato digital', gracias) : ''}
    ${bonusHtml}

    <!-- 10% OFF -->
    <div style="margin:22px auto 0;max-width:360px;border:1px dashed #c8a24e;border-radius:16px;padding:18px;text-align:center;background:#fffdf7;">
      <div style="font-family:Georgia,serif;font-size:26px;color:#a9812f;">10% OFF</div>
      <div style="font-size:13px;color:#7a6a58;margin:2px 0 10px;">en cualquier producto personalizado · Código:</div>
      <div style="font-size:20px;font-weight:800;letter-spacing:2px;color:#4a3728;margin-bottom:14px;">VICTORIA10</div>
      ${btn('Usar mi 10% OFF', IG, '#c8a24e')}
    </div>
    ${gap}

    <!-- 2) TU RETRATO PUEDE ESTAMPARSE -->
    ${H('Tu retrato también puede estamparse')}
    ${P('Usá tu cupón <b>VICTORIA10</b> y elegí tu producto favorito.')}
    ${secImg('03_estampable.jpg', 'Tu retrato en bolso, taza y cuadro')}
    <div style="height:16px;"></div>
    ${btn('Ver productos', IG, '#a68b67')}
    ${gap}

    <!-- 3) KITS -->
    ${H('Kits personalizados')}
    ${P('Ideales para honrar su memoria o celebrar su vida. Siempre disponibles.')}
    ${secImg('04_kits.jpg', 'Kits personalizados de Victoria Citro')}
    <div style="height:16px;"></div>
    ${btn('Ver kits', IG, '#a68b67')}
    ${gap}

    <!-- 4) CLIENTES FELICES -->
    ${H('Clientes felices')}
    ${P('Pedidos reales, entregados a clientes reales.')}
    ${secImg('05_clientes.jpg', 'Clientes felices con sus productos')}
    ${gap}

    <!-- 5) BOLSOS PINTADOS A MANO -->
    ${H('Ediciones de lujo · Carteras pintadas a mano')}
    ${P('Piezas únicas, pintadas a mano una por una. Encargos sujetos a disponibilidad.')}
    ${secImg('06_bolsos.jpg', 'Carteras pintadas a mano')}
    <div style="height:16px;"></div>
    ${btn('Consultar un encargo', IG, '#4a3728')}
    ${gap}

    <!-- 6) CUADROS PINTADOS A MANO -->
    ${H('Cuadros pintados a mano')}
    ${P('Obras originales, grandes y personales. A pedido, sujetas a disponibilidad.')}
    ${secImg('07_cuadros.jpg', 'Cuadros pintados a mano')}
    <div style="height:16px;"></div>
    ${btn('Consultar una obra', IG, '#4a3728')}
    ${gap}

    <!-- 7) CONOCÉ A LA AUTORA -->
    ${H('Conocé a la autora')}
    ${P('Soy Victoria Citro. Creo arte personalizado para honrar, celebrar y recordar a nuestras mascotas.')}
    ${secImg('08_autora.jpg', 'Victoria Citro, artista')}
    <div style="height:16px;"></div>
    ${btn('Seguir en Instagram', IG, '#a68b67')}
    ${btn('Visitar la web', WEB, '#fbf7f0', '#4a3728')}

    <p style="text-align:center;color:#b0a290;font-size:11px;margin:26px 0 0;line-height:1.6;">
      ${escapeHtml(config.brandName)} · @victoria.citro · victoriacitro.net<br/>
      Orden ${escapeHtml(order.id)} · Pago seguro con Mercado Pago<br/>
      Guardá este email por si querés volver a descargar tu material.
    </p>
  </div>
</body></html>`;
}

function buildText(order, links) {
  const lines = links.map((l) => `• ${l.title}: ${l.url}`).join('\n');
  const hasRetrato = order.items.some((i) => i.slug === 'retrato-mascota');
  return [
    `¡Gracias por tu compra! Tu pago fue confirmado.`,
    ``,
    `Descargá tu material:`,
    lines,
    hasRetrato ? `• Tu retrato digital: ${config.siteUrl}/gracias?order=${order.id}` : '',
    ``,
    `10% OFF en productos personalizados con el código VICTORIA10.`,
    `Conocé más: Instagram @victoria.citro · victoriacitro.net`,
    ``,
    `Guardá este email por si querés volver a descargar más adelante.`,
    `Orden ${order.id} — ${config.brandName}`,
  ]
    .filter((l) => l !== '')
    .join('\n');
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
