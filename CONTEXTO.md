# Contexto del proyecto — Landing + venta del ebook "Cuando a los ángeles les devuelven las alas"

> Documento para ponerte al día: qué es esto, qué construimos, cómo se corre y qué falta hacer.
> Está pensado para leer desde Cursor y arrancar sin vueltas.

---

## 0. ⭐ EMPEZÁ POR ACÁ (si NO sabés programar)

Tranqui: **no hace falta saber programar**. Lo más importante es entender esto:

> 💬 **El truco:** en Cursor tenés un asistente de inteligencia artificial (el panel de chat de la derecha).
> Le escribís en español lo que querés y **él hace el trabajo por vos**. No tenés que escribir código.

### Cómo pedirle cosas a Cursor
1. Abrí el proyecto en Cursor (Bruno te pasa la carpeta o el link de GitHub).
2. En el panel de chat de la derecha, escribí lo que necesitás, como si le hablaras a una persona. Ejemplos:
   - *"Levantá el sitio para verlo en el navegador."*
   - *"Cambiá el precio del ebook principal a 18.990."*
   - *"Cambiá la foto de la autora por esta"* (y le arrastrás la foto al chat).
   - *"Cambiá el link de Instagram por @victoriacitro."*
3. Cursor te muestra qué va a cambiar; vos le decís que sí. Listo.

👉 **Si algo no te sale, copiá y pegá este archivo (CONTEXTO.md) en el chat y pedile ayuda.** El asistente ya entiende todo el proyecto.

### ✅ Tu checklist (todo lo que tenés que hacer)

Marcá a medida que avances:

