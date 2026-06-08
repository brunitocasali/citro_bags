/**
 * Parsea ebooks/index.html para incrustarlo en /ebooks sin iframe.
 * Reescribe href/src relativos hacia /ebooks/...
 */
const ABS_PREFIX = /^https?:|^\/\/|^data:|^mailto:|^#|^javascript:/i;

function resolveAssetUrl(raw: string): string {
  const url = raw.trim();
  if (!url || ABS_PREFIX.test(url)) return url;
  if (url.startsWith('/')) return url;
  try {
    const resolved = new URL(url, 'http://localhost/ebooks/index.html');
    return resolved.pathname + resolved.search + resolved.hash;
  } catch {
    return `/ebooks/${url.replace(/^\.\//, '')}`;
  }
}

function rewriteAttributes(html: string): string {
  return html.replace(/\b(href|src)=(["'])([^"']+)\2/gi, (_m, attr: string, q: string, val: string) => {
    const next = resolveAssetUrl(val);
    return `${attr}=${q}${next}${q}`;
  });
}

/** Quita <base> para no romper rutas absolutas de Astro. */
function stripBaseTags(html: string): string {
  return html.replace(/<base[^>]*>/gi, '');
}

export type EbookLegacyPayload = {
  title: string;
  description: string;
  headHtml: string;
  bodyHtml: string;
};

export function parseEbookLegacy(raw: string): EbookLegacyPayload {
  const titleMatch = raw.match(/<title[^>]*>([^<]*)<\/title>/i);
  const descMatch =
    raw.match(
      /<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i,
    ) ??
    raw.match(
      /<meta[^>]+content=["']([^"']*)["'][^>]*name=["']description["'][^>]*>/i,
    );
  const ogDesc = raw.match(
    /<meta[^>]+property=["']og:description["'][^>]*content=["']([^"']*)["'][^>]*>/i,
  );

  const headInner = raw.match(/<head[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? '';
  const bodyInner = raw.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? raw;

  const headPieces: string[] = [];
  for (const re of [
    /<link[^>]*>/gi,
    /<style[^>]*>[\s\S]*?<\/style>/gi,
    /<script[^>]*\ssrc=[^>]*>\s*<\/script>/gi,
    /<script[^>]*\ssrc=[^>]*\/>/gi,
  ]) {
    const matches = headInner.match(re);
    if (matches) headPieces.push(...matches);
  }

  let headHtml = stripBaseTags(headPieces.join('\n'));
  headHtml = rewriteAttributes(headHtml);

  const bodyHtml = rewriteAttributes(bodyInner);

  return {
    title: (titleMatch?.[1] ?? 'Ebooks | Citro Victoria').trim(),
    description: (descMatch?.[1] ?? ogDesc?.[1] ?? 'Citro Victoria').trim(),
    headHtml,
    bodyHtml,
  };
}
