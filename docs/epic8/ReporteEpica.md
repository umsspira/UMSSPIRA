# Reporte de la Épica 8 · Offline PWA y Service Worker (Grupo 9)

Corte: rama `epic8` al 14/11/2026 (commit `87f7249f`), comparada contra `dev`.
Tamaño de lo fusionado: 63 commits, 32 archivos, 2961 líneas agregadas y 389 quitadas. Cero cambios en el backend.

## 1. Objetivo

Que la PWA UMSSPIRA se abra y funcione sin conexión: en Modo Avión el usuario abre la aplicación y ve el código QR de sus pases desde lo guardado en el dispositivo. Las notificaciones push son de otro equipo.

## 2. Estado por historia y responsables

Responsables y horarios según la planificación del líder (jueves 12/11 y viernes 13/11/2026).

| HU | Historia | Responsable | Horario asignado | Estado en `epic8` | PR |
|---|---|---|---|---|---|
| HU01 | Configuración del Service Worker y caché | Mishel | Jue 12/11 12:00 a 15:00 | Fusionada | #698, #700 |
| HU02 | Guardar y consultar mis códigos QR sin conexión | Jose | Jue 12/11 18:00 a 21:00 | Fusionada | #717 |
| HU03 | Sincronizar información offline | Melani | Vie 13/11 10:00 a 13:00 | Fusionada | #761 |
| HU04 | Navegar por secciones y eventos sin conexión | Ivan | Vie 13/11 07:00 a 10:00 | Fusionada | #768 |
| HU05 | Visualizar estado de conexión | Jorge | Jue 12/11 15:00 a 18:00 | Fusionada | #701 |
| HU06 | Gestionar actualizaciones del Service Worker | Jorge | Vie 13/11 13:00 a 16:00 | Fusionada | #796 |
| HU07 | Proteger información almacenada offline | Franz | Jue 12/11 21:00 a 24:00 | Fusionada | #724 |
| HU08 | Validar el funcionamiento offline en Modo Avión | Mishel | Vie 13/11 16:00 a 19:00 | Pendiente | n/d |
| HU09 | Reducir pasos en las tareas principales | Ivan | n/d | Pendiente | n/d |
| HU10 | Avisos visuales de carga, confirmación y error | Melani | n/d | Pendiente | n/d |
| HU11 | Consultas rápidas: índices y carga perezosa | Jose | n/d | Pendiente | n/d |
| HU12 | Modularizar el backend de la épica | Maria | n/d | Pendiente | n/d |
| HU13 | QR y eventos guardados disponibles si otros servicios fallen | Franz | n/d | Pendiente | n/d |
| HU14 | Página de respaldo para rutas no guardadas | Oliver | n/d | Parcial (ver sección 4, punto 6) | n/d |
| HU15 | Unificar la navegación móvil y de escritorio | Oliver | n/d | Pendiente | n/d |
| HU16 | Indicadores de mensajes no leídos | Maria | n/d | Pendiente | n/d |
| HU17 | Mantener la posición de lectura en las conversaciones | Jose | n/d | Pendiente | n/d |
| HU18 | Una sección con fallas no bloquea el resto | Franz | n/d | Pendiente | n/d |

Nota: el estado y los PR salen del corte del repositorio indicado arriba. Si HU08 u otra historia se fusionó después de ese corte, actualizar la fila.

## 3. Qué se implementó

- **HU01 · Service Worker y caché.** `public/sw.js` con cinco cachés (núcleo, estáticos, assets, configuración y rutas), página `/offline` guardada en la instalación, perfiles de dispositivo (escritorio, móvil) que limitan los assets guardados, y rutas privadas que nunca se guardan. Pantalla `/portal/configuracion` con espacio usado, última actualización, versión y botón «Actualizar caché».
- **HU02 · QR sin conexión.** Los pases se guardan en IndexedDB (`umsspira-offline`, almacén `qr-passes`) por usuario, con botón de guardado en la tarjeta del pase. `/mis-pases` muestra los guardados cuando no hay red.
- **HU03 · Sincronización.** Al volver la conexión se actualizan los pases guardados sin recargar. Un pase invalidado muestra «Este pase ya no es válido». Hay aviso en pantalla con el resultado, la hora de la última actualización y «Reintentar» si falla.
- **HU04 · Navegación y eventos sin conexión.** Caché de rutas permitidas (`/portal`, eventos, empleos, beneficios, comunidad), catálogo público de eventos en IndexedDB (`umsspira-hu04`), acciones que requieren Internet deshabilitadas con «Necesitas conexión para esta acción» y pantalla de Mensajes bloqueada sin red.
- **HU05 · Estado de conexión.** En `/portal`: tarjeta de estado, alerta superior sin conexión, etiqueta «En línea / Sin conexión» y aviso al restablecerse.
- **HU06 · Actualizaciones.** El Service Worker responde `SKIP_WAITING` y `UPDATE_CACHE`; el hook `useServiceWorkerUpdate` avisa de una versión nueva con «Actualizar ahora / Más tarde».
- **HU07 · Protección de datos.** Sesión válida sin conexión por 7 días como máximo; al cerrar sesión se borran primero los datos privados guardados; si no hay red, el cierre queda pendiente y se revoca al volver.

