# Rutas Frontend · Épica 8 (Grupo 9) · Sprint 1, Sprint 2 y Sprint 3

Corte: rama `epic8` al 14/11/2026 (commit `3f85966b`). Código en `apps/web/`.

Cómo se armó este archivo: se tomaron los Pull Request del Grupo 9 (ramas `feat/G9-…` y `fix/G9-…`) fusionados en `epic8` y se separaron por fecha de fusión: **Sprint 1** del 7 al 17 de octubre, **Sprint 2** del 21 al 29 de octubre y **Sprint 3** del 12 al 14 de noviembre. Las fechas de cada sprint son las del historial de git, no las oficiales.

"Privada" significa que el Service Worker no guarda esa ruta en caché (`PRIVATE_ROUTE_PREFIXES` de `public/sw.js`).

---

## Sprint 1 · PWA, shell del portal y Service Worker (PR #156 a #363)

Historias: HU1 (Service Worker y caché), HU2 (estructura del portal), HU3 (identidad visual), HU4 (logo, compatibilidad), HU5 (navbar móvil, panel lateral, cierre de sesión, responsividad).

| Ruta | Archivo | Qué se hizo |
|---|---|---|
| `/` | `src/app/page.tsx` | Página de inicio responsiva. |
| `/portal` | `src/app/portal/page.tsx` | Inicio del portal (shell de la PWA). |
| `/portal/institucional` | `src/app/portal/institucional/page.tsx` | Portal institucional público: identidad visual e imágenes (`public/images/institucional/*`). |
| `/portal/beneficios` | `src/app/portal/beneficios/page.tsx` | Sección creada para el shell del portal. |
| `/portal/comunidad` | `src/app/portal/comunidad/page.tsx` | Sección creada para el shell del portal. |
| `/portal/empleos` | `src/app/portal/empleos/page.tsx` | Sección creada para el shell del portal. |
| `/portal/eventos` | `src/app/portal/eventos/page.tsx` | Sección creada para el shell del portal. |
| `/portal/mentorias` | `src/app/portal/mentorias/page.tsx` | Sección creada para el shell del portal. |
| `/login` | `src/app/(public)/login/page.tsx` | Ajuste de colores e identidad visual. |
| `/admin` | `src/app/(public)/admin/page.tsx` | Estructura base de administración. **Ya no existe en `epic8`.** |
| `/offline` | `src/app/offline/page.tsx` | Página de respaldo sin conexión. |

Archivos públicos de la PWA creados en este sprint:

| URL | Archivo | Qué es |
|---|---|---|
| `/manifest.webmanifest` | `src/app/manifest.ts` | Manifiesto: nombre «UMSSPIRA — Egresados UMSS», `start_url` `/portal`, `scope` `/`, modo `standalone`, color `#1E3A5F`. |
| `/sw.js` | `public/sw.js` | Service Worker: cachés, estrategias, perfiles de dispositivo (escritorio y móvil), activación y versionado. |
| `/sw-extensions.js` | `public/sw-extensions.js` | Gancho para módulos de otros equipos. |
| `/icons/*` | `public/icons/` | Íconos 192, 512, maskable 512 y favicon 32. |

Esta parte usa `GET /api/v1/auth/me` y `POST /api/v1/auth/logout` (ver `RutasBackend.md`).

Componentes sin ruta propia: registro del Service Worker (`src/app/register-sw.ts`), navbar con botón de menú, panel lateral y cierre de sesión (`src/shared/components/navbar*`), pie de página.

---

## Sprint 2 · Mensajería (chat) y corrección de la barra superior (PR #403 a #598)

Historias del chat: HU1 conectar al chat en tiempo real, HU2 verificar conexión, HU3 conversación 1 a 1, HU4 enviar mensaje, HU5 recibir mensajes en tiempo real, HU6 lista de conversaciones, HU8 historial y mensajes anteriores, HU9 acceder a los mensajes, HU10 mensajes pendientes. Más dos correcciones de la barra: HU1 y HU2 de navbar.

| Ruta | Archivo | Qué se hizo |
|---|---|---|
| `/portal/mensajes` | `src/app/portal/mensajes/page.tsx` | **Nueva.** Pantalla de mensajes: lista de conversaciones, conversación abierta, envío, historial y no leídos. |
| `/portal/comunidad`, `/portal/empleos`, `/portal/mentorias` | `src/app/portal/{comunidad,empleos,mentorias}/page.tsx` | Ajustadas con la corrección de la barra superior. |
| Protección de rutas | `src/middleware.ts` | Se listaron las áreas que exigen sesión: `/portal`, `/portal/empleos`, `/portal/mentorias`, `/portal/comunidad`, `/portal/beneficios`, `/portal/eventos` (y subrutas), `/portal/mensajes`, `/mentorship`, `/job-postings`. El portal institucional sigue público. |

