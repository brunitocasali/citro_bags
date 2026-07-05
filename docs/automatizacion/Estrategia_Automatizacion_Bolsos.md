# Estrategia de automatización — Preview de bolsos + flujo de ventas

> Documento de definición (no de implementación). Analiza cómo automatizar la
> **generación de imágenes (preview del bolso personalizado)** y el **flujo de venta**
> para la landing de **bolsos pintados a mano** (`src/pages/index.astro`), NO la de ebooks.
>
> Se apoya en los dos briefs cargados en esta misma carpeta:
> - `Brief_Desarrollador_CITRO_Automatizacion.md`
> - `Guia_Paso_a_Paso_Implementacion_CITRO.md`
>
> Escrito desde tres roles: **Ventas**, **UX/UI** y **QA**.

---

## 0. Diagnóstico rápido (dónde estamos hoy)

Estado actual de la landing de bolsos:

- El único CTA (`PIDE TU BOLSO PERSONALIZADO`, "Pedir aquí", "Pedir bolso") abre el
  modal `OrderDialog.astro` → arma un texto → **abre WhatsApp** (`wa.me/5493517417645`).
- Todo lo que pasa después es 100% manual: Victoria conversa, cotiza, cobra y coordina.
- Ya existe una sección **teaser** ("Próximamente") que literalmente promete:
  *"ver la idea antes de bordarla en cuero"*. O sea: la promesa de preview ya está vendida
  al cliente, pero **todavía no existe**.
- Ya existe un backend propio en `server/` (Node/Express + Mercado Pago + Resend + SQLite)
  usado hoy para los ebooks. **Es reutilizable** para el flujo de bolsos.

**Conclusión:** el activo que más mueve la aguja es cerrar la brecha entre "el cliente
imagina su bolso" y "el cliente VE su bolso". Ese es el momento *ajá* y el mayor driver de
conversión para un producto emocional y caro. Automatizar esa preview + ordenar el flujo de
venta es la palanca #1.

> ⚠️ Nota de marca importante: estos son **bolsos de lujo pintados a mano sobre cuero**.
> La imagen de IA **NO es el producto final**: es una **maqueta/mockup de "cómo se vería"**
> para ilustrar la idea. Hay que comunicarlo explícitamente para no romper la promesa de
> artesanía ni generar expectativa equivocada. La aprobación manual de Victoria
> (human-in-the-loop) es lo que protege la marca de mostrar una imagen fea o poco fiel.

---

## 1. Rol VENTAS — cómo convertir con la preview

### 1.1. El hook: "Preview gratis de tu bolso"
Convertir el preview en el **lead magnet** central de la landing:

> *"Subí la foto de tu mascota y te mostramos, sin cargo, cómo quedaría pintada en tu bolso
> de cuero. Sin compromiso."*

Por qué funciona:
- Baja la barrera de entrada (gratis, sin compromiso) → captura de lead con foto + nombre.
- El cliente se enamora de VER su mascota en el bolso → deseo emocional altísimo.
- Genera un dato de contacto (email/WhatsApp) para seguimiento aunque no compre hoy.

### 1.2. Embudo de venta propuesto
```
Landing (hook preview) 
  → Captura (foto + nombre + modelo + contacto) 
  → Generación IA (mockup del bolso) 
  → Aprobación de Victoria (calidad/marca) 
  → Entrega del preview al cliente (con marca de agua) 
  → Cierre: cotización + medio de pago 
  → Producción a mano + envío 
  → Post-venta / upsell (kit, segundo bolso, regalo)
```

### 1.3. Palancas de conversión (aplican al copy y al flujo)
- **Anclaje de valor:** posicionar "pieza de galería / herencia emocional", no "un bolso".
  La landing ya lo hace bien (premios, exhibiciones, "arte hecho a mano").
- **Escasez real:** "producción de baja escala" / cupos de agenda por mes → urgencia honesta.
- **Prueba social:** ya hay reseñas; sumar el preview aprobado a testimonios reales.
- **Manejo de expectativa de tiempo (del brief, caso D):** nunca prometer "en minutos".
  Usar: *"En las próximas horas te mando tu preview"*. Evita ansiedad si Victoria no está.
- **Cierre manual e intencional (del brief, sección 6):** el precio final, la negociación de
  kit y el link de pago los maneja Victoria por chat. NO automatizar checkout dentro del
  preview. La automatización llega hasta *entregar el preview y disparar la conversación*.
- **Upsell suave:** tras entregar el preview, mensaje tipo *"Si te encantó, puedo sumarte
  [taza / cuadro / segundo bolso a juego] con envío coordinado"* — pero lo cierra Victoria.

### 1.4. Métricas a instrumentar (para saber si vende)
- Nº de previews solicitados / día.
- Tasa foto-válida vs foto-descartada (calidad del lead).
- Tasa preview → conversación de WhatsApp iniciada.
- Tasa conversación → venta cerrada (la marca hoy manual).
- Costo IA por preview (ver §2.4) vs ticket promedio del bolso.

