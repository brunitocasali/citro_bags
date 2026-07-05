# Brief Técnico — Automatización de Diseños Personalizados CITRO Arte

## Objetivo del proyecto
Automatizar el flujo de generación de diseños personalizados (ilustración de mascotas con IA) desde ManyChat, con aprobación manual de Victoria antes de enviar al cliente, eliminando el trabajo manual actual de generar cada diseño uno por uno en ChatGPT.

## Stack a utilizar
- **ManyChat** (ya existente) — bot conversacional en Instagram/WhatsApp
- **Make.com** (ya existente) — orquestador de automatización
- **Airtable** (ya existente) — base de datos de pedidos
- **OpenAI API** (a integrar) — generación de imágenes (gpt-image-1) + procesamiento de texto (gpt-4o-mini o gpt-4o)
- **Telegram Bot** (a crear) — notificaciones de aprobación a Victoria

---

## Flujo funcional completo

### 1. Captura de datos del cliente (en ManyChat)
El bot debe capturar y validar, en este orden:
1. Cantidad de mascotas (una o varias) — guardar en custom field `cantidad_mascotas`
2. Foto(s) de la(s) mascota(s) — **debe validar que el tipo de adjunto sea imagen**, no continuar si el cliente manda texto en ese paso. Guardar URL en `foto_mascota_url` (o array si son varias)
3. Nombre(s) de la(s) mascota(s) — guardar en `nombre_mascota`

**Requisito clave:** en el paso de nombre, si el cliente escribe una pregunta en vez de un nombre (sobre precio, envío, materiales, etc.), el sistema debe responderla y volver a pedir el nombre, no ignorarla ni trabarse. Ver sección "Lógica de IA conversacional" más abajo.

**Requisito clave 2:** si el cliente no responde en un paso (foto o nombre), disparar recordatorios automáticos:
- A las 2-3 horas de inactividad
- A las 24 horas
- A las 48-72 horas (mensaje final, sin insistir más después)

Validar límites de ventana de mensajería de Meta (24hs libres en Instagram/Messenger, requerimiento de plantillas aprobadas fuera de esa ventana; lo mismo en WhatsApp Business API).

### 2. Capa de IA conversacional (reutilizable en TODOS los puntos de espera)

**Importante: esta lógica no debe implementarse solo en el paso del nombre — debe ser un módulo único y reutilizable que corra en cada punto donde el bot espera algo puntual del cliente (foto, nombre, elección de producto, y cualquier paso futuro que se agregue).**

**Diseño técnico:**
Un solo módulo HTTP en Make que recibe dos variables desde ManyChat en cada llamada:
- `tipo_esperado`: qué está esperando el bot en ese punto (ej: "una foto de su mascota", "el nombre de su mascota")
- `mensaje_cliente`: lo que el cliente efectivamente mandó (texto o tipo de adjunto)

**Prompt de sistema (reutilizable, parametrizado):**

```
Sos el asistente de Victoria Citro, artista que crea productos 
personalizados con ilustraciones de mascotas.

Contexto actual: el bot está esperando que el cliente envíe: 
{tipo_esperado}

El cliente respondió: "{mensaje_del_cliente}"
Tipo de contenido recibido: {tipo_contenido} (texto / imagen / vacío)

Evaluá:
- Si el contenido recibido coincide con lo esperado → respondé 
  exactamente: VALIDO
- Si es una pregunta o comentario fuera de tema (precio, envío, 
  materiales, tiempos, dudas) → respondé la pregunta de forma 
  breve y cálida (máx. 2 líneas) usando este contexto de negocio: 
  [Knowledge Base], y terminá volviendo a pedir {tipo_esperado} 
  de forma natural

Knowledge Base: [precios, envíos, materiales, tiempos de entrega]
```

**Lógica en Make:**
- Respuesta = `VALIDO` → continúa el flujo normal en ese paso (guarda el dato correspondiente y avanza)
- Respuesta = cualquier otro texto → se reenvía al cliente vía ManyChat API, y ManyChat vuelve a esperar en el mismo punto (loop)

**Por qué como módulo único y no duplicado por paso:** permite mantener un solo prompt y una sola Knowledge Base actualizada (si cambian precios o políticas, se edita en un solo lugar), y cualquier paso nuevo que se agregue al flow en el futuro hereda automáticamente este manejo sin necesidad de reprogramar la lógica.

