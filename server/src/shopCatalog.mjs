import { readFileSync } from 'node:fs';
import { config } from './config.mjs';

/**
 * Catálogo de productos NO-ebook (bolsos, kits, productos sueltos, etc.).
 * Fuente única de verdad: `src/data/shopProducts.json` (lo puede editar la web y el server).
 *
 * A diferencia de los ebooks, estos productos son FÍSICOS (no tienen `file` ni descarga):
 * el pago sólo registra la orden y dispara la coordinación del envío.
 */
export function loadShopCatalog() {
  return JSON.parse(readFileSync(config.shopCatalogPath, 'utf-8'));
}

export function getShopProduct(id) {
  return loadShopCatalog().find((p) => p.id === id);
}

/**
 * Valida un pedido de productos del catálogo genérico contra el JSON del sitio.
 * NUNCA confía en el precio que manda el cliente: siempre usa el del catálogo.
 *
 * @param {Array<{id: string, quantity?: number}>} requestedItems
 * @returns {{ items: Array<{slug, title, price, quantity}>, total: number }}
 */
export function priceShopItems(requestedItems) {
  if (!Array.isArray(requestedItems) || requestedItems.length === 0) {
    throw new Error('Sin productos.');
  }

  const catalog = loadShopCatalog();
  const items = [];

  for (const requested of requestedItems) {
    const id = String(requested?.id ?? '').trim();
    if (!id) throw new Error('Producto sin identificador.');

    const product = catalog.find((p) => p.id === id);
    if (!product) throw new Error(`Producto inexistente: ${id}`);
    if (!product.available) throw new Error(`Producto no disponible: ${id}`);
    if (product.priceArs == null || !Number.isFinite(product.priceArs) || product.priceArs <= 0) {
      throw new Error(`El producto "${id}" no tiene precio definido para pago directo.`);
    }

    const quantity = Math.trunc(Number(requested?.quantity ?? 1));
    if (!Number.isFinite(quantity) || quantity < 1 || quantity > 20) {
      throw new Error(`Cantidad inválida para "${id}" (permitido 1 a 20).`);
    }

    items.push({
      slug: product.id,
      title: product.title,
      price: product.priceArs,
      quantity,
    });
  }

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  return { items, total };
}
