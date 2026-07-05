# CITRO Arte — Print on Demand + "Kit Mundial" con IA (evaluación de opciones)

> Proyecto **separado** de los bolsos de lujo pintados a mano.
> Objetivo: automatizar la generación del diseño personalizado ("Kit Mundial" / estilo
> Hincha de Argentina) a partir de **foto + nombre de la mascota**, con aprobación manual de
> Victoria, para la tienda **Tiendanube** de CITRO Arte.
>
> El spec funcional completo ya está en `../automatizacion/Brief_Desarrollador_CITRO_Automatizacion.md`
> y la guía paso a paso en `../automatizacion/Guia_Paso_a_Paso_Implementacion_CITRO.md`.
> Este documento NO repite el spec: **evalúa cómo y quién lo construye.**

---

## 1. Estado actual de la tienda (recorrido — jul 2026)

- Plataforma: **Tiendanube / Nuvemshop** (`victoriacitroarte.mitiendanube.com`).
- Catálogo activo: productos personalizados (taza $24k, remera $56k, tote $36k, cuadro $45k,
  gorra $39k, piluso $44k) + kits mundialeros (Clásico $75k, Pasión $99k, Recuerdo $145k,
  Corazón $145k, Full Mundial $169k) + "Diseños por Raza".
- **Checkout ya resuelto** en Tiendanube (Mercado Pago / Pago Nube, cuotas, envío gratis).
- Flujo actual (declarado en cada producto):
  1. Comprás el kit → 2. Mandás la foto por WhatsApp → 3. Victoria aplica el diseño y lo
  muestra antes de imprimir → 4. Lo recibís. **Diseño 100% manual, pago primero.**

**Conclusión:** el cobro NO hay que construirlo (Tiendanube lo hace). Lo que falta automatizar
es **la captura de foto/nombre + la generación del diseño + la aprobación + la entrega**.

---

## 2. Diferencia de funnel a decidir (rol Ventas)

| | Funnel actual (tienda) | Funnel del spec (ads → chat) |
|---|---|---|
| Orden | Paga primero, foto después | **Preview gratis primero**, venta después |
| Origen | Tienda / orgánico | Anuncio de Meta → DM |
| Pro | Cero costo de IA por curioso; solo paga interesados | Más leads, "momento ajá" antes de pagar |
| Contra | Menos captación; fricción (pagar sin ver) | Costo IA por lead + riesgo de abuso |
| Mitigación | — | Regla del brief: avisar a Victoria si el cliente ya recibió diseños gratis |

> Decisión de negocio pendiente: ¿el bot ofrece **preview gratis** (lead-gen desde ads) o
> mantiene el orden "pagás y después el preview"? El spec asume preview gratis. Cambia el copy
> del bot y la estrategia de pauta.

---

## 3. Dónde vive cada cosa (arquitectura de alto nivel)

```
[Anuncio Meta] -> [DM Instagram/WhatsApp]
                        |
                 [ManyChat]  (conversación, captura foto+nombre, capa IA conversacional,
                        |      recordatorios, no-repetir-saludo, ventanas de Meta)
                        v
                   [Make.com]  (orquestador)
                     |   |  |
                     |   |  +--> [OpenAI texto gpt-4o-mini]  (entender preguntas fuera de guión,
                     |   |                                     detectar mascota fallecida, KB)
                     |   +-----> [Generación imagen]  (OpenAI gpt-image-1 + watermark CITRO)
                     |                                  (ver §5: el watermark va por software)
                     +---------> [Airtable]  (pedidos, estado, control de diseños gratis)
                        |
                 [Telegram bot]  (aprobación manual de Victoria: Aprobar / Regenerar / Rechazar)
                        |
                 [ManyChat API]  (entrega del diseño aprobado al cliente)

[Tiendanube] = catálogo + checkout (SE MANTIENE COMO ESTÁ; el cierre lo hace Victoria a mano)
```

Punto clave: **el bot NO necesita integrarse en profundidad con Tiendanube.** El cierre de
venta es manual (decisión del brief), así que Tiendanube sigue siendo solo catálogo + cobro.
Si algún día se quiere, la API de Tiendanube permite crear órdenes/borradores, pero **no es
necesario ahora**.

---

## 4. Opciones de construcción (evaluadas)