### 3. Generación del diseño (webhook → Make → OpenAI)
1. ManyChat dispara un webhook a Make con: `foto_mascota_url`, `nombre_mascota`, `cantidad_mascotas`, `subscriber_id`, `first_name`
2. Make llama a la API de OpenAI (gpt-image-1 o modelo de edición de imágenes con referencia) con el prompt maestro de estilo "Kit Hincha de Argentina" (ver abajo)
3. Guardar resultado en Airtable con estado `Pendiente de aprobación`, junto con foto original, nombre de mascota, subscriber_id

**Prompt maestro definitivo (versión Hincha de Argentina):**

```text
Usar la foto subida como referencia principal de la mascota o mascotas.

Respetar al máximo la identidad real de cada animal:
cara, ojos, hocico, orejas, manchas, color del pelaje, textura, expresión, tamaño y proporciones.
No cambiar la raza.
No inventar otra mascota.
No hacerla genérica.
No modificar rasgos importantes.

Crear una preview/mockup completa estilo "Kit Hincha de Argentina" en una sola escena cálida, premium y comercial, lista para mostrar al cliente.

La escena debe ser horizontal, con estética boutique cálida:
mesa de madera, luz suave, fondo acogedor, plantas, decoración sutil, tonos naturales y aspecto profesional de tienda online.

NO hacer collage dividido en cuadros.

Mostrar juntos estos productos:

1. Remera blanca colgada en percha de madera.
2. Tote bag color natural.
3. Taza blanca.
4. Cuadro enmarcado grande.
5. Gorra blanca con visera celeste/azul apoyada como producto físico sobre la mesa.

Cada producto debe tener una ilustración diferente de la misma mascota o del mismo grupo de mascotas en versión hincha de Argentina.

Dirección de cada producto:

REMERA:
La mascota usando camiseta argentina celeste y blanca, sentada o parada, con una pelota de fútbol cerca.
Una sola ilustración centrada, respetando área real de impresión y márgenes blancos.

TOTE BAG:
La mascota con bandera argentina como capa, en pose tierna de hincha.

TAZA:
La mascota sosteniendo o abrazando una copa dorada estilo trofeo mundial.

CUADRO:
La mascota en pose diferente y más dinámica, corriendo, festejando o jugando con pelota.

GORRA:
Retrato simple de la mascota con detalles celestes y blancos.

Estilo de ilustración:

Acuarela premium, tierna y realista.
Salpicaduras celestes y blancas detrás de la mascota.
Toques dorados sutiles.
Huellitas o corazones pequeños si quedan bien.
Nombre de la mascota escrito debajo de cada diseño en tipografía script azul.
El diseño debe verse impreso de forma realista sobre cada producto.

Tema Argentina:

Usar camiseta argentina celeste y blanca.
Usar bandera argentina como capa en uno de los diseños.
Usar pelota de fútbol.
Usar copa dorada.
Puede incluir sol argentino decorativo.
Puede incluir tres estrellas decorativas arriba del escudo inspirado si se pide.
No usar marcas deportivas oficiales.

Reglas importantes:

No hacer collage separado en cuadrados.
No agregar almohadón si no fue pedido.
No agregar productos extra.
No repetir exactamente la misma pose en todos los productos.
No poner cuerpo humano.
No deformar la anatomía.
No agregar patas extra.
No cambiar la raza.
No hacer el diseño demasiado grande en la remera.
No tapar rasgos importantes de la mascota.
Mantener el área de impresión realista en cada producto.
La gorra debe ser un producto físico dentro del mockup, no puesta en la cabeza del perro salvo que se pida explícitamente.
El cuadro debe verse grande y claro.

Si hay más de una mascota:

Deben aparecer todas juntas en cada producto.
Respetar cuál es cada una según las fotos.
Mantener sus diferencias reales: color, tamaño, manchas, orejas, expresión, pelaje y proporciones.
No agregar mascotas que no estén en las fotos.
No eliminar mascotas.
No confundir los nombres.
El texto debe decir exactamente los nombres indicados por el cliente.

Resultado final:

Una imagen de preview premium, cálida y comercial, mostrando el kit completo personalizado de la mascota o mascotas como hinchas de Argentina, con todos los productos juntos en una sola escena.
```

**Template de uso por pedido (variables a completar por Make en cada ejecución):**

```text
Usar prompt maestro.
Nombre: [NOMBRE]
Mascota/s: [descripción breve]
Rasgos importantes a respetar: [manchas, color, ojos, orejas, tamaño, etc.]
Hacer kit completo hincha de Argentina con remera, tote, taza, cuadro y gorra.
```

