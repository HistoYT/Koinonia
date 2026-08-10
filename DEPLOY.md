# Publicar el sitio (Cloudflare Worker: sitio + chat IA + Escuela de LideresVIP)

Tu proyecto es un **Cloudflare Worker** con Static Assets. Un mismo Worker sirve:

- El sitio público de Koinonía (`/`).
- El chat con IA (`POST /api/chat`, Workers AI — sin API key de Anthropic/Claude).
- La **Escuela de LideresVIP** (`/LideresVIP`), un LMS en construcción con su propia API (`/api/lms/*`) y base de datos (Cloudflare D1).

## Estructura del proyecto

```
wrangler.jsonc          ← config del Worker (entry point, assets, bindings AI + DB)
package.json             ← dependencias (Hono, Drizzle, React, Vite, Tailwind...)
worker/
  index.ts                ← entrypoint: monta /api/chat, /api/lms/*, y sirve el resto como assets
  routes/chat.ts           ← lógica del chat (igual que antes, sin cambios de comportamiento)
  routes/lms/               ← rutas del LMS (hoy solo /api/lms/health; se irán agregando más)
  db/schema.ts              ← esquema completo de la base de datos del LMS (Drizzle)
migrations/               ← migraciones SQL generadas del esquema (D1)
lms-frontend/              ← código fuente React+TS+Tailwind de la Escuela de LideresVIP
public/
  index.html, *.css, *.js  ← sitio público (sin cambios)
  LideresVIP/                ← build compilado del LMS (generado por `npm run build:lms`)
  assets/                    ← imágenes (incluye el logo de LideresVIP)
```

## 1. Activa los bindings en Cloudflare

`wrangler.jsonc` ya declara ambos bindings, pero confírmalos en el dashboard:

1. Ve a **Workers & Pages → tu proyecto (Worker) → Settings → Bindings**.
2. Debe aparecer **Workers AI** con variable `AI` (ya lo tenías del chat).
3. Debe aparecer **D1 Database** con variable `DB`. Si no aparece, sigue el paso 2 primero.

## 2. Crear la base de datos D1 (nuevo — para la Escuela de LideresVIP)

```bash
npx wrangler login                        # si no lo has hecho antes
npx wrangler d1 create koinonia-lms-db
```

Copia el `database_id` que te devuelve y pégalo en `wrangler.jsonc`, reemplazando `"REEMPLAZAR_CON_TU_DATABASE_ID"`.

Luego aplica las migraciones (crea las tablas reales):

```bash
npm run db:migrate:local     # para tu copia local (wrangler dev)
npm run db:migrate:remote    # para la base de datos real en Cloudflare
```

## 3. Compilar el frontend del LMS antes de desplegar

A diferencia del sitio principal (HTML/CSS/JS planos, sin build), la Escuela de LideresVIP usa React y necesita compilarse:

```bash
npm install
npm run build:lms
```

Esto genera los archivos dentro de `public/LideresVIP/` — **ya están compilados y listos** en este momento, así que tu flujo de deploy actual (`npx wrangler deploy` disparado por Cloudflare al hacer push) funcionará sin cambios adicionales para esta primera versión.

**Para cuando vuelvas a modificar la Escuela de LideresVIP más adelante**, tienes dos opciones:
- Simple: corre `npm run build:lms` localmente antes de cada `git push` (así el build compilado siempre queda incluido en el commit).
- Recomendado a mediano plazo: en el dashboard de Cloudflare, **Settings → Builds**, configura el **Deploy command** como `npm run deploy` (que ya incluye el build) en vez de `npx wrangler deploy` solo — así Cloudflare compila automáticamente en cada push.

## 3.5. Configurar el secreto de sesión (nuevo — necesario para que el login funcione)

Las sesiones de la Escuela de LideresVIP usan un JWT firmado con `JWT_SECRET`. En producción:

```bash
npx wrangler secret put JWT_SECRET
```

Te pedirá pegar un valor — usa algo largo y aleatorio (por ejemplo, generado con `openssl rand -hex 32`). **Sin este secreto configurado en Cloudflare, el registro y el login fallarán en producción** aunque localmente sí funcionen (localmente usan el archivo `.dev.vars`, que nunca se sube a git).

## 4. Despliega

**Si tu Worker está conectado a GitHub (Workers Builds):**

```bash
git add .
git commit -m "Agregar Escuela de LideresVIP (LMS) al Worker de Koinonía"
git push
```

**Si prefieres desplegar directo desde tu computador:**

```bash
npm run deploy
```

## 5. Prueba

- Sitio principal y chat: sin cambios, deberían funcionar igual que antes.
- Escuela de LideresVIP: abre `https://tu-dominio/LideresVIP` — deberías ver la página con el logo, y el indicador de estado debe decir "✓ Backend y base de datos conectados correctamente" (si dice lo contrario, revisa que el `database_id` en `wrangler.jsonc` sea el real, no el placeholder).

## Notas de costo y seguridad

- Sin API keys que proteger: `AI` y `DB` son bindings nativos de Cloudflare.
- D1 y Workers AI tienen niveles gratuitos generosos — para el volumen de una iglesia, no deberías pagar nada extra por esto.
- El esquema de base de datos ya tiene las 11 tablas necesarias para el LMS completo (usuarios, cursos, módulos, lecciones, talleres, inscripciones, progreso, pagos, certificados).
- **Fase 2 completada**: registro, login, logout y sesiones reales (contraseñas con hashing PBKDF2, JWT en cookie httpOnly). El primer usuario que se registre queda automáticamente como administrador; los siguientes quedan como estudiantes.
- **Todavía no implementado** (próximas fases): catálogo de cursos, inscripciones, pagos manuales, progreso, panel de administración.
