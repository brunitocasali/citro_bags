# Guía Paso a Paso — Implementación CITRO Arte (para hacerlo vos misma)

Esta guía asume que no tenés experiencia técnica previa en Make ni en APIs. Andá paso por paso, sin saltear. Si ya tenés algo hecho (ej. cuenta de Airtable), pasá al siguiente paso.

---

## FASE 1: Cuentas y accesos (antes de tocar nada del flow)

### Paso 1.1 — Cuenta de OpenAI (para generar imágenes y texto con IA)
1. Andá a platform.openai.com
2. Creá una cuenta (o iniciá sesión si ya tenés una de ChatGPT — es la misma cuenta pero necesitás activar la parte de "API" por separado)
3. Andá a la sección **"Billing"** (facturación) y cargá crédito. Con $20 USD arrancás sobrado para varios meses según tu volumen
4. Andá a **"API Keys"** → **"Create new secret key"**
5. Copiá esa key y guardala en un lugar seguro (una nota, un gestor de contraseñas). **No se vuelve a mostrar completa después**, así que si la perdés hay que crear una nueva

### Paso 1.2 — Bot de Telegram (para que te lleguen las notificaciones de aprobación)
1. Abrí Telegram (app o web)
2. Buscá el usuario **@BotFather** (es el bot oficial de Telegram para crear bots)
3. Escribile `/newbot`
4. Te va a pedir un nombre para el bot (ej: "CITRO Aprobaciones") y un username único que termine en "bot" (ej: "citro_aprobaciones_bot")
5. BotFather te va a dar un **token** (una cadena larga de letras y números) — guardalo, lo vas a necesitar en Make
6. Buscá tu propio bot recién creado en Telegram y tocá "Iniciar" / "Start" para activar la conversación (si no hacés esto, el bot no te puede mandar mensajes)

### Paso 1.3 — Verificar accesos existentes
Ya tenés esto de antes, solo confirmá que funcionan:
- ManyChat: cuenta activa conectada a tu Instagram
- Make.com: cuenta activa
- Airtable: base de datos ya creada

---

## FASE 2: Configurar Airtable (la base de datos de pedidos)

### Paso 2.1 — Crear (o revisar) la tabla de pedidos
Si no la tenés, creá una tabla nueva en tu base de Airtable llamada "Pedidos CITRO" con estas columnas:

| Columna | Tipo de campo |
|---|---|
| subscriber_id | Texto |
| nombre_cliente | Texto |
| nombre_mascota | Texto |
| cantidad_mascotas | Número |
| foto_original_url | URL |
| diseño_generado_url | URL |
| estado | Selección única (opciones: "Pendiente de aprobación", "Aprobado", "Rechazado", "Enviado") |
| fecha_creacion | Fecha |
| diseños_previos_cliente | Número (para controlar el límite de diseños gratis) |

### Paso 2.2 — Obtener las credenciales de Airtable para Make
1. Andá a airtable.com/create/tokens
2. Creá un "Personal Access Token" con permisos de lectura y escritura sobre tu base
3. Guardá ese token, lo vas a pegar en Make más adelante

---

## FASE 3: Configurar el bot en ManyChat

### Paso 3.1 — Crear los Custom Fields (campos personalizados)
En ManyChat: Settings → Custom Fields → New Field. Creá estos:
- `cantidad_mascotas` (tipo: Text)
- `foto_mascota_url` (tipo: Text)
- `nombre_mascota` (tipo: Text)
- `intentos_foto` (tipo: Number)
- `diseños_previos` (tipo: Number)

### Paso 3.2 — Armar el flow visual (Automation)
Andá a Automation → Flows → crear uno nuevo. Armá los bloques EN ESTE ORDEN, según el documento "Flujo_CITRO_ManyChat_Completo":

1. **Content block** con el mensaje de apertura + botón "Sí, quiero ver"
2. **Content block** con la pregunta "¿una o varias mascotas?" + botones
3. Guardar respuesta en `cantidad_mascotas`
4. **Content block** pidiendo la foto
5. **User Input** → Save Response As: **Image** → guardar en `foto_mascota_url`
6. **Condition**: si `foto_mascota_url` está vacío → volver al paso 4 (con contador `intentos_foto`)
7. **Content block** pidiendo el nombre
8. **User Input** → guardar en `nombre_mascota` (este paso se conecta después con la IA, ver Fase 4)
9. **External Request / Webhook** → esto dispara todo lo que armamos en Make (Fase 4)

No te preocupes si esto te lleva varias horas la primera vez armándolo con el mouse, bloque por bloque — es normal, es la parte más manual de todo el proceso.

