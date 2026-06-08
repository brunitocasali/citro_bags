# Integración `/ebooks` — guía técnica y marketing



## Comportamiento actual



- Ruta pública: **`/ebooks`** (build estático: `dist/ebooks/index.html`).

- Página: `src/pages/ebooks/index.astro`.

- **Si existe `ebooks/index.html` en la raíz del repo**  

  - Astro parsea ese HTML (`src/lib/ebookLegacy.ts`), reescribe `href`/`src` relativos a **`/ebooks/...`** y renderiza el cuerpo dentro de `src/layouts/EbookLegacyShell.astro` (documento propio, **sin** `global.css` de la home, para no pisar el diseño legacy).

  - Los recursos (CSS, JS, imágenes, fuentes, etc.) deben estar bajo `ebooks/` y copiarse a **`public/ebooks/`** con el script de sync (ver más abajo).

- **Si no hay `ebooks/index.html`**  

  - Se muestra la landing provisional: `Layout.astro` + `src/styles/ebooks.css` + datos en `src/data/ebooks.ts` (prefijo `eb-`), formulario → WhatsApp.



## Sincronizar assets (`ebooks/` → `public/ebooks/`)



El HTML se lee desde **`ebooks/index.html`** (no se copia a `public/`). El resto de la carpeta `ebooks/` sí se copia para servir archivos estáticos en **`/ebooks/*`**.



```bash

npm run sync:ebooks

```



- **`prebuild`** y **`predev`** ejecutan `sync:ebooks` automáticamente antes de `npm run build` y `npm run dev`.

- El script **no** copia `ebooks/README.md` ni **`ebooks/index.html`** (evita duplicar el entry HTML en `public/`).



### Flujo recomendado para diseño idéntico a la maqueta



1. Colocar en la raíz del repo: `ebooks/index.html` y todas las carpetas que referencie (`css/`, `js/`, `images/`, etc.).

2. Ejecutar `npm run sync:ebooks` (o simplemente `npm run dev` / `npm run build`).

3. Verificar `http://localhost:4321/ebooks` y el build en `dist/ebooks/`.



## Qué se implementó (resumen técnico)



| Pieza | Rol |

|--------|-----|

| `scripts/sync-ebooks.mjs` | Copia `ebooks/` → `public/ebooks/` salvo README e `index.html` raíz. |

| `src/lib/ebookLegacy.ts` | Extrae fragmentos útiles del `<head>` (links, styles, scripts con `src`), el `<body>`, título y meta description; reescribe rutas; quita `<base>`. |

| `EbookLegacyShell.astro` | HTML mínimo + `set:html` para head/body legacy. |

| `src/data/ebooks.ts` | Contenido de la landing **fallback** cuando no hay HTML legacy. |



## Funcionalidades de la landing fallback



| Función | Descripción |

|--------|-------------|

| SEO básico | `title` y `description` desde datos. |

| Navegación | Sticky nav: logo → home, enlaces a `/order` y `/`. |

| Hero + CTAs | CTA principal ancla a `#lead`; secundario abre WhatsApp. |

| Valor y capítulos | Listas y tarjetas responsive. |

| Lead form | Nombre + email obligatorios → mensaje prearmado en WhatsApp. |



## Base de datos — hoy no hay BD en el proyecto



El sitio es **100% estático**. No existe conexión a base de datos en el código.



### Si querés persistir leads (recomendado para marketing)



Opciones típicas (elegí una):



1. **SaaS sin BD propia**  

   - Brevo, MailerLite, ConvertKit, HubSpot form embed o webhook.  

   - Solo añadís un `action` al `<form>` o un `fetch` en el submit.



2. **BD propia (ej. PostgreSQL)**  

   Tabla mínima sugerida:



   ```sql

   CREATE TABLE ebook_leads (

     id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),

     name          TEXT NOT NULL,

     email         TEXT NOT NULL,

     source        TEXT DEFAULT 'ebooks',

     ebook_slug    TEXT DEFAULT 'guia-citro',

     consent_news  BOOLEAN DEFAULT false,

     created_at    TIMESTAMPTZ DEFAULT now()

   );

   CREATE INDEX idx_ebook_leads_email ON ebook_leads (email);

   CREATE INDEX idx_ebook_leads_created ON ebook_leads (created_at DESC);

   ```



   Necesitás además: **API serverless o backend** (endpoint POST) y **CORS** + **rate limiting** + **RGPD/consentimiento** si aplica.



3. **Hoja de cálculo / Airtable**  

   Vía Zapier/Make o webhook → sin SQL directo en el front.



### Campos útiles para analítica



- `utm_source`, `utm_medium`, `utm_campaign` (query params que guardés al cargar la página).

- `locale` (`es` / `en`).

- `user_agent` / `referrer` (en servidor, no confiar en el cliente).



## Incompatibilidades y riesgos



### Estéticas



- Con **HTML legacy**, el aspecto depende 100% de tus archivos en `ebooks/`; la home no aplica `global.css` en esa ruta.

- En **fallback**, la home y ebooks pueden verse distintas a propósito (lectura / conversión).



### Funcionales (fallback)



- **No hay descarga automática de PDF** hasta que subas el archivo y enlaces la URL en `ebooks.ts` o en tu HTML legacy.

- **WhatsApp no sustituye CRM**: no deduplicás emails ni medís aperturas; para eso usá email marketing + BD o integración.

- **i18n**: la home tiene toggle ES/EN; el fallback de ebooks está en español fijo.



### Seguridad / legal



- El formulario fallback **no valida** email en servidor (solo HTML5 + WhatsApp).

- Si guardás datos en UE/AR: informá **política de privacidad** y base legal del tratamiento.



## Próximos pasos sugeridos (marketing)



1. Subir PDF real a `public/ebooks/` y añadir botón “Descargar PDF” tras confirmación (o enlace en email automatizado).

2. Añadir pixel Meta / GA4 solo con consentimiento cookies.

3. A/B test de titular en `ebooks.ts` (fallback) sin tocar estructura.

4. URL con UTM en campañas: `https://tudominio.com/ebooks?utm_source=instagram&utm_medium=stories&utm_campaign=ebook-lanzamiento`



## Comandos útiles



```bash

npm run sync:ebooks

# Copia assets a public/ebooks/



npm run dev

# http://localhost:4321/ebooks



npm run build

# Salida: dist/ebooks/index.html

```