## 4. Lo que no se esperaba

1. **Cambios en código de otras épicas.** Se tocaron `auth-session.ts` y `logout-button.tsx` (Autenticación), `EventPassCard.tsx`, `events-service.ts`, `cancel-registration-action.tsx` y `event-detail-page.tsx` (Eventos), y `useSendMessage.ts` y `portal/mensajes/page.tsx` (Chat). Conviene avisar a esos equipos.
2. **Cero backend.** No se pidió nada nuevo al servidor; HU12 (modularizar el backend) y HU11 (índices) siguen pendientes.
3. **El Service Worker se reescribió.** `sw.js` se rehízo en unos 20 commits pequeños; su `VERSION` ahora es `v1.0.0` (en `dev` era `v2`), así que los usuarios con la versión anterior pierden sus cachés viejas al actualizar.
4. **Dos bases de datos locales y tres detectores de conexión.** IndexedDB `umsspira-offline` y `umsspira-hu04`; `use-online-status.ts` (nuevo), la lógica propia de `/portal` y el `use-network-status.ts` del Grupo 5 hacen casi lo mismo.
5. **Archivo sin uso.** `public/offline-secciones.html` (390 líneas) no se referencia en ningún lado.
6. **La página `/offline` ya trae los accesos rápidos de HU14** (Mis QR y Eventos, marcados «HU14 CA-04»), así que parte de HU14 ya existe.
7. **Archivos generados en el repositorio.** `tsconfig.tsbuildinfo` quedó modificado y se agregó la dependencia de desarrollo `fake-indexeddb` con cambio en `pnpm-lock.yaml`.
8. **Mensajes de depuración.** `sw.js` y `useServiceWorkerUpdate.ts` dejan `console.log` y `/portal/configuracion` muestra un panel de registros del Service Worker.

## 5. Rutas de la épica (resumen)

Detalle completo en `RutasFrontend.md` y `RutasBackend.md` (misma carpeta).

**Frontend** (`apps/web/`)

| Ruta | HU | Estado |
|---|---|---|
| `/portal` | HU05 | Modificada |
| `/portal/configuracion` | HU01, HU06 | Nueva (privada) |
| `/offline` | HU01, HU04 | Modificada |
| `/offline-secciones.html` | HU04 | Nueva, sin uso |
| `/mis-pases` | HU02, HU03 | Modificada |
| `/portal/mensajes` | HU04 | Modificada (privada) |
| `/portal/eventos` | HU04 | Sin cambios de archivo |
| `/events/catalog/[id]` | HU04 | Modificada |
| `/sw.js`, `/sw-extensions.js` | HU01, HU06 | Service Worker, alcance `/portal` |

**Backend** (`apps/api/`): la épica no creó ni modificó rutas. Usa estas, de otros equipos, con prefijo `/api/v1`:

| Método y ruta | HU |
|---|---|
| `GET /registrations/my-passes` | HU02, HU03 |
| `GET /events/catalog` | HU04 |
| `POST /auth/refresh` | HU07 |
| `POST /auth/logout` | HU07 |

## 6. Riesgos para revisar antes de dar por cerrada la épica

- **`/portal/configuracion` es privada** y por eso no se guarda en caché: sin conexión puede no abrir, y HU01 CA-09 pide verla con el botón deshabilitado. Probarlo en Modo Avión.
- **`/mis-pases` está fuera del alcance `/portal` del Service Worker.** Los QR están en IndexedDB, pero la página misma podría no cargar si se recarga sin red. Es justo lo que debe comprobar HU08.
- **`offline-session.ts` deja un comentario «Confirmar en access-claims.ts»** sobre el campo del usuario en el token: verificarlo.
- **Pruebas.** Se agregaron tests de almacenamiento, sesión offline, catálogo de eventos y cierre de sesión; no se corrieron para este reporte (no hay `node_modules` en el entorno donde se redactó). Correr `pnpm --filter web test` antes del PR.

## 7. Pendiente

HU08 (verificación de principio a fin en Modo Avión) y las mejoras HU09 a HU18, incluidas HU14 y HU15 de Oliver, y HU08 de Mishel. Al fusionarlas, actualizar este reporte y los archivos `RutasFrontend.md` y `RutasBackend.md`.