### Paso 3.3 — Configurar el Webhook hacia Make
En el bloque de "External Request" (o "Webhook"):
1. Vas a necesitar la URL del webhook — esto te lo va a dar Make cuando armes el escenario (Fase 4, Paso 4.1)
2. Método: POST
3. Body: incluir `foto_mascota_url`, `nombre_mascota`, `cantidad_mascotas`, `subscriber_id` (este último ManyChat lo da automático como variable del sistema)

---

## FASE 4: Configurar Make.com (el cerebro que conecta todo)

### Paso 4.1 — Crear el escenario (Scenario) y obtener la URL del webhook
1. En Make, andá a "Scenarios" → "Create a new scenario"
2. Buscá el módulo **"Webhooks"** → **"Custom webhook"** → creá uno nuevo
3. Make te va a dar una URL única — copiala y pegala en ManyChat (Paso 3.3)
4. Este primer módulo va a recibir los datos que manda ManyChat (foto, nombre, cantidad, subscriber_id)

### Paso 4.2 — Módulo de generación de imagen (OpenAI)
1. Agregá un módulo nuevo: **HTTP → Make a request**
2. URL: `https://api.openai.com/v1/images/generations` (confirmá el endpoint exacto según el modelo que uses, puede variar)
3. Método: POST
4. Headers: `Authorization: Bearer TU_API_KEY_DE_OPENAI` (la que guardaste en el Paso 1.1)
5. En el Body, pegá el prompt maestro completo (el de "Kit Hincha de Argentina" que ya tenés armado) + la variable de la foto que viene del webhook

### Paso 4.3 — Guardar en Airtable
1. Agregá un módulo: **Airtable → Create a record**
2. Conectá tu cuenta con el token del Paso 2.2
3. Seleccioná tu tabla "Pedidos CITRO"
4. Mapeá cada campo: `subscriber_id`, `nombre_mascota`, `foto_original_url` (la que llegó del webhook), `diseño_generado_url` (la que devolvió OpenAI), `estado` = "Pendiente de aprobación"

### Paso 4.4 — Notificación a Telegram
1. Agregá un módulo: **Telegram Bot → Send a Photo**
2. Conectá con el token del bot que creaste en el Paso 1.2
3. Chat ID: el tuyo (Telegram te lo puede dar buscando @userinfobot y escribiéndole, te devuelve tu ID numérico)
4. Adjuntá la imagen generada por OpenAI
5. Agregá botones "Aprobar" / "Regenerar" (esto requiere un módulo adicional de "Telegram → Send a message with buttons" si tu plan de Make lo permite; si no, podés arrancar simple pidiéndote que respondas con la palabra "aprobar" o "regenerar")

### Paso 4.5 — Pausar el escenario hasta tu respuesta (human-in-the-loop)
1. Agregá un módulo: **Webhooks → Wait for a webhook response** (o similar, según la versión de Make)
2. Esto pausa el escenario hasta que vos respondas en Telegram
3. Cuando respondés "aprobar", Make continúa al siguiente paso

### Paso 4.6 — Enviar el diseño aprobado al cliente
1. Agregá un módulo: **HTTP → Make a request** hacia la API de ManyChat (Send Content)
2. Necesitás tu API Key de ManyChat (Settings → API en ManyChat)
3. Mandá la imagen + el mensaje "¡Acá está tu diseño! Lo pinté especialmente para vos ¿Qué te parece? 🎨"
4. Actualizá el registro en Airtable a estado "Enviado" (módulo **Airtable → Update a record**)

---

## FASE 5: Pruebas antes de lanzar

### Paso 5.1 — Prueba interna
1. Escribile al bot vos misma desde otra cuenta de Instagram (o pedile a alguien de confianza)
2. Seguí todo el flow hasta el final
3. Fijate que: la foto se guarde bien, el nombre se pida correctamente, la notificación te llegue a Telegram, y que al aprobar el cliente reciba el diseño

### Paso 5.2 — Prueba con casos raros
Probá a propósito:
- Mandar texto en vez de foto (¿el bot lo rechaza bien?)
- Preguntar "cuánto sale" en el paso del nombre (¿responde y vuelve a pedir el nombre?)
- Mandar una foto borrosa (¿podés rechazarla y se lo comunica bien al cliente?)

### Paso 5.3 — Lanzamiento
Una vez que las pruebas salen bien, el flow ya puede quedar activo recibiendo clientes reales. Arrancá con bajo volumen los primeros días y prestá atención a los mensajes de Telegram para asegurarte de que todo fluye bien antes de despreocuparte del todo.

---

## Notas finales

- Esto te va a llevar varias horas (probablemente varios días si es tu primera vez usando Make) — es normal, no significa que estés haciendo algo mal
- Si en algún paso te trabás, contame en qué parte específica estás y seguimos afinando juntos
- Guardá en un lugar seguro: API Key de OpenAI, token del bot de Telegram, token de Airtable — son las "llaves" de todo el sistema