### Opción 1 — No-code (ManyChat + Make + OpenAI + Telegram + Airtable) ⭐ recomendada para arrancar
- **Encaje:** 10/10. El brief y la guía fueron escritos exactamente para este stack.
- **Esfuerzo:** bajo (1-2 semanas la primera vez).
- **Costo mensual:** OpenAI ~$5-25 + ManyChat (~USD 15 plan Pro) + Make (tier bajo/gratis).
- **Quién:** Victoria/Bruno siguiendo la Guía, o un freelancer de ManyChat/Make.
- **Pros:** rápido, operable por Victoria, cumplimiento de ventanas de Meta nativo, barato.
- **Contra:** la capa de IA conversacional (ver §6) exige armado cuidadoso en Make.

### Opción 2 — Custom code (bot propio con Meta Graph API)
- **Encaje:** sobredimensionado para este volumen.
- **Esfuerzo:** alto (semanas/meses): reimplementar mensajería de Meta, ventanas de 24h,
  plantillas, estado de conversación, reintentos, etc. — todo lo que ManyChat ya da hecho.
- **Cuándo tiene sentido:** solo a gran escala o si se supera ManyChat.

### Opción 3 — Híbrida (conversación no-code + microservicio propio de imagen) ⭐ recomendada al escalar
- ManyChat + Make para la conversación; un **microservicio propio** (Node, reutilizando el
  `server/` que ya existe en este repo) para: llamar a OpenAI, **superponer el watermark CITRO
  por software**, versionar el prompt y guardar imágenes.
- **Pros:** control de marca (watermark garantizado), prompt versionado en Git, mejor calidad.
- **Contra:** un poco más de dev + un deploy del microservicio.

### Opción 4 — Herramienta externa (apps de retrato IA / print-on-demand)
- No existe una que haga el combo exacto "Kit Hincha (multi-producto) + aprobación humana +
  flujo IG/WA + KB de precios". Las de print-on-demand (Printful/Printify) resuelven
  **producción**, no el preview con IA. Podrían sumarse más adelante solo para fulfillment.

---

## 5. Aprendizaje ya validado: el watermark NO se le pide al prompt

En la Prueba #1 del proyecto de bolsos de lujo, el modelo **inventó una firma falsa**
("Atelier Louise") al pedirle la marca de agua en el prompt. Conclusión transferible a este
proyecto: **el logo CITRO se superpone por software** (módulo de imagen en Make, o el
microservicio de la Opción 3), nunca confiándoselo al modelo generador.

---

## 6. Lo más difícil no es la imagen: es la capa de IA conversacional

Prioridad de esfuerzo. Esta capa (un módulo único y reutilizable en Make, como pide el brief)
debe resolver, en cualquier punto de espera del bot:
- Entender preguntas fuera de guión (precio, envío, materiales, talles, "¿de qué zona sos?")
  con la Knowledge Base y volver a pedir el dato.
- Detectar **mascota fallecida** → derivar a Victoria, cortar tono de venta.
- No repetir el saludo si la conversación ya empezó.
- Recordatorios escalonados (2-3h / 24h / 48-72h) respetando ventanas de Meta.
- Extraer varios datos de un mismo mensaje (foto + nombre juntos).

---

## 6.b Aprobación + DELAY intencional — ⛔ DESCARTADO (jul-2026)

> **DECISIÓN ACTUALIZADA:** el usuario optó por **generación INSTANTÁNEA self-service** en la
> web (aprovechar el envión de compra), SIN delay ni aprobación previa. Ver el flujo real
> implementado en **§7.b**. Esta sección se conserva como registro del razonamiento anterior.
>
> Para no perder la marca "hecho a mano", en vez del delay se usa **copy de "boceto / vista
> previa ilustrativa"**: lo que se muestra al instante se presenta como un boceto para ver la
> idea, y se aclara que la ilustración final la termina Victoria a mano y que cada producto del
> kit lleva su propia adaptación (no la misma imagen calcada). Trade-off asumido a conciencia.

Lo de abajo era el requisito previo (mantener por si se quiere revisar el trade-off):

Este NO es un detalle técnico: es un **requisito del sistema** que sostiene el posicionamiento
de marca ("arte pintado a mano"). Cualquier implementación debe respetarlo.

### Las 3 acciones de Victoria al revisar (Telegram)
1. **Aprobar tal cual** — el diseño respeta a la mascota, sin errores (patas de más, deformidad).
2. **Regenerar con ajuste** — corregible (ej. "más luz", "cambiar la pose") → nueva versión.
3. **Rechazar** — el problema viene de la foto original del cliente (borrosa, mal ángulo) →
   dispara automáticamente el mensaje pidiendo mejor foto y reabre la captura.

