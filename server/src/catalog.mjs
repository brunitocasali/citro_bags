import { readFileSync } from 'node:fs';
import { config } from './config.mjs';

/** Lee el catálogo compartido (mismo JSON que usa la web). */
export function loadCatalog() {
  return JSON.parse(readFileSync(config.catalogPath, 'utf-8'));
}

export function getProduct(slug) {
  return loadCatalog().find((p) => p.slug === slug);
}

/**
 * Valida el pedido contra el catálogo (NUNCA confiar en precios del cliente) y arma la orden.
 *
 * Reglas (modelo combo):
 *  - Siempre debe incluir el ebook principal.
 *  - El principal cobra `priceArs`.
 *  - Cada upsell seleccionado cobra `upsellPriceArs`.
 *  - Los bonos se ENTREGAN gratis junto al principal (precio 0).
 *
 * @param {string[]} slugs
 * @returns {{ items: Array<{slug,title,file,price}>, total: number }}
 *          `items` = todo lo que se ENTREGA (principal + bonos + upsells).
 *          `total` = lo que se COBRA.
 */
export function priceItems(slugs) {
  const catalog = loadCatalog();
  const main = catalog.find((p) => p.kind === 'main');
  if (!main) throw new Error('No hay ebook principal configurado.');
  if (!slugs.includes(main.slug)) throw new Error('El pedido debe incluir el ebook principal.');

  const items = [];

  // Principal (se cobra)
  if (main.priceArs == null) throw new Error('El ebook principal no tiene precio.');
  items.push({ slug: main.slug, title: main.title, file: main.file, price: main.priceArs });

  // Upsells seleccionados (se cobran con descuento)
  for (const slug of slugs) {
    if (slug === main.slug) continue;
    const p = catalog.find((x) => x.slug === slug);
    if (!p) throw new Error(`Producto inexistente: ${slug}`);
    if (p.kind !== 'upsell' || !p.available || p.upsellPriceArs == null) {
      throw new Error(`Producto no disponible como complemento: ${slug}`);
    }
    items.push({ slug: p.slug, title: p.title, file: p.file, price: p.upsellPriceArs });
  }

  const total = items.reduce((sum, i) => sum + i.price, 0);

  // Bonos: se entregan gratis junto al principal (no suman al total).
  for (const b of catalog.filter((p) => p.kind === 'bonus' && p.available)) {
    if (!items.some((i) => i.slug === b.slug)) {
      items.push({ slug: b.slug, title: b.title, file: b.file, price: 0 });
    }
  }

  return { items, total };
}
