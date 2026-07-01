/**
 * Catálogo de ebooks (fuente única de verdad para la landing, el carrito y el backend).
 *
 * ✏️  EDITÁ LOS PRECIOS EN `ebookProducts.json` (mismo directorio).
 *     Ese JSON lo leen TANTO la web como el servidor de pagos, así no se
 *     duplican los precios.
 *
 * Modelo de venta (igual al de Impultienda):
 *   - kind "main"  → el ebook principal (lo que se cobra: `priceArs`).
 *   - kind "bonus" → se ENTREGA GRATIS junto al principal (precio 0; `regularPriceArs`
 *                    solo se usa para mostrar el "valor" tachado).
 *   - kind "upsell"→ complemento opcional con descuento (se cobra `upsellPriceArs`,
 *                    `regularPriceArs` es el precio tachado).
 *
 * ⚠️  Los archivos `file` viven en `private-ebooks/` (FUERA del sitio público).
 *     El backend los entrega solo tras confirmar el pago.
 */
import catalog from './ebookProducts.json';

export type EbookKind = 'main' | 'bonus' | 'upsell';

export interface EbookProduct {
  slug: string;
  title: string;
  description: string;
  /** Nombre del PDF dentro de private-ebooks/ */
  file: string;
  /** Miniatura pública (mockup) para mostrar en la web. */
  cover: string;
  kind: EbookKind;
  /** Precio que se cobra por el principal. null en bonus/upsell. */
  priceArs: number | null;
  /** Precio "regular" para mostrar tachado. */
  regularPriceArs: number | null;
  /** Precio con descuento del complemento (kind upsell). */
  upsellPriceArs: number | null;
  available: boolean;
}

export const ebookProducts: EbookProduct[] = catalog as EbookProduct[];

export const MAIN_EBOOK_SLUG = 'angeles-alas';

export function getMainEbook(): EbookProduct {
  return ebookProducts.find((p) => p.kind === 'main') ?? ebookProducts[0];
}

/** Bonos incluidos gratis con el principal. */
export function getBonuses(): EbookProduct[] {
  return ebookProducts.filter((p) => p.kind === 'bonus' && p.available);
}

/** Complementos opcionales (order bumps) con precio con descuento definido. */
export function getUpsells(): EbookProduct[] {
  return ebookProducts.filter((p) => p.kind === 'upsell' && p.available && p.upsellPriceArs != null);
}

export function getProduct(slug: string): EbookProduct | undefined {
  return ebookProducts.find((p) => p.slug === slug);
}

/** Formatea un precio ARS como se muestra en la página. Ej: 16990 → '$16.990' */
export function formatArs(value: number): string {
  return '$' + value.toLocaleString('es-AR');
}