El desarrollador debe armar el llamado a la API de forma que `[NOMBRE]` y `[Mascota/s]` se completen dinámicamente con los datos capturados en ManyChat (`nombre_mascota`, cantidad y descripción si está disponible).

### 4. Notificación y aprobación manual (Telegram)
1. Make envía la imagen generada a un bot de Telegram (a crear) con botones **Aprobar** / **Regenerar**
2. Este paso queda pausado (patrón "human-in-the-loop") hasta que Victoria responde — sin límite de tiempo fijo automático, pero con ventana esperada de 45 minutos a 1 hora
3. Si Victoria aprueba → continuar a paso 5
4. Si pide regenerar → permitir que mande un ajuste de texto corto (ej. "más luz", "cambiar fondo") y volver al paso 3 con el prompt modificado

### 5. Entrega del diseño al cliente
Make llama a la API de ManyChat (Send Content) para entregar la imagen aprobada al cliente, con marca de agua sutil (logo/firma CITRO en una esquina, a proveer por Victoria).

Mensaje: "¡Acá está tu diseño! Lo pinté especialmente para vos ¿Qué te parece? 🎨"

Actualizar estado en Airtable a `Enviado`.

### 6. Cierre de conversación (sin automatizar venta)
Después de la entrega, el bot manda un mensaje simple invitando a elegir productos, en texto libre (sin botones ni gallery automatizada):

"Si te encantó, contame qué productos te gustaría llevar! Tengo remeras, tazas, cuadros y kits con envío gratis 🎁"

**Importante: a partir de acá, el cierre de venta y el upsell los maneja Victoria personalmente por chat. No automatizar esta parte con botones de producto, catálogo dinámico, ni cálculo de descuento — es intencional, no una omisión.**

---

## Manejo de casos especiales (basado en comportamiento real de clientes)

### A. Cliente manda todo junto (foto + nombre + pedido en un solo mensaje)
No forzar el orden estricto paso a paso. El módulo de IA debe intentar extraer todos los datos posibles de un solo mensaje/secuencia de mensajes (foto, nombre, tipo de producto si lo menciona) y solo pedir lo que efectivamente falte. Si el cliente ya dio el nombre junto con la foto, no volver a preguntarlo.

### B. Límite de diseños gratis por cliente (control de abuso)
No hardcodear un límite fijo automático. Registrar en Airtable cuántos diseños gratis recibió cada `subscriber_id` históricamente. Si un cliente pide un segundo o tercer diseño gratis (mismo u otro subscriber_id pero mismo nombre/teléfono si es detectable), notificar a Victoria en el mensaje de aprobación de Telegram (ej: "⚠️ Este cliente ya recibió 2 diseños gratis anteriormente") para que ella decida caso por caso si aprobar o no. No bloquear automáticamente.

### C. Diseño rechazado por mala calidad de foto
Cuando Victoria rechaza un diseño (vía botón "Regenerar" o un nuevo botón "Rechazar - pedir otra foto"), debe dispararse automáticamente un mensaje al cliente, sin que Victoria tenga que escribirlo manualmente:

> "Tu diseño está casi listo, pero necesito que me mandes una foto un poco más clara para que quede perfecto 🐾 (de frente, con buena luz, sin flash)"

Esto vuelve a abrir el paso de captura de foto (Paso 3), reemplazando la `foto_mascota_url` guardada.

### D. Manejo de expectativas de horario
El mensaje de espera tras enviar la foto/nombre no debe sugerir inmediatez. Usar: "Tu diseño está en proceso, en las próximas horas te lo mando" en vez de frases que impliquen minutos. Esto evita ansiedad si Victoria no está disponible al momento (de noche, ocupada, etc.).

### E. Precio para múltiples mascotas — RESUELTO
El precio es el mismo sin importar la cantidad de mascotas incluidas en el diseño (hasta el máximo de 5 definido en el punto anterior). Ver tabla de precios completa más abajo.

### F. Bug crítico a evitar: repetición del mensaje de bienvenida
En el sistema manual actual, el mensaje largo de presentación ("¡Hola! Soy Victoria...") se reenvía completo varias veces dentro de la misma conversación cuando el cliente ya avanzó en el flujo. El nuevo bot NO debe repetir el mensaje de bienvenida a un `subscriber_id` que ya inició conversación — debe reconocer el estado de la conversación y continuar desde donde quedó, nunca reiniciar el saludo.

