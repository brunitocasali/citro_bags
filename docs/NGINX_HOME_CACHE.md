# Caché de la home en Nginx

Si `dist/index.html` ya es nuevo pero el navegador sigue mostrando la home vieja, suele ser **caché del HTML** en el cliente o en un proxy (Cloudflare, etc.).

## Nginx: no cachear el `index.html` de la raíz

Dentro del bloque `server { ... }` (después de `root` o en un `location` adecuado):

```nginx
location = /index.html {
    add_header Cache-Control "no-store, no-cache, must-revalidate" always;
    add_header Pragma "no-cache" always;
}
```

Para la raíz `/` que resuelve a `index.html`:

```nginx
location = / {
    add_header Cache-Control "no-store, no-cache, must-revalidate" always;
}
```

Luego: `sudo nginx -t` y `sudo systemctl reload nginx`.

Si usás **Cloudflare**: purgá caché para la URL del sitio o regla “Development mode” un rato.

## Comprobar qué devuelve el servidor (sin caché del navegador)

```bash
curl -sI https://TU_DOMINIO/ | grep -i cache
curl -s https://TU_DOMINIO/ | head -5
```
