/**
 * Configuración editable de la landing /ebooks.
 *
 * ✏️  El PRECIO del ebook principal se define en `ebookProducts.ts` (catálogo).
 *     Acá se edita el resto de textos y el enlace de compra.
 *     Después ejecutá `npm run build` (o `npm run dev`) y los cambios se
 *     reflejan en toda la página automáticamente.
 *
 * Los valores se insertan donde en `ebooks/index.html` aparezcan los tokens:
 *   {{price}}       → price (viene del catálogo)
 *   {{priceNote}}   → priceNote
 *   {{guarantee}}   → guarantee
 *   {{checkoutUrl}} → checkoutUrl
 */
import { getMainEbook, formatArs } from './ebookProducts';

export interface EbookLandingConfig {
  /** Precio mostrado al cliente. Ej: '$16.990' */
  price: string;
  /** Texto corto al lado del precio. Ej: 'Acceso inmediato' */
  priceNote: string;
  /** Texto de garantía. Ej: 'Garantía de 7 días' */
  guarantee: string;
  /** A dónde llevan todos los botones de compra. */
  checkoutUrl: string;
}

const mainEbook = getMainEbook();

export const ebookLanding: EbookLandingConfig = {
  price: mainEbook.priceArs != null ? formatArs(mainEbook.priceArs) : '$16.990',
  priceNote: 'Acceso inmediato',
  guarantee: 'Garantía de 7 días',
  checkoutUrl: '/comprar',
};

/** Reemplaza los tokens {{clave}} en el HTML por los valores de la config. */
export function applyLandingVars(html: string, config: EbookLandingConfig = ebookLanding): string {
  return html.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) => {
    const value = (config as Record<string, unknown>)[key];
    return typeof value === 'string' ? value : match;
  });
}
