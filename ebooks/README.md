# Carpeta `ebooks` — landing original (referencia visual)

Para que **`/ebooks`** quede **idéntica** a tu maqueta (mismos estilos, botones, tarjetas), subí aquí el **export HTML** de esa landing.

## Qué subir (raíz `ebooks/`)

```text
ebooks/
  index.html          ← obligatorio: Astro lo lee y sirve en /ebooks
  css/                ← o styles.css en la raíz
  js/                 ← si hay scripts externos
  images/             ← o assets/, img/, etc.
  ... (cualquier otra carpeta que use el HTML)
```

- Las rutas relativas (`css/style.css`, `./images/...`) se reescriben a **`/ebooks/...`** en build.
- Un solo `index.html` con CSS en `<style>` también sirve.

## Sync a `public/ebooks/`

Antes de **dev** o **build**, el proyecto ejecuta `npm run sync:ebooks`: copia todo `ebooks/` a **`public/ebooks/`** **excepto** este `README.md` y **`ebooks/index.html`** (el HTML lo consume Astro desde el repo, no hace falta duplicarlo en `public/`).

Podés forzarlo a mano:

```bash
npm run sync:ebooks
```

## Estado actual

La landing en **`ebooks/index.html`** reproduce la guía **«Cuando a los ángeles les devuelven las alas»** (secciones, textos y estilo de las capturas): hero, empatía, sanar con amor, capítulos y formulario a WhatsApp. Los mockups en **`ebooks/images/*.svg`** son sustitutos hasta que pegues tus JPG/WebP reales.

### Imágenes (mockups)

En `ebooks/images/` hay **SVGs de apoyo** para la portada, la foto de la sección «Sanar con amor» y el libro abierto. Para que coincida al 100% con tus renders, reemplazá esos archivos por **JPG o WebP** con el **mismo nombre de archivo** y actualizá las rutas en `index.html` si usás otra extensión (por ejemplo `mockup-portada.jpg`).

## PDFs públicos

Archivos descargables por URL directa: `public/ebooks/` → ejemplo **`/ebooks/catalogo.pdf`** (podés copiarlos ahí a mano o incluirlos en `ebooks/` para que el sync los lleve a `public/ebooks/`).

Documentación técnica: **`docs/EBOOKS_INTEGRATION.md`**.

