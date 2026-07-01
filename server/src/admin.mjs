import { config } from './config.mjs';
import { listOrders } from './db.mjs';

/** Middleware de autenticación básica para el panel de reportes. */
export function basicAuth(req, res, next) {
  const header = req.headers.authorization ?? '';
  const [scheme, encoded] = header.split(' ');
  if (scheme === 'Basic' && encoded) {
    const [user, pass] = Buffer.from(encoded, 'base64').toString('utf-8').split(':');
    if (user === config.adminUser && pass === config.adminPass) return next();
  }
  res.set('WWW-Authenticate', 'Basic realm="Reporte de ventas"');
  return res.status(401).send('Autenticación requerida');
}

function money(cents, currency) {
  return `${currency} ${Number(cents).toLocaleString('es-AR')}`;
}

/** Reporte contable en HTML. */
export function salesReportHtml(req, res) {
  const { from, to } = req.query;
  const orders = listOrders(from && to ? { from, to } : {});
  const approved = orders.filter((o) => o.status === 'approved');
  const totalApproved = approved.reduce((s, o) => s + o.amount, 0);

  const rows = orders
    .map(
      (o) => `
      <tr class="st-${o.status}">
        <td>${new Date(o.created_at).toLocaleString('es-AR')}</td>
        <td>${o.id.slice(0, 8)}</td>
        <td>${escapeHtml(o.email)}</td>
        <td>${o.items.map((i) => escapeHtml(i.title)).join('<br>')}</td>
        <td style="text-align:right">${money(o.amount, o.currency)}</td>
        <td>${o.status}</td>
        <td>${o.payment_method ?? ''}</td>
        <td>${o.mp_payment_id ?? ''}</td>
      </tr>`
    )
    .join('');

  res.send(`<!doctype html><html lang="es"><head><meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Reporte de ventas · Victoria Citro</title>
  <style>
    body{font-family:system-ui,sans-serif;margin:2rem;color:#3d342d}
    h1{font-weight:600}
    .summary{display:flex;gap:2rem;margin:1rem 0 1.5rem}
    .card{background:#f5f1e9;border-radius:12px;padding:1rem 1.5rem}
    .card b{display:block;font-size:1.6rem}
    table{border-collapse:collapse;width:100%;font-size:.9rem}
    th,td{border:1px solid #ddd;padding:.5rem .6rem;text-align:left;vertical-align:top}
    th{background:#a68b67;color:#fff}
    .st-pending{opacity:.55}
    .st-refunded{background:#fdecec}
    a.btn{display:inline-block;margin:.5rem 0;padding:.5rem 1rem;background:#a68b67;color:#fff;border-radius:8px;text-decoration:none}
    form{margin:.5rem 0 1rem}
  </style></head><body>
  <h1>Reporte de ventas</h1>
  <form method="get">
    Desde <input type="date" name="from" value="${(from ?? '').toString().slice(0, 10)}">
    Hasta <input type="date" name="to" value="${(to ?? '').toString().slice(0, 10)}">
    <button>Filtrar</button>
  </form>
  <div class="summary">
    <div class="card"><span>Ventas aprobadas</span><b>${approved.length}</b></div>
    <div class="card"><span>Total facturado</span><b>${money(totalApproved, config.currency)}</b></div>
    <div class="card"><span>Órdenes totales</span><b>${orders.length}</b></div>
  </div>
  <a class="btn" href="/admin/sales.csv${from && to ? `?from=${from}&to=${to}` : ''}">⬇ Exportar CSV (contador)</a>
  <table>
    <thead><tr><th>Fecha</th><th>Orden</th><th>Email</th><th>Productos</th><th>Monto</th><th>Estado</th><th>Medio</th><th>Pago MP</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="8">Sin ventas todavía.</td></tr>'}</tbody>
  </table>
  </body></html>`);
}

/** Exporta las ventas a CSV (separador ; para Excel en español). */
export function salesReportCsv(req, res) {
  const { from, to } = req.query;
  const orders = listOrders(from && to ? { from, to } : {});
  const header = ['Fecha', 'Orden', 'Email', 'Productos', 'Monto', 'Moneda', 'Estado', 'Medio de pago', 'ID pago MP'];
  const lines = [header.join(';')];
  for (const o of orders) {
    lines.push(
      [
        new Date(o.created_at).toLocaleString('es-AR'),
        o.id,
        o.email,
        o.items.map((i) => i.title).join(' | '),
        o.amount,
        o.currency,
        o.status,
        o.payment_method ?? '',
        o.mp_payment_id ?? '',
      ]
        .map(csvCell)
        .join(';')
    );
  }
  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.set('Content-Disposition', `attachment; filename="ventas-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send('\uFEFF' + lines.join('\r\n')); // BOM para acentos en Excel
}

function csvCell(v) {
  const s = String(v ?? '');
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
