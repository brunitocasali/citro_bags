import 'dotenv/config';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..', '..');

function required(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`[config] Falta la variable de entorno ${name}. Revisá server/.env (usá .env.example de guía).`);
  }
  return v ?? '';
}

export const config = {
  port: Number(process.env.PORT ?? 3000),

  // Credenciales Mercado Pago (PRODUCCIÓN o TEST). NUNCA committear.
  mpAccessToken: required('MP_ACCESS_TOKEN'),
  mpPublicKey: process.env.MP_PUBLIC_KEY ?? '',

  // URL pública del SITIO (front estático). Se usa en las back_urls del checkout.
  siteUrl: (process.env.SITE_URL ?? 'http://localhost:4321').replace(/\/$/, ''),

  // URL pública de ESTE backend (para webhook y links de descarga).
  // En producción suele ser el mismo dominio (nginx proxya /api). En local, la URL del túnel (ngrok).
  apiUrl: (process.env.API_URL ?? 'http://localhost:3000').replace(/\/$/, ''),

  // Secreto para firmar los links de descarga (HMAC). Debe ser largo y aleatorio.
  downloadSecret: required('DOWNLOAD_SECRET'),
  downloadTtlHours: Number(process.env.DOWNLOAD_TTL_HOURS ?? 72),
  // Los links que van por email duran más (la gente abre el mail más tarde).
  emailDownloadTtlHours: Number(process.env.EMAIL_DOWNLOAD_TTL_HOURS ?? 24 * 30),

  // Envío de emails (Resend). Si falta la API key, se omite el envío (la descarga en pantalla sigue funcionando).
  resendApiKey: process.env.RESEND_API_KEY ?? '',
  mailFrom: process.env.MAIL_FROM ?? 'Victoria Citro <onboarding@resend.dev>',
  mailReplyTo: process.env.MAIL_REPLY_TO ?? '',
  brandName: process.env.BRAND_NAME ?? 'Victoria Citro',

  // Carpeta privada con los PDFs (fuera del sitio público).
  privateEbooksDir: process.env.PRIVATE_EBOOKS_DIR
    ? resolve(process.env.PRIVATE_EBOOKS_DIR)
    : join(repoRoot, 'private-ebooks'),

  // Base de datos SQLite (historial de ventas).
  dbPath: process.env.DB_PATH ? resolve(process.env.DB_PATH) : join(__dirname, '..', 'data', 'sales.db'),

  // Acceso al panel de reportes.
  adminUser: process.env.ADMIN_USER ?? 'admin',
  adminPass: required('ADMIN_PASS'),

  currency: process.env.CURRENCY ?? 'ARS',
  catalogPath: join(repoRoot, 'src', 'data', 'ebookProducts.json'),
};
