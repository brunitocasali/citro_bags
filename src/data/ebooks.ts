/**
 * Catálogo y fichas de ebooks.
 * Para sumar otro: añadí un ítem en `ebooksCatalog` y un bloque en `ebookDetailsBySlug`.
 */

export type EbookStatus = 'published' | 'coming_soon';

export interface EbookCatalogItem {
  slug: string;
  /** Título corto en la tarjeta */
  title: string;
  subtitle: string;
  description: string;
  badge: string;
  status: EbookStatus;
  /** Imagen opcional para la tarjeta / hero */
  coverImage?: string;
}

export interface EbookDetail {
  metaTitle: string;
  metaDescription: string;
  hero: {
    eyebrow: string;
    title: string;
    subtitle: string;
    ctaPrimary: string;
    ctaSecondary: string;
    whatsappHref: string;
  };
  bullets: string[];
  chapters: { title: string; text: string }[];
  trust: {
    title: string;
    lines: string[];
  };
  lead: {
    title: string;
    hint: string;
    submitLabel: string;
    note: string;
  };
}

/** Listado público (orden = orden en la página índice). */
export const ebooksCatalog: EbookCatalogItem[] = [
  {
    slug: 'arte-bolsos-lujo',
    title: 'El arte de llevar una historia pintada a mano',
    subtitle: 'Guía breve — bolsos de autor',
    description:
      'Qué hace único un bolso pintado a mano, ideas para inspirarte y cómo es el proceso desde el primer mensaje hasta la entrega.',
    badge: 'Gratis',
    status: 'published',
    coverImage: '/images/Portada_Bag_.jpg',
  },
  // Ejemplo futuro (no genera ruta hasta status: 'published'):
  // {
  //   slug: 'coleccion-2026',
  //   title: 'Nueva guía',
  //   subtitle: 'Próximamente',
  //   description: '…',
  //   badge: 'Pronto',
  //   status: 'coming_soon',
  // },
];

export const ebookDetailsBySlug: Record<string, EbookDetail> = {
  'arte-bolsos-lujo': {
    metaTitle: 'Ebook gratuito | El arte de llevar una historia pintada a mano',
    metaDescription:
      'Guía breve para entender qué hace único un bolso de autor, cómo encargar el tuyo y qué esperar del proceso creativo.',
    hero: {
      eyebrow: 'Recurso gratuito',
      title: 'El arte de llevar una historia pintada a mano',
      subtitle:
        'Una guía breve para entender qué hace único un bolso de autor, cómo encargar el tuyo y qué esperar del proceso creativo.',
      ctaPrimary: 'Quiero el ebook',
      ctaSecondary: 'Hablar por WhatsApp',
      whatsappHref: 'https://wa.me/5493517417645?text=Hola%2C%20quiero%20el%20ebook%20gratuito.',
    },
    bullets: [
      'Qué diferencia un bolso pintado a mano de una pieza seriada.',
      'Ideas para inspirarte en colores, mascotas y estilo personal.',
      'Cómo es el proceso desde el primer mensaje hasta la entrega.',
    ],
    chapters: [
      { title: 'Origen y visión', text: 'Cómo nace cada pieza y qué busca Victoria en cada encargo.' },
      { title: 'Materiales y lujo', text: 'Detalles que importan cuando hablamos de calidad duradera.' },
      { title: 'Tu bolso, tu historia', text: 'Cómo traducir emociones y recuerdos en un diseño único.' },
    ],
    trust: {
      title: 'Por qué confiar',
      lines: [
        'Arte exhibido internacionalmente.',
        'Enfoque en vínculo humano y mascotas.',
        'Proceso claro y comunicación directa.',
      ],
    },
    lead: {
      title: 'Dejá tu email y te lo enviamos',
      hint: 'Sin spam. Podés pedir baja cuando quieras.',
      submitLabel: 'Enviar solicitud',
      note: 'Por ahora, al enviar te llevamos a WhatsApp con tu email en el mensaje.',
    },
  },
};

export function getPublishedSlugs(): string[] {
  return ebooksCatalog.filter((e) => e.status === 'published').map((e) => e.slug);
}

export function getCatalogItem(slug: string): EbookCatalogItem | undefined {
  return ebooksCatalog.find((e) => e.slug === slug);
}