- [ ] **1. Abrir el proyecto en Cursor** (te lo pasa Bruno).
- [ ] **2. Pedirle al chat de Cursor:** *"Instalá todo lo necesario para correr este proyecto."* (Él corre los comandos; vos solo aceptás.)
- [ ] **3. Pedirle:** *"Levantá el sitio y el servidor de pagos para poder verlo."* Después abrís **http://localhost:4321/ebooks** en el navegador.
- [ ] **4. Cuenta de Resend (para los emails):** entrá a [resend.com](https://resend.com), creá la cuenta, generá una **API Key** y **verificá el dominio** `victoriacitro.net`. (Guía visual: hay tutoriales en YouTube "Resend verify domain".) Cuando tengas la API Key, pegásela a Bruno o pedile al chat de Cursor: *"Guardá esta API Key de Resend en la configuración."*
- [ ] **5. Revisar el contenido** de la página (textos, precios, fotos, testimonios, link de Instagram) y pedirle a Cursor los cambios que quieras.
- [ ] **6. Avisarle a Bruno** cuando esté todo revisado, para publicarlo (deploy).

### 🙅 Qué NO tenés que hacer
- No tenés que escribir código a mano.
- No borres carpetas ni archivos "porque sí". Si dudás, preguntале al chat.
- No compartas contraseñas ni claves (las del archivo `.env`) por chat público ni redes.

### 🆘 Si algo se rompe
Escribíle al chat de Cursor: *"Me salió este error: (pegás el error). ¿Cómo lo arreglo?"*. Y si no, le mandás captura a Bruno. **Nada se rompe para siempre**, siempre se puede volver atrás.

---

> El resto del documento (secciones 1 a 8) es más técnico. **No hace falta que lo entiendas todo**: está para el asistente de Curso y para Bruno. Podés leerlo por arriba para tener una idea general.

---

## 1. Qué es este proyecto

Es el sitio web de **Victoria Citro** (arte + bolsos pintados a mano) hecho con **Astro**.
Dentro vive la **landing de venta del ebook de duelo de mascotas** ("Cuando a los ángeles les devuelven las alas") con **checkout propio por Mercado Pago** y **entrega automática del PDF**.

Hay **dos partes**:

| Parte | Carpeta | Qué hace |
|---|---|---|
| **Frontend (web)** | raíz del repo (`src/`, `ebooks/`, `public/`) | La página que ve el cliente: landing + carrito `/comprar` + `/gracias`. |
| **Backend (pagos)** | `server/` | Node.js/Express: crea el pago en Mercado Pago, confirma que se pagó y libera la descarga + manda el email. |

---

## 2. Qué venimos construyendo (ya está hecho)

- **Landing del ebook** (`/ebooks`) con secciones nuevas: secuencia emocional (imágenes), testimonios, "Conocé a la autora" (con foto real de Victoria), FAQ, precio y garantía.
- **Precios editables** desde un solo lugar (no más precios "hardcodeados"). → ver punto 5.
- **Carrito `/comprar`** replicando el estilo de la tienda anterior (Impultienda):
  - Ebook principal **AR$ 16.990**.
  - **3 bonos gratis** incluidos (Rituales, Guía para la carta, El Libro de su vida).
  - **2 complementos opcionales (order bumps) con –50%**: "El Libro de Su Vida – Edición Gatos" (AR$ 2.990) y "Memoria viva" (AR$ 4.990).
  - Miniaturas de cada ebook y total que se actualiza solo.
- **Checkout con Mercado Pago (Checkout Pro):** el backend crea la preferencia de pago y redirige.
- **Confirmación segura del pago:** por *webhook* de Mercado Pago; nunca confiamos en el cliente.
- **Entrega del PDF:**
  1. **En pantalla** (`/gracias`): links de descarga apenas se aprueba el pago.
  2. **Por email** (con **Resend**): mail de respaldo con los mismos links (para volver a descargar más tarde).
  - Los links son **firmados y temporales**, y al descargar se re-verifica que el pago esté aprobado. Nadie puede robarse el PDF.
- **Historial de ventas / reporte contable:** panel protegido en `/admin` (con usuario y contraseña) + export CSV.
- **Seguridad:** los PDF pagos viven en `private-ebooks/` (fuera del sitio público) y las credenciales en `server/.env`. **Nada de eso se sube a git.**

---

## 3. Cómo correrlo en tu compu (paso a paso)

Necesitás **Node.js 18+** instalado.

### 3.1. Traer el proyecto
```bash
git clone https://github.com/brunitocasali/citro_bags.git
cd citro_bags
```
(Si ya lo tenés, hacé `git pull` para bajar lo último.)

### 3.2. Instalar dependencias
```bash
npm install
cd server
npm install
cd ..
```

### 3.3. Configurar los secretos del backend
- Copiá `server/.env.example` a `server/.env`.
- Completá los valores (Mercado Pago, Resend, contraseña del panel). Ver punto 4.
- **Importante:** `server/.env` NO se sube a git (tiene los secretos). Es normal que no aparezca en el repo; hay que crearlo en cada compu.

> ⚠️ Los PDFs de los ebooks tampoco están en git (son contenido pago). Van en la carpeta `private-ebooks/` en la raíz. Pedíselos a Bruno y copialos ahí con estos nombres: `angeles-alas.pdf`, `rituales.pdf`, `guia-carta.pdf`, `libro-de-su-vida.pdf`, `libro-de-su-vida-gatos.pdf`, `memoria-viva.pdf`.

### 3.4. Levantar todo (2 terminales)
```bash
# Terminal 1 — la web
npm run dev
# queda en http://localhost:4321

# Terminal 2 — el backend de pagos
cd server
npm start
# queda en http://localhost:4000
```

Abrí **http://localhost:4321/ebooks** para ver la landing y **/comprar** para el carrito.

---

## 4. Variables del backend (`server/.env`)

| Variable | Qué es | Estado |
|---|---|---|
| `MP_ACCESS_TOKEN` / `MP_PUBLIC_KEY` | Credenciales de Mercado Pago | ✅ Ya cargadas (producción) |
| `DOWNLOAD_SECRET` | Clave para firmar los links de descarga | ✅ Ya generada |
| `ADMIN_USER` / `ADMIN_PASS` | Acceso al panel `/admin` | ✅ Ya cargadas |
| `RESEND_API_KEY` | API key para enviar emails (Resend) | ⏳ **Falta pegarla** |
| `MAIL_FROM` | Remitente del email | ⏳ Ajustar al verificar dominio |

---

## 5. Cómo cambiar precios / textos (lo más común)

- **Precios y productos:** `src/data/ebookProducts.json`
  - `priceArs` = precio del principal.
  - `upsellPriceArs` = precio con descuento de los complementos.
  - `regularPriceArs` = precio "tachado" que se muestra.
  - Este archivo lo usan **la web Y el backend**, así que el precio nunca queda desincronizado.
- **Textos de la landing / botones / garantía:** `src/data/ebookLanding.ts`
- **Contenido de la página (secciones):** `ebooks/index.html`
- **Foto de la autora:** reemplazar `public/ebook/victoria.jpg` por la que quieras (mismo nombre).
- **Link de Instagram:** buscar `instagram.com/victoriacitro` en `ebooks/index.html` y poner el usuario real.

Después de cambiar algo, con `npm run dev` corriendo se ve al instante.

---

## 6. Lo que FALTA hacer (pendientes)

1. **Resend (emails):**
   - Terminar de crear la cuenta en [resend.com](https://resend.com) (Bruno la está haciendo).
   - Generar la **API key** y pegarla en `server/.env` → `RESEND_API_KEY=`.
   - **Verificar el dominio** `victoriacitro.net` en Resend y poner `MAIL_FROM=Victoria Citro <hola@victoriacitro.net>` (esto evita que el mail caiga en spam).
2. **Probar el flujo completo de pago + email.** Ojo: la confirmación del pago llega por *webhook* de Mercado Pago, que necesita una **URL pública**. En `localhost` no llega. Opciones:
   - En desarrollo: usar un túnel (**ngrok** o **cloudflared**) y poner esa URL en `API_URL` del `.env`.
   - En producción: el dominio real.
3. **Deploy** del sitio + backend en el servidor (hay guía en `server/README.md`).
4. **Revisar textos/fotos finales** con Victoria (foto autora, testimonios, link de Instagram).

---

## 7. Reglas de oro (seguridad)

- ❌ **Nunca** subir `server/.env`, los PDFs de `private-ebooks/`, ni la base `server/data/`. Ya están en `.gitignore`.
- ❌ No pegar tokens/claves en el código ni en chats públicos.
- ✅ Si algún token se filtró alguna vez, **regenerarlo** en Mercado Pago / Resend.

---

## 8. Mapa rápido de archivos

```
citro_bags/
├─ src/
│  ├─ pages/ebooks/index.astro   # arma la landing
│  ├─ pages/comprar.astro        # CARRITO
│  ├─ pages/gracias.astro        # post-pago (descargas)
│  └─ data/
│     ├─ ebookProducts.json      # ← PRECIOS Y PRODUCTOS
│     ├─ ebookProducts.ts        # helpers del catálogo
│     └─ ebookLanding.ts         # textos/CTA de la landing
├─ ebooks/index.html             # contenido HTML de la landing
├─ public/ebook/                 # imágenes (portadas, secuencia, autora)
├─ private-ebooks/               # PDFs pagos (NO en git)
└─ server/                       # BACKEND de pagos
   ├─ src/server.mjs             # rutas de la API
   ├─ src/mp.mjs                 # Mercado Pago
   ├─ src/mail.mjs               # emails (Resend)
   ├─ src/db.mjs                 # base de ventas (SQLite)
   ├─ .env                       # secretos (NO en git) ← hay que crearlo
   └─ README.md                  # guía de deploy y dev
```

¿Dudas? Está todo explicado con más detalle técnico en `server/README.md`.
