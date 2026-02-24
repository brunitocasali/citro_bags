# Victoria Citro Web (Astro)

Base de proyecto para migrar el sitio desde Canva Websites a codigo editable y versionable en Git.

## Canva exporta codigo?

En la practica, Canva Websites permite disenar y publicar dentro de Canva (dominio de Canva o dominio conectado), pero no ofrece un flujo oficial para exportar un proyecto web completo editable (HTML/CSS/JS limpio) listo para mantener en un repo.

Por eso, la migracion recomendada es recrear el sitio en codigo con los mismos assets, textos y estilo visual.

## Plan de migracion paso a paso

1. Inventario del sitio actual
   - Listar todas las secciones, CTA, links y formularios.
   - Tomar capturas desktop y mobile para tener referencia visual.
2. Descarga de assets
   - Exportar desde Canva logos, imagenes y fondos en PNG/JPG/SVG segun corresponda.
   - Guardarlos en `public/images/` con nombres claros.
3. Sistema visual (tokens)
   - Definir fuentes, colores, espaciados y radios en `src/styles/global.css`.
   - Reemplazar valores temporales por los de tu marca.
4. Maquetado responsive
   - Replicar estructura en `src/pages/index.astro`.
   - Ajustar mobile-first y luego breakpoints de tablet/desktop.
5. Contenido editable
   - Centralizar textos y enlaces en `src/data/site.ts`.
   - Cambiar solo ese archivo para futuras ediciones.
6. QA y performance
   - Revisar en 360px, 768px y 1280px.
   - Optimizar imagenes (peso/tamano) antes de publicar.
7. Git + deploy
   - Subir a GitHub.
   - Conectar repo a Vercel o Netlify para deploy automatico.

## Estructura del proyecto

```text
/
├── public/
│   └── images/
│       └── (assets exportados desde Canva)
├── src/
│   ├── data/
│   │   └── site.ts
│   ├── layouts/
│   │   └── Layout.astro
│   ├── pages/
│   │   └── index.astro
│   └── styles/
│       └── global.css
├── astro.config.mjs
└── package.json
```

## Comandos

```bash
npm install
npm run dev
npm run build
npm run preview
```

## Publicar en GitHub y deployar

1. Crear repo vacio en GitHub.
2. Ejecutar:

```bash
git init
git add .
git commit -m "feat: migracion inicial desde Canva a Astro"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
git push -u origin main
```

3. Deploy:
   - Vercel: importar repo y desplegar (preset Astro automatico).
   - Netlify: importar repo y desplegar con `npm run build` y publish `dist`.

## Siguientes ajustes recomendados

- Reemplazar contenido de ejemplo en `src/data/site.ts`.
- Cargar imagenes reales en `public/images/`.
- Configurar `site` real en `astro.config.mjs`.
