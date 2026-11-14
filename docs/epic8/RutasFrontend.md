# Rutas Frontend · Épica 8 (Offline PWA y Service Worker)

Corte: rama `epic8` al 14/11/2026 (commit `87f7249f`). Código en `apps/web/`.
Las rutas de abajo son las que esta épica creó o modificó. "Privada" significa que el Service Worker no la guarda en caché (`PRIVATE_ROUTE_PREFIXES` en `public/sw.js`).

## 1. Rutas (páginas)

| Ruta | Archivo | Estado | HU | Qué hace |
|---|---|---|---|---|
| `/portal` | `src/app/portal/page.tsx` | Modificada | HU05 | Tarjeta «Estado de conexión», alerta superior sin conexión, etiqueta «En línea / Sin conexión» y aviso «Conexión restablecida». |
| `/portal/configuracion` | `src/app/portal/configuracion/page.tsx` | **Nueva** (privada) | HU01, HU06 | Pantalla de configuración de la PWA: espacio de caché usado, última actualización, versión del Service Worker, botón «Actualizar caché» y aviso «Actualizar ahora / Más tarde» cuando hay versión nueva. |
| `/offline` | `src/app/offline/page.tsx` | Modificada | HU01 (CA-04), HU04 (CA-05) | Página de respaldo «Sin conexión a Internet» con «Reintentar conexión» y accesos a Mis QR, Eventos y al portal. |
| `/offline-secciones.html` | `public/offline-secciones.html` | **Nueva** (estática) | HU04 | Página estática con las secciones disponibles sin conexión. **Hoy ninguna ruta ni el Service Worker la usa.** |
| `/mis-pases` | `src/app/mis-pases/page.tsx` → `src/features/event-passes/my-qr-passes-page.tsx` | Modificada | HU02, HU03 | Con conexión pide los pases a la API; sin conexión muestra los guardados en el dispositivo. Incluye el estado de sincronización. |
| `/portal/mensajes` | `src/app/portal/mensajes/page.tsx` | Modificada | HU04 (CA-06) | Sin conexión muestra «Mensajes no disponibles sin conexión» (`MessagesOfflineGuard`). Privada. |
| `/portal/eventos` | `src/app/portal/eventos/page.tsx` | Sin cambios de archivo | HU04 | Su listado funciona sin conexión porque `events-service.ts` lee el catálogo guardado. |
| `/events/catalog/[id]` | `src/app/(dashboard)/events/catalog/[id]/page.tsx` | Modificada | HU04 | Detalle de evento visitado; acciones de inscripción/cancelación deshabilitadas sin conexión. |

## 2. Componentes, hooks y servicios (no son rutas)

| Archivo | HU | Función |
|---|---|---|
| `src/features/event-passes/offline/offline-qr-storage.ts` | HU02 | IndexedDB `umsspira-offline`, almacén `qr-passes` (índice `by-user-id`): guardar, listar, leer y borrar pases. |
| `src/features/event-passes/event-pass-qr-card.tsx`, `src/modules/events/components/EventPassCard.tsx` | HU02 | Botón y estado de guardado del pase. |
| `src/features/event-passes/offline/offline-sync.ts`, `use-offline-sync.ts`, `offline-sync-status.tsx` | HU03 | Sincronización al volver la red; mensaje «Este pase ya no es válido»; aviso de resultado y última actualización. |
| `src/features/event-passes/offline/offline-session.ts` | HU07 | Sesión válida sin conexión hasta 7 días; borrado de datos privados; cierre de sesión pendiente. |
| `src/modules/auth/frontend/components/logout-button.tsx` | HU07 | Al cerrar sesión borra primero los datos offline; sin conexión deja el cierre pendiente. |
| `src/shared/services/auth-session.ts` | HU07 | `setAccessToken` registra la sesión validada (para el plazo de 7 días). |
| `src/shared/services/events-offline-cache.ts` | HU04 | IndexedDB `umsspira-hu04`, almacén `public-events`: catálogo público de eventos. |
| `src/shared/services/events-service.ts` | HU04 | Sin conexión devuelve el catálogo guardado; con conexión lo guarda. |
| `src/features/events/cancel-registration-action.tsx`, `event-detail-page.tsx` | HU04 | Acciones deshabilitadas con «Necesitas conexión para esta acción». |
| `src/features/chat/components/MessagesOfflineGuard.tsx`, `hooks/useSendMessage.ts` | HU04 | El chat no se usa sin conexión. |
| `src/shared/hooks/use-online-status.ts` | HU04, HU05 | Hook de estado de conexión. |
| `src/hooks/useServiceWorkerUpdate.ts` | HU06 | Detecta versión nueva del Service Worker y permite aplicarla. |

## 3. Archivos públicos del Service Worker

| URL | Archivo | Nota |
|---|---|---|
| `/sw.js` | `public/sw.js` | Alcance `/portal`. Cachés: núcleo, estáticos, assets, configuración y rutas. Mensajes: `SKIP_WAITING`, `SET_DEVICE_PROFILE`, `UPDATE_CACHE`. |
| `/sw-extensions.js` | `public/sw-extensions.js` | Gancho para módulos de otros equipos. Sin cambios. |
| `/manifest.webmanifest`, `/icons/*` | — | Sin cambios. |

Rutas que el Service Worker puede dejar abrir sin conexión (`OFFLINE_ALLOWED_ROUTES`): `/portal`, `/portal/eventos`, `/portal/empleos`, `/portal/beneficios`, `/portal/comunidad`.

## 4. Pendiente de agregar cuando se fusione a `epic8`

- HU14 (página de respaldo) y HU15 (navegación unificada), a cargo de Oliver: agregar aquí sus rutas y archivos.
- HU08 (prueba en Modo Avión): no agrega rutas.
- HU16 y HU17 (chat), HU09 a HU11, HU13 y HU18: completar según se fusionen.
