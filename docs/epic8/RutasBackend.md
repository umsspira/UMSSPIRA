# Rutas Backend · Épica 8 (Grupo 9) · Sprint 1, Sprint 2 y Sprint 3

Corte: rama `epic8` al 14/11/2026 (commit `3f85966b`). Código en `apps/api/src/modules/`.
Prefijo de todas las rutas HTTP: `/api/v1`.

## Sprint 1 · PWA y shell (PR #156 a #363)

**El Grupo 9 no creó ni modificó rutas de backend en este sprint.** Se revisaron los 25 PR del sprint y ninguno toca `apps/api/`. Todo fue frontend (Service Worker, manifiesto, portal y barra de navegación).

Rutas de otros equipos que usa lo hecho en este sprint (prefijo `/api/v1`):

| Método y ruta | Quién la usa | Para qué |
|---|---|---|
| `GET /auth/me` | `shared/components/navbar/connected-navbar.tsx` | La barra superior pide el usuario y su rol para mostrar el menú. |
| `POST /auth/logout` | botón «Cerrar sesión» del panel lateral y del menú móvil | Cierra la sesión del usuario. |

## Sprint 2 · Mensajería (chat) (PR #404 a #516)

Módulo `chat/` creado por el Grupo 9 en `apps/api/src/modules/chat/` (`chat.controller.ts`, `chat.gateway.ts`, `chat.service.ts`, `chat.module.ts`, `chat-role-matrix.ts`, `prisma.service.ts`).

| Método y ruta | Para qué | HU | Lo consume en la web |
|---|---|---|---|
| `POST /chat/conversations/direct` | Iniciar una conversación directa. | HU3 | `chat-conversation.service.ts` |
| `GET /chat/conversations` | Listar las conversaciones. | HU6 | `chat-conversation.service.ts` |
| `GET /chat/conversations/users` | Listar usuarios con los que se puede chatear. | HU3 | `portal/mensajes/page.tsx` |
| `GET /chat/conversations/:id/messages` | Historial y mensajes anteriores (paginado). | HU8, HU9 | `chat-conversation.service.ts` |
| `POST /chat/conversations/:id/simulate-reply` | Respuesta simulada para pruebas. | HU4 | pruebas |
| `PATCH /chat/conversations/:id/read` | Marcar la conversación como leída. | HU10 | `chat-conversation.service.ts` |

Tiempo real (Socket.IO, espacio `/chat`, `chat.gateway.ts`):

| Evento | Sentido | HU |
|---|---|---|
| `chat:ready` | servidor → cliente, conexión aceptada | HU1, HU2 |
| `chat:send` | cliente → servidor, enviar mensaje | HU4 |
| `chat:new_message` | servidor → destinatarios de la conversación | HU5 |
| `chat:unauthorized` | servidor → cliente, sesión no válida | HU1 |

Archivos del backend que se modificaron para que esto funcione, sin ruta propia:

| Archivo | Cambio |
|---|---|
| `apps/api/src/app.module.ts` | Se registró `ChatModule`. |
| `apps/api/src/main.ts` | Adaptador de Socket.IO con los mismos orígenes CORS de la API (HU10). |
| `apps/api/package.json` | Dependencias `@nestjs/websockets`, `@nestjs/platform-socket.io` y `socket.io`. |
| `apps/api/nest-cli.json` | Ajuste de compilación del módulo. |
| `apps/api/scripts/seed/epic-8.ts` | Datos de prueba de conversaciones (HU6). |

## Sprint 3 · Offline (HU01 a HU08, 12 y 13 de noviembre)

**Offline (HU01 a HU08): ninguna ruta nueva.** Todo se hizo en `apps/web/`. Estas rutas existentes las usa el trabajo offline:

| Método y ruta | Controlador | Lo usa | HU |
|---|---|---|---|
| `GET /registrations/my-passes` | `events/http/event-passes.controller.ts` | `/mis-pases`: pases que se guardan y se sincronizan. | HU02, HU03 |
| `GET /events/catalog` | `events/http/controllers/get-event-catalog.controller.ts` | Catálogo público que se guarda sin conexión. | HU04 |
| `POST /auth/refresh` | `auth/http/controllers/refresh-session.controller.ts` | Renueva la sesión; registra la sesión validada offline. | HU07 |
| `POST /auth/logout` | `auth/http/controllers/logout.controller.ts` | Cierre de sesión (pendiente si no hay red). | HU07 |

**Aparte de las HU01 a HU08: chat reorganizado en un controlador por caso de uso.** El módulo `chat/` del Sprint 2 quedó dividido en `http/controllers/`, `application/use-cases/`, `domain/`, `infrastructure/` y con migración `20261101000000_chat_requests`. Llegó a `epic8` en el PR #831 (resolución de conflictos con `dev`); parece corresponder a HU12 (modularizar el backend), pero conviene confirmarlo con quien la hizo. Rutas actuales:

| Método y ruta | Controlador (`chat/http/controllers/`) |
|---|---|
| `GET /chat/conversations` | `list-conversations.controller.ts` |
| `POST /chat/conversations` | `start-conversation.controller.ts` |
| `GET /chat/conversations/:id` | `get-conversation.controller.ts` |
| `GET /chat/conversations/:id/messages` | `list-messages.controller.ts` |
| `POST /chat/conversations/:id/messages` | `send-message.controller.ts` |
| `PATCH /chat/conversations/:id/messages/:messageId` | `edit-message.controller.ts` |
| `DELETE /chat/conversations/:id/messages/:messageId` | `delete-message.controller.ts` |
| `POST /chat/conversations/:id/attachments` | `send-attachment.controller.ts` |
| `GET /chat/conversations/:id/messages/:messageId/attachment` | `download-attachment.controller.ts` |
| `PUT /chat/conversations/:id/read-receipt` | `mark-read.controller.ts` |
| `PATCH /chat/conversations/:id/request` | `respond-request.controller.ts` |
| `GET /chat/contacts` | `search-contacts.controller.ts` |
| `GET /chat/unread-summary` | `get-unread-summary.controller.ts` |

Tiempo real (espacio `/chat`): el servidor emite `chat:ready`, `chat:session_expired` y `chat:changed`.

Otros controladores de otros equipos llegaron en esos mismos PR de conflictos (perfil, radar, inscripciones, encuestas) y no son trabajo del Grupo 9.

## Pendiente

HU12 (modularizar el backend) y HU11 (índices y carga perezosa): confirmar su estado y actualizar este archivo si agregan o mueven rutas.