---

## 2. Rol ARQUITECTURA — cómo automatizar la generación de imágenes

Hay **dos caminos**. Se pueden combinar en fases.

### Opción A — No-code (idéntico al brief: ManyChat + Make + OpenAI + Telegram + Airtable)
El flujo del brief tal cual, pero adaptado a "preview de bolso" en vez de "kit hincha".

- La landing **no genera nada**: su único trabajo es empujar el tráfico a WhatsApp/Instagram
  con un mensaje pre-armado, y ManyChat toma la conversación desde ahí.
- **Pros:** rapidísimo de montar, sin servidores nuevos, Victoria lo opera sola (ver la Guía
  paso a paso). Ideal para validar demanda en 1-2 semanas.
- **Contras:** el "momento ajá" ocurre fuera de la web (en el chat), dependés de ManyChat/Make
  (costos y límites de ventana de Meta), menos control de marca/UX, no versionable.

### Opción B — Propia / on-site (reutiliza `server/`)  ⭐ recomendada a mediano plazo
La preview se pide **dentro de la landing** y la resuelve nuestro backend.

```
[Landing Astro] --POST foto+datos--> [server/ Node/Express]
     |                                     |
     |                                     |-- valida (tipo imagen, tamaño, casos borde)
     |                                     |-- llama OpenAI Images (gpt-image-1) con prompt maestro
     |                                     |-- guarda registro (SQLite ya existe) estado="pendiente"
     |                                     |-- notifica a Victoria (Telegram/email) con botón Aprobar/Regenerar
     |                                     |
     |<-- "en proceso, te llega en horas" -|
                                           |
                     (Victoria aprueba) -->|-- entrega preview al cliente (email vía Resend / WhatsApp link)
                                           |-- marca estado="enviado", dispara CTA de cierre
```

- **Pros:** control total de marca/UX, preview embebido en la web, **reutiliza infra ya hecha**
  (Express + Resend + SQLite + patrón de links firmados de `/gracias`), versionable en Git,
  puede integrarse al checkout de Mercado Pago existente si algún día se quiere cerrar on-site.
- **Contras:** más desarrollo que la Opción A, requiere deploy del backend (ya hay guía en
  `server/README.md`), y sostener la API key de OpenAI.

### Opción C — Híbrida (recomendada como camino real) ⭐⭐
1. **Fase 1 (semana 1-2):** montar Opción A (no-code) para validar demanda YA, sin tocar código.
2. **Fase 2:** migrar el "momento ajá" a la landing con Opción B, reutilizando `server/`.
3. En ambas fases, el **cierre de venta sigue manual** por WhatsApp (decisión del brief).

### 2.1. El prompt de generación (adaptación del brief)
El brief trae un prompt maestro para "Kit Hincha de Argentina" (mockup de varios productos).
Para bolsos hay que **reescribirlo** para un solo producto:

- Objetivo: *mockup de UN bolso de cuero de lujo con la mascota pintada a mano*, sobre el
  modelo elegido (Siena / Roma / Capri o el que corresponda), estética boutique cálida.
- Reglas heredadas del brief (respetar identidad real del animal, no cambiar raza, no inventar
  mascota, respetar manchas/color/orejas/proporciones, no deformar anatomía).
- Estética "pintado a mano sobre cuero", no impresión plana. Marca de agua CITRO en esquina.
- Variables por pedido: `[NOMBRE_MASCOTA]`, `[MODELO_BOLSO]`, `[RASGOS]`, `[COLOR_CUERO]`.

> Acción pendiente: Victoria debe validar/ajustar este prompt con 5-10 pruebas reales antes
> de exponerlo a clientes (igual que hizo con el prompt del kit).

### 2.2. Referencia de imagen
Usar **edición con imagen de referencia** (la foto de la mascota) para máxima fidelidad, no
generación desde texto puro. Confirmar endpoint/modelo vigente de OpenAI al implementar.

### 2.3. Human-in-the-loop (obligatorio)
Igual que el brief: **ninguna imagen se envía al cliente sin que Victoria la apruebe** desde
Telegram (botones Aprobar / Regenerar / Rechazar-pedir-otra-foto). Esto protege la marca de lujo.

### 2.4. Costos
- OpenAI (imágenes + texto): estimado del brief **$5–25/mes** para 200–500 conversaciones/mes.
  Ridículo frente al ticket de un bolso de lujo. Riesgo económico bajo.
- Control de abuso (previews gratis repetidos): registrar por contacto y avisar a Victoria
  (no bloquear automático) — igual que el caso B del brief.

---

## 3. Rol UX/UI — cómo se vive en la landing

### 3.1. Dónde va
Reemplazar/expandir la sección **teaser "Próximamente"** (que ya promete el preview) por un
bloque real **"Pedí tu preview gratis"**, y conectar los CTAs existentes
(`.js-open-order-dialog`) a un modal de captura enriquecido (evolución de `OrderDialog.astro`).

