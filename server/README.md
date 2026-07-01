# Backend de pagos y entrega de ebooks — Victoria Citro

Servicio Node/Express que:

1. Crea el checkout de **Mercado Pago** (Checkout Pro).
2. Recibe el **webhook**, **verifica el pago contra la API de MP** y recién ahí libera la descarga.
3. Entrega los PDFs con **links firmados y temporales** (nadie descarga sin pagar).
4. Guarda un **historial de ventas** (SQLite) con **reporte contable + export CSV**.

> Los PDFs viven en `../private-ebooks/` (fuera del sitio público y fuera de git).
> Los precios se editan en `../src/data/ebookProducts.json` (mismo catálogo que usa la web).

---

## 1) Configuración

```bash
cd server
cp .env.example .env     # y completá los valores
npm install
```

Variables clave (ver `.env.example`):

| Variable | Qué es |
|---|---|
| `MP_ACCESS_TOKEN` | **Secreto**. Token de Mercado Pago (TEST para probar, PROD para cobrar real). |
| `MP_PUBLIC_KEY` | Clave pública (no secreta). |
| `SITE_URL` | URL del sitio (front). Dev: `http://localhost:4321`. Prod: `https://victoriacitro.net`. |
| `API_URL` | URL pública de **este** backend (webhook + descargas). Dev: la URL del túnel. Prod: `https://victoriacitro.net`. |
| `DOWNLOAD_SECRET` | Secreto para firmar descargas. Generalo con: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `ADMIN_USER` / `ADMIN_PASS` | Acceso al panel `/admin`. |

---

## 2) Desarrollo local

```bash
npm run dev        # levanta en http://localhost:4000 (con auto-recarga)
```

- La web (Astro) corre en `http://localhost:4321` y llama a `http://localhost:4000` automáticamente.
- Para probar SIN cobrar de verdad, usá **credenciales de TEST** y las [tarjetas de prueba de MP](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/additional-content/test-cards).

### Probar el webhook en local (túnel)

Mercado Pago necesita una URL **pública** para avisar del pago. En local se usa un túnel:

```bash
# opción A: ngrok
ngrok http 4000
# opción B: cloudflared
cloudflared tunnel --url http://localhost:4000
```

Copiá la URL pública (ej. `https://abcd.ngrok-free.app`) y ponela en `.env` como `API_URL`. Reiniciá el backend.
Para que MP pueda redirigir al final, poné esa misma URL (o el dominio real) también como `SITE_URL` si querés probar la pantalla `/gracias`.

---

## 3) Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/checkout` | `{ items: string[], email }` → crea la orden + preferencia MP. Devuelve `{ orderId, initPoint }`. |
| GET/POST | `/api/mp/webhook` | Notificaciones de MP. Verifica el pago y actualiza la orden. |
| GET | `/api/order/:id` | Estado de la orden + links de descarga si está aprobada. |
| GET | `/api/download/:token` | Descarga protegida (token firmado + verificación en BD). |
| GET | `/admin` | Panel de ventas (usuario/clave). |
| GET | `/admin/sales.csv` | Export contable para el contador. |

---

## 4) Puesta en producción (VPS con nginx)

1. Subí el código y los PDFs a `private-ebooks/` en el servidor. `npm install --omit=dev` en `server/`.
2. `.env` de producción: `MP_ACCESS_TOKEN` (prod), `SITE_URL=https://victoriacitro.net`, `API_URL=https://victoriacitro.net`.
3. Corré el backend como servicio (systemd o `pm2 start src/server.mjs --name ebooks`).
4. En nginx, proxy de `/api` y `/admin` hacia el backend:

```nginx
location /api/   { proxy_pass http://127.0.0.1:4000; proxy_set_header Host $host; proxy_set_header X-Forwarded-For $remote_addr; }
location /admin  { proxy_pass http://127.0.0.1:4000; proxy_set_header Host $host; }
```

5. En Mercado Pago → tu aplicación → **Webhooks**, configurá la URL: `https://victoriacitro.net/api/mp/webhook` (evento *Pagos*).
6. Para activar el checkout propio en la web, cambiá `checkoutUrl` en `src/data/ebookLanding.ts` a `'/comprar'` y volvé a hacer `npm run build` del sitio.

---

## 5) Backups

- Historial de ventas: `server/data/sales.db` (copialo periódicamente).
- Es SQLite: un solo archivo. Se puede abrir con DB Browser for SQLite.