Archivos de apoyo, sin ruta propia: `src/features/chat/` (componentes y hooks de conversaciones), `src/shared/services/chat-conversation.service.ts`, `chat-message.service.ts`, `chat-socket.ts` y el botón de mensajes de la barra (`src/shared/components/navbar/messages-button.tsx`).

---

## Sprint 3 · Offline PWA (HU01 a HU08, PR #698 a #822)

| Ruta | Archivo | HU | Qué se hizo |
|---|---|---|---|
| `/portal` | `src/app/portal/page.tsx` | HU05 | Tarjeta «Estado de conexión», alerta superior sin conexión, etiqueta «En línea / Sin conexión» y aviso de conexión restablecida. |
| `/portal/configuracion` | `src/app/portal/configuracion/page.tsx` | HU01, HU06 | **Nueva** (privada). Espacio de caché, última actualización, versión del Service Worker, «Actualizar caché» y aviso «Actualizar ahora / Más tarde». |
| `/offline` | `src/app/offline/page.tsx` | HU01, HU04, HU08 | Respaldo «Sin conexión a Internet» con «Reintentar conexión» y accesos a Mis QR, Eventos y al portal. |
| `/offline-secciones.html` | `public/offline-secciones.html` | HU04 | **Nueva** (estática). Hoy ningún archivo la usa. |
| `/mis-pases` | `src/app/mis-pases/page.tsx` → `src/features/event-passes/my-qr-passes-page.tsx` | HU02, HU03 | Pases desde la API o, sin conexión, los guardados; estado de sincronización. |
| `/portal/mensajes` | `src/app/portal/mensajes/page.tsx` | HU04 | Sin conexión muestra «Mensajes no disponibles sin conexión». Privada. |
| `/portal/eventos` | `src/app/portal/eventos/page.tsx` | HU04 | Su catálogo se lee de lo guardado cuando no hay red (sin cambios en el archivo). |
| `/events/catalog/[id]` | `src/app/(dashboard)/events/catalog/[id]/page.tsx` | HU04 | Detalle de evento; acciones deshabilitadas sin conexión. |

Prueba de extremo a extremo de HU08: `e2e/offline-mode-avion.spec.ts` con `playwright.config.ts` (valida el uso en Modo Avión).

Archivos públicos que cambiaron: `public/sw.js` (cachés de rutas, rutas privadas, mensajes `SKIP_WAITING`, `SET_DEVICE_PROFILE` y `UPDATE_CACHE`).

Archivos de apoyo, sin ruta propia:

| Archivo | HU | Función |
|---|---|---|
| `src/features/event-passes/offline/offline-qr-storage.ts` | HU02 | IndexedDB `umsspira-offline`, almacén `qr-passes`. |
| `src/features/event-passes/offline/offline-sync.ts`, `use-offline-sync.ts`, `offline-sync-status.tsx` | HU03 | Sincronización al volver la red. |
| `src/features/event-passes/offline/offline-session.ts` | HU07 | Sesión válida sin conexión hasta 7 días y borrado de datos privados. |
| `src/modules/auth/frontend/components/logout-button.tsx`, `src/shared/services/auth-session.ts` | HU07 | Cierre de sesión que limpia lo guardado. |
| `src/shared/services/events-offline-cache.ts`, `events-service.ts` | HU04 | IndexedDB `umsspira-hu04`: catálogo público de eventos. |
| `src/features/chat/components/MessagesOfflineGuard.tsx` | HU04 | Bloqueo del chat sin conexión. |
| `src/shared/hooks/use-online-status.ts` | HU04, HU05 | Estado de conexión. |
| `src/hooks/useServiceWorkerUpdate.ts` | HU06 | Aviso de versión nueva del Service Worker. |

---

## Rutas que aparecen en los PR de Sprint 3 pero no son del Grupo 9

Los PR de resolución de conflictos con `dev` (#831 y #837) trajeron páginas de otros equipos, por ejemplo `/mis-pases/[passId]`, `/login` y varias de `empresa/mis-vacantes`. No son trabajo del Grupo 9 y no se listan arriba.

## Pendiente

HU09 a HU18 (incluidas HU14 y HU15 de Oliver): agregar sus rutas aquí cuando se fusionen a `epic8`.