### 3.2. Formulario multi-paso (progressive disclosure)
No pedir todo de golpe. Pasos cortos, mobile-first (la landing es muy mobile):

1. **Foto de la mascota** — validar que sea imagen real (no texto, no PDF), peso/resolución mínima.
2. **Nombre de la mascota.**
3. **Modelo de bolso** (Siena / Roma / Capri) + color de cuero.
4. **Contacto** (email o WhatsApp — al menos uno, como ya valida el form actual).
5. Confirmación: *"Tu preview está en proceso, en las próximas horas te lo mandamos 🎨"*.

### 3.3. Estados de UI que hay que diseñar (hoy no existen)
- **Loading / "generando"**: sin prometer inmediatez.
- **Éxito** (preview listo, con marca de agua + CTA "Quiero este bolso" → WhatsApp).
- **Foto rechazada** (mensaje cálido pidiendo mejor foto — caso C del brief).
- **Error técnico** (fallback a WhatsApp manual, nunca dejar al cliente en el vacío).

### 3.4. Detalles finos
- **Marca de agua** en el preview (logo/firma CITRO) — asset ya provisto en el brief.
- **Aclaración de expectativa:** microcopy *"Preview ilustrativo — el bolso final es pintado
  a mano, pieza única"* para no romper la promesa de artesanía.
- **Accesibilidad:** labels, foco, `aria-*` (el modal actual ya trae buena base).
- **Bilingüe ES/EN:** respetar el sistema `data-i18n` / `data-oi18n` ya presente.
- **Consentimiento:** casilla de "acepto que usen la foto para generar el preview".

---

## 4. Rol QA — qué puede salir mal (y cómo lo cubrimos)

Casos borde a cubrir (heredados/adaptados del brief, secciones A–J):

| # | Caso | Comportamiento esperado |
|---|------|-------------------------|
| A | Cliente manda foto + nombre + pedido juntos | Extraer lo que se pueda, pedir solo lo que falte. No re-preguntar. |
| B | Previews gratis repetidos (abuso) | Registrar por contacto; avisar a Victoria en la aprobación; no bloquear automático. |
| C | Foto de mala calidad | Rechazar con mensaje cálido y reabrir paso de foto. |
| D | Expectativa de tiempo | Nunca prometer minutos; usar "en las próximas horas". |
| F | Repetición del saludo de bienvenida | Reconocer estado de conversación; nunca reiniciar el saludo. |
| G | **Mascota fallecida** (sensible) | Detectar frases ("falleció", "en el cielo") → derivar a Victoria, NO seguir guion de ventas. |
| H | Collage / varias fotos juntas | Pedir una foto por vez; no asumir cuál usar. |
| — | Validación de adjunto | Rechazar si no es imagen (tipo/tamaño); no avanzar con texto vacío. |
| — | Límites de ventana de Meta | Respetar 24h / plantillas aprobadas (si se usa ManyChat/WhatsApp). |
| — | Fallo de API OpenAI | Reintentar / fallback a flujo manual; nunca colgar al cliente. |
| — | Doble submit / spam del form | Debounce + rate-limit por IP/contacto en el backend. |
| — | Privacidad de la foto | Consentimiento explícito + borrado/retención definida. |

### Plan de prueba (previo a lanzar)
1. **Prueba interna** end-to-end (foto → generación → aprobación → entrega).
2. **Prueba de casos raros**: texto en vez de foto, foto borrosa, collage, mensaje sensible,
   segundo preview del mismo contacto.
3. **Prueba de carga baja controlada** los primeros días, monitoreando Telegram.
4. **Prueba bilingüe** ES/EN del modal y los mensajes.
5. **Prueba mobile** en 360 / 768 / 1280 (breakpoints ya usados en el proyecto).

---

## 5. Recomendación y próximo paso

**Camino recomendado: Opción C (híbrida).**
- **Ahora:** montar el flujo no-code del brief (ManyChat + Make + OpenAI + Telegram + Airtable)
  adaptando el prompt a "preview de bolso". Valida demanda sin tocar código.
- **Después:** llevar el "momento ajá" a la landing con backend propio (reutilizando `server/`),
  para control de marca y UX, dejando el cierre de venta siempre manual por WhatsApp.

**Decisiones ya tomadas (jul-2026):**
1. ✅ Camino: **Opción C (híbrida)** — arrancar no-code para validar, luego migrar a on-site.
2. ✅ Alcance del preview: **un solo bolso** con la mascota (no kit).
3. ✅ Prompt: se prepara un prompt inicial + ejemplos para que Victoria calibre.
   → Ver `Prompt_Preview_Bolso.md` en esta misma carpeta.

**Próximos entregables (una vez que Victoria calibre el prompt):**
- Diseño técnico de la Fase 2 on-site: endpoints en `server/`, esquema de datos (SQLite),
  integración OpenAI Images, notificación/aprobación por Telegram y entrega vía Resend.
- Wireframe del modal multi-paso (evolución de `OrderDialog.astro`) + estados de UI (§3.3).