### G. Detección de casos sensibles (mascota fallecida)
Si el cliente menciona palabras/frases que indiquen que la mascota falleció (ej. "falleció", "murió", "ya no está", "en el cielo"), el sistema NO debe continuar con el tono estándar de ventas ni intentar seguir el guión normal de kits/precios. Debe derivar automáticamente a Victoria (notificación directa, sin intentar resolver por bot) para que ella responda personalmente con la sensibilidad que el caso requiere.

### H. Múltiples fotos o collage en un solo envío
Si el cliente manda una imagen tipo collage (varias fotos combinadas en un solo archivo) o varios adjuntos de una vez sin distinguir cuál mascota es cuál, el bot debe pedir aclaración: "Si tenés varias fotos, mandámelas una por una así elijo la mejor para el diseño 🐾" — no debe asumir automáticamente cuál foto usar como referencia.

### I. Talles y cantidades (para la Knowledge Base, no para automatizar)
Datos recurrentes que los clientes piden antes de comprar: talles disponibles de remeras/buzos, si se hacen talles especiales, y consultas de cantidad (ej. "quiero 2 remeras"). Como el cierre sigue siendo manual, esto no requiere lógica de flujo, pero la Knowledge Base debe incluir la tabla de talles disponibles para que la capa de IA conversacional pueda responder estas preguntas sin derivar todo a Victoria.

### J. Pregunta frecuente de confianza ("¿de qué zona sos?")
Patrón recurrente: clientes preguntan de dónde opera Victoria antes de comprar, buscando confirmar que hay una persona real detrás. Incluir en la Knowledge Base una respuesta fija: opera desde Buenos Aires, envíos a todo el país.

## Assets que Victoria va a proveer
- ~~Prompt maestro de estilo de ilustración~~ ✅ Ya incluido en este documento (versión Hincha de Argentina)
- ~~Tabla de precios~~ ✅ Ya incluida abajo
- ~~Logo/firma para marca de agua~~ ✅ Archivo adjunto: `Logo_CITRO_marca_de_agua.png` (línea negra, fondo transparente — @victoria.citro)

## Tabla de precios (Knowledge Base — versión Hincha de Argentina)

**Política de precio con múltiples mascotas: el precio es el mismo sin importar la cantidad de mascotas en el diseño (hasta el máximo de 5 definido).**

**Productos por separado:**
| Producto | Precio |
|---|---|
| Taza personalizada | $24.000 |
| Remera personalizada | $56.000 |
| Gorra personalizada | $29.000 |
| Cuadrito personalizado | $49.000 |
| Tote común personalizado | $38.000 |
| Tote premium personalizado | $49.000 |

**Kits (todos incluyen envío gratis a sucursal de Correo Argentino):**
| Kit | Incluye | Precio |
|---|---|---|
| Remera + Taza | Remera + taza | $75.000 |
| Kit Remera + Taza + Tote | Remera + taza + tote | $99.000 |
| Kit Remera + Taza + Cuadrito | Remera + taza + cuadrito | $125.000 |
| Kit Remera + Taza + Tote + Cuadrito | Remera + taza + tote + cuadrito | $145.000 |
| Kit FULL Mundial + Gorra | Remera + taza + tote + cuadrito + gorra | $169.000 |

Todos los diseños se personalizan con la foto de la mascota; se puede sumar nombre o frase especial sin costo adicional.
- Knowledge Base de precios, envíos, materiales y tiempos de entrega (texto/documento)
- Tabla de talles disponibles por producto (remeras, buzos) y política de talles especiales
- Ejemplos de conversaciones reales para calibrar el tono de las respuestas de IA (opcional, mejora la calidad)
- Credenciales: cuenta OpenAI con API key y crédito cargado, acceso a ManyChat (ya tiene cuenta), acceso a Airtable (ya tiene base)

## Fuera de alcance (explícitamente)
- Checkout o carrito dinámico dentro del chat — el cierre de venta sigue siendo manual (link de Tiendanube o alias de Mercado Pago que Victoria arma y envía ella misma)
- Cálculo automático de kits/descuentos — Victoria lo negocia manualmente en la conversación
- Fine-tuning o entrenamiento custom de modelo de IA — no está en esta fase

## Estimado de costo operativo (aparte del desarrollo)
- OpenAI API (imágenes + texto): estimado $5-25/mes según volumen (200-500 conversaciones/mes)
- Sin costos adicionales de ManyChat AI Step (no se usa)
