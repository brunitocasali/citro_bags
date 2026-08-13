import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import crypto from 'node:crypto';
import { config } from './config.mjs';

mkdirSync(dirname(config.dbPath), { recursive: true });

export const db = new Database(config.dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    id             TEXT PRIMARY KEY,          -- external_reference (uuid)
    email          TEXT NOT NULL,
    items_json     TEXT NOT NULL,             -- [{slug,title,file,price}]
    amount         INTEGER NOT NULL,          -- total en la moneda base (entero)
    currency       TEXT NOT NULL DEFAULT 'ARS',
    status         TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected | refunded
    mp_preference_id TEXT,
    mp_payment_id  TEXT,
    payment_method TEXT,
    created_at     TEXT NOT NULL,             -- ISO
    paid_at        TEXT                       -- ISO cuando se aprueba
  );
  CREATE INDEX IF NOT EXISTS idx_orders_created ON orders (created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_orders_status  ON orders (status);
  CREATE INDEX IF NOT EXISTS idx_orders_payment ON orders (mp_payment_id);
`);

// Migraciones incrementales (bases creadas antes de estas columnas). Cada ALTER es idempotente.
const MIGRATIONS = [
  "ALTER TABLE orders ADD COLUMN email_sent INTEGER NOT NULL DEFAULT 0",
  // Meta Pixel / Conversions API: atribución + deduplicación.
  "ALTER TABLE orders ADD COLUMN event_id TEXT",
  "ALTER TABLE orders ADD COLUMN fbp TEXT",
  "ALTER TABLE orders ADD COLUMN fbc TEXT",
  "ALTER TABLE orders ADD COLUMN fbclid TEXT",
  "ALTER TABLE orders ADD COLUMN utm_json TEXT",
  "ALTER TABLE orders ADD COLUMN landing_url TEXT",
  "ALTER TABLE orders ADD COLUMN client_ip TEXT",
  "ALTER TABLE orders ADD COLUMN client_ua TEXT",
  "ALTER TABLE orders ADD COLUMN capi_purchase_sent INTEGER NOT NULL DEFAULT 0",
  // Retrato digital de mascota: cuántos se generaron para esta orden (límite anti-abuso).
  "ALTER TABLE orders ADD COLUMN portrait_count INTEGER NOT NULL DEFAULT 0",
];
for (const sql of MIGRATIONS) {
  try {
    db.exec(sql);
  } catch {
    /* la columna ya existe */
  }
}

const stmts = {
  insert: db.prepare(`
    INSERT INTO orders (
      id, email, items_json, amount, currency, status, mp_preference_id, created_at,
      event_id, fbp, fbc, fbclid, utm_json, landing_url, client_ip, client_ua
    )
    VALUES (
      @id, @email, @items_json, @amount, @currency, 'pending', @mp_preference_id, @created_at,
      @event_id, @fbp, @fbc, @fbclid, @utm_json, @landing_url, @client_ip, @client_ua
    )
  `),
  get: db.prepare('SELECT * FROM orders WHERE id = ?'),
  markApproved: db.prepare(`
    UPDATE orders
    SET status = 'approved', mp_payment_id = @mp_payment_id, payment_method = @payment_method,
        paid_at = COALESCE(paid_at, @paid_at)
    WHERE id = @id
  `),
  setStatus: db.prepare('UPDATE orders SET status = @status WHERE id = @id'),
  markEmailSent: db.prepare('UPDATE orders SET email_sent = 1 WHERE id = @id'),
  markCapiSent: db.prepare('UPDATE orders SET capi_purchase_sent = 1 WHERE id = @id'),
  incPortrait: db.prepare('UPDATE orders SET portrait_count = portrait_count + 1 WHERE id = @id'),
  setPreference: db.prepare('UPDATE orders SET mp_preference_id = @mp_preference_id WHERE id = @id'),
  listBetween: db.prepare(`
    SELECT * FROM orders
    WHERE created_at >= @from AND created_at <= @to
    ORDER BY created_at DESC
  `),
  listAll: db.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT @limit'),
};

export function createOrder({ id, email, items, amount, currency, preferenceId, eventId, tracking }) {
  const tr = tracking ?? {};
  stmts.insert.run({
    id,
    email,
    items_json: JSON.stringify(items),
    amount,
    currency,
    mp_preference_id: preferenceId ?? null,
    created_at: new Date().toISOString(),
    // event_id SIEMPRE presente: se usa para deduplicar el Purchase (navegador + Conversions API).
    event_id: eventId ?? crypto.randomUUID(),
    fbp: tr.fbp ?? null,
    fbc: tr.fbc ?? null,
    fbclid: tr.fbclid ?? null,
    utm_json: tr.utm ? JSON.stringify(tr.utm) : null,
    landing_url: tr.landing_url ?? null,
    client_ip: tr.client_ip ?? null,
    client_ua: tr.client_ua ?? null,
  });
  return getOrder(id);
}

export function getOrder(id) {
  const row = stmts.get.get(id);
  if (!row) return null;
  return { ...row, items: JSON.parse(row.items_json) };
}

export function setOrderPreference(id, preferenceId) {
  stmts.setPreference.run({ id, mp_preference_id: preferenceId });
}

export function markOrderApproved(id, { paymentId, paymentMethod }) {
  stmts.markApproved.run({
    id,
    mp_payment_id: String(paymentId),
    payment_method: paymentMethod ?? null,
    paid_at: new Date().toISOString(),
  });
}

export function setOrderStatus(id, status) {
  stmts.setStatus.run({ id, status });
}

export function markOrderEmailSent(id) {
  stmts.markEmailSent.run({ id });
}

/** Marca que ya se envió el Purchase a Conversions API (evita duplicados en reintentos del webhook). */
export function markOrderCapiPurchaseSent(id) {
  stmts.markCapiSent.run({ id });
}

/** Suma 1 al contador de retratos generados para una orden (límite anti-abuso). */
export function incrementPortraitCount(id) {
  stmts.incPortrait.run({ id });
}

export function listOrders({ from, to } = {}) {
  if (from && to) return stmts.listBetween.all({ from, to }).map(withItems);
  return stmts.listAll.all({ limit: 1000 }).map(withItems);
}

function withItems(row) {
  return { ...row, items: JSON.parse(row.items_json) };
}
