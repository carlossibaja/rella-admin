# Rella Admin

Panel interno del equipo de Rella para administrar RellaChat: empresas y su estado de suscripción, extensión de vencimientos, altas e ingresos (suscripciones + ganancia de IA).

Consume el módulo `/api/staff/*` de `rellashop-api`, con login propio (correo + contraseña y verificación en dos pasos opcional).

## Requisitos

- Node.js 20+ y npm
- `rellashop-api` corriendo (por defecto en `http://localhost:8000`)

## Configuración

```bash
cp .env.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:8000/api
npm install
npm run dev                  # http://localhost:3001
```

La API debe permitir el origen `http://localhost:3001` en `config/cors.php` (`allowed_origins`).

## Primer usuario de staff

Los usuarios de staff no son usuarios de empresas. Se crean desde la API:

```bash
cd ../rellashop-api
php artisan staff:create
```

Luego activa la verificación en dos pasos desde **Seguridad** en el panel.

## Scripts

| Comando | Uso |
| --- | --- |
| `npm run dev` | Desarrollo en el puerto 3001 |
| `npm run build` / `npm start` | Build y servidor de producción (puerto 3001) |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Verificación de tipos |

## Estructura

- `src/lib/api/*` — llamadas y tipos de la API (`auth`, `organizations`, `metrics`).
- `src/app/login` — login con paso de código de 6 dígitos.
- `src/app/(app)` — páginas protegidas: Dashboard, Empresas, Altas, Ingresos, Seguridad.
- `src/components/ui` — componentes de shadcn/ui.
