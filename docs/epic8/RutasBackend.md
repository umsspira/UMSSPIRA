# Rutas Backend · Épica 8 (Offline PWA y Service Worker)

Corte: rama `epic8` al 14/11/2026 (commit `87f7249f`).

## Resultado

**La Épica 8 no agregó ni modificó rutas del backend.** No hay cambios en `apps/api/` ni en `packages/` en lo fusionado a `epic8` hasta hoy. Todo el trabajo offline se hizo en `apps/web/`: Service Worker, IndexedDB y pantallas.

## Rutas del backend que usa la épica (existentes, de otros equipos)

Prefijo de todas: `/api/v1`.

| Método y ruta | Controlador (en `apps/api/src/modules/`) | Lo usa | HU |
|---|---|---|---|
| `GET /registrations/my-passes` | `events/http/event-passes.controller.ts` | `/mis-pases`: se piden los pases y se guardan en el dispositivo; la sincronización los vuelve a pedir. | HU02, HU03 |
| `GET /events/catalog` | `events/http/controllers/get-event-catalog.controller.ts` | `events-service.ts`: el catálogo público se guarda para verlo sin conexión. | HU04 |
| `POST /auth/refresh` | `auth/http/controllers/refresh-session.controller.ts` | `auth-session.ts`: renueva la sesión; el token nuevo registra la sesión validada offline. | HU07 |
| `POST /auth/logout` | `auth/http/controllers/logout.controller.ts` | `logout-button.tsx`: sin conexión el cierre queda pendiente y se revoca al volver la red. | HU07 |

## Pendiente

- HU12 (modularizar el backend, a cargo de Maria) todavía no está en `epic8`. Cuando se fusione, este archivo debe listar los módulos y rutas nuevos o movidos.
- HU11 (índices y carga perezosa) puede tocar consultas; revisar cuando se fusione.