### El delay de 40-60 min es DELIBERADO (no una demora a eliminar)
Aunque la IA genera en segundos, **el preview NO se entrega instantáneo a propósito**:

- **Por qué:** una respuesta inmediata delata que hay una IA detrás y **rompe la ilusión de
  arte hecho a mano**. Nadie cree que se pinta a mano en 10 segundos; sí es creíble en ~45-60
  min. El delay funciona como "puesta en escena" del proceso artesanal.
- **Público (40+, menos digitalizado):** valora especialmente lo hecho a mano. Si percibe que
  salió de una IA en segundos, el producto pierde valor percibido ("filtro gratis" vs "arte
  personalizado para mi mascota") y **baja la disposición a pagar** el precio del kit.
- **Conclusión:** entregar más rápido, aunque sea técnicamente posible, va EN CONTRA del
  objetivo de negocio. El delay es un requisito, no un bug.

### Lógica de tiempos a implementar (Make / microservicio)
```
t0 = momento en que se captura foto+nombre y se dispara la generación
  - Generación IA: segundos (interna, invisible al cliente)
  - Notificación a Victoria (Telegram): inmediata
  - Mensaje al cliente mientras espera: "Tu diseño está en proceso, en las próximas horas te
    lo mando" (NUNCA prometer minutos — caso D del brief)

Entrega al cliente = se libera SOLO cuando se cumplen AMBAS:
  (1) Victoria aprobó, Y
  (2) pasó el umbral mínimo de tiempo desde t0 (ej. 40-60 min)

Casos:
  - Victoria aprueba ANTES del umbral  -> retener y entregar al cumplirse el umbral.
  - Victoria aprueba DESPUÉS del umbral -> entregar al aprobar (el umbral ya pasó).
  - Regenerar -> nueva versión; el tiempo total percibido no debe quedar "instantáneo".
  - Rechazar  -> mensaje automático pidiendo mejor foto (no aplica delay de entrega).
```

Recomendaciones para que no se sienta robótico:
- **Jitter aleatorio**: umbral variable (ej. entre 40 y 65 min), no siempre exacto 45:00.
- **Ventana horaria humana** (opcional): evitar entregar de madrugada; diferir a un horario
  creíble para reforzar que hay una persona detrás.
- **Fallback si Victoria no está**: definir política — ver decisión abierta abajo.

> ⚠️ Decisión abierta a confirmar: si Victoria NO revisa en X horas, ¿el sistema (a) espera
> indefinidamente a su aprobación (human-in-the-loop estricto), o (b) tras un timer entrega
> igual? La recomendación es **(a)**: nunca entregar sin aprobación humana, porque el control
> de calidad es el otro pilar de la marca. El timer solo debe **retrasar** la entrega, nunca
> **saltear** la aprobación.

---

## 7. División de trabajo (quién hace qué)

**Puede hacerlo el asistente (en este repo, versionable):**
- Prompt maestro afinado del "Kit Mundial" + ejemplos + checklist de fidelidad (como se hizo
  para bolsos en `../automatizacion/Prompt_Preview_Bolso.md`).
- Microservicio de generación + watermark CITRO (Node, reutilizando `server/`) — Opción 3.
- Diseño técnico detallado (endpoints, payloads, esquema de Airtable, prompts de la capa IA).

**NO puede hacerlo el asistente (click-ops en SaaS con cuentas de Victoria):**
- Armar los flows en ManyChat y los escenarios en Make.
- Conectar tokens de OpenAI / Telegram / Airtable en esas plataformas.
- Configurar el bot de Telegram y la cuenta de OpenAI (facturación).
→ Esto lo hace Victoria/Bruno con la Guía, o un freelancer de ManyChat/Make.

---

## 7.b Implementado: entrada web `/kit-mundial` (captura + wizard)

Se construyó en este repo una **página web de captura** como entrada al mismo backend:

- **Ruta:** `/kit-mundial` → `src/pages/kit-mundial.astro` (+ `src/styles/kit-mundial.css`).
- **Qué hace:** hero con el hook ("mirá a tu mascota hecha arte antes de comprar"), "cómo
  funciona" en 4 pasos, **wizard multi-paso** (cantidad → foto/s → nombre/s → contacto + review),
  sección de kits/precios (Knowledge Base), FAQ (zona, envíos, precio por varias mascotas, talles).
- **UX aplicada:** progressive disclosure, validación de imagen (tipo + peso, hasta 5 fotos con
  preview y borrado), copy que se adapta a "una/varias", manejo de expectativa ("en las próximas
  horas", nunca minutos), consentimiento de uso de la foto, accesibilidad (labels, roles, foco,
  `aria-live`), mobile-first.
- **Estado de confirmación** con el mensaje que sostiene la ilusión artesanal (§6.b): *"Victoria
  la ilustra a mano… el arte hecho a mano lleva su tiempo"*. No sugiere inmediatez ni IA.

### Flujo FINAL implementado: generación instantánea self-service (jul-2026)

End-to-end real que quedó en el código:

1. El cliente **sube la foto** de su mascota en la web (validación de tipo/peso, preview de
   miniatura, hasta 5 fotos si son varias mascotas) + nombre/s.
2. Al enviar, el front hace `POST multipart` a **`/api/kit-preview`** del backend `server/`.
3. El backend llama a **OpenAI (images/edits, `gpt-image-1`)** con la foto como referencia + el
   prompt maestro "Kit Mundial", **guarda la imagen generada como archivo nuestro** (ver abajo)
   y la devuelve al front (base64).
4. La web **muestra la vista previa** con copy de **"boceto / ilustrativo, no definitivo"** (ver
   §6.b) y aclarando que **cada producto del kit lleva su propia adaptación** del diseño (no la
   misma imagen calcada — **Opción B**, porque generamos una sola escena del kit).
5. Botones: **Guardar imagen** (descarga) + **Pedir mi kit por WhatsApp** (abre `wa.me` con
   mensaje pre-armado; el cliente adjunta la imagen). Desde ahí Victoria **cierra la venta a
   mano** (sin checkout automático).

**"¿Guardamos la imagen generada?" → SÍ.** Como la generación es server-side (la API key no
puede vivir en el front estático), el backend guarda **cada** preview en
`server/data/kit-previews/` como `TIMESTAMP_nombre-mascota_id.png` + un `.json` con metadata
(nombre de mascota, cantidad, nombre del cliente, IP, fecha). Esa carpeta **no es pública** y
está en `.gitignore`.

**Archivos:**
- Front: `src/pages/kit-mundial.astro` + `src/styles/kit-mundial.css`.
- Back: `server/src/kitPreview.mjs` (prompt + llamada OpenAI + guardado), endpoint
  `POST /api/kit-preview` en `server/src/server.mjs`, config en `server/src/config.mjs`.
- Config: `OPENAI_API_KEY` (+ `OPENAI_IMAGE_MODEL`, `OPENAI_IMAGE_SIZE`) en `server/.env`.

**Fallback sin key:** si `OPENAI_API_KEY` está vacía, el endpoint responde `503` y la web hace
*fallback* elegante: abre WhatsApp para que el cliente mande la foto por chat (no rompe nada).

**Watermark CITRO:** TODO pendiente — superponer el logo por software server-side (el modelo
inventa firmas si se le pide en el prompt). Hoy prioriza el disclaimer de "boceto".

**Costo/abuso:** cada generación cuesta ~centavos de OpenAI y es gratis para el visitante.
A futuro conviene un límite por IP/tiempo (rate-limit) para evitar abuso.

> Nota: la página vive en el repo de los bolsos de lujo por practicidad de desarrollo, pero es un
> track separado. Si se quiere, después se mueve a su propio proyecto/deploy.

---

## 8. Recomendación

1. **Arrancar con Opción 1 (no-code)** siguiendo la Guía, para validar demanda ya.
2. En paralelo, el asistente prepara el **prompt del "Kit Mundial"** afinado y (si se quiere
   watermark garantizado desde el día 1) el **microservicio de imagen** (Opción 3 lite).
3. Invertir el grueso del tiempo en la **capa de IA conversacional** (§6): es el diferencial.
4. Mantener el **cierre de venta manual** y el **checkout en Tiendanube** como están.

**Para avanzar necesito definir:** (a) funnel — ¿preview gratis desde ads o pagar primero?;
(b) si querés que arranque construyendo el prompt del "Kit Mundial" y/o el microservicio de
imagen mientras se arma el no-code.
