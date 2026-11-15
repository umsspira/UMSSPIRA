# Rutas backend - Épica 1 (G8)

Fecha de corte: 14/11/2026. Inventario de los controladores de `auth` y `registrations`.

Prefijo global: `/api/v1` (configurado en `configure-http.ts`). Las rutas de las tablas ya incluyen el prefijo. `:id`, `:token` y `:jobId` son parámetros.

El frontend consume estas rutas mediante el proxy compartido `/api/v1/[...path]`. Las respuestas JSON usan `{ data }` o `{ error }`; los endpoints de contenido devuelven el archivo.

Público significa que no requiere sesión de usuario; siguen aplicándose credenciales del borrador, OTP, validaciones y límites del flujo. Las operaciones observadas protegidas usan `X-Correction-Token`. La API exige permisos y alcance de carrera en las operaciones administrativas.

## Módulo `registrations`

| Método | Ruta | Función | Acceso | Controlador |
| --- | --- | --- | --- | --- |
| POST | `/api/v1/registrations/activate` | Activar cuenta y establecer contraseña | Público | [activate-registration.controller.ts](../../apps/api/src/modules/registrations/http/controllers/activate-registration.controller.ts) |
| POST | `/api/v1/registrations/activate/status` | Consultar acceso o reenviar activación | Público | [activation-access.controller.ts](../../apps/api/src/modules/registrations/http/controllers/activation-access.controller.ts) |
| POST | `/api/v1/registrations/activate/resend` | Consultar acceso o reenviar activación | Público | [activation-access.controller.ts](../../apps/api/src/modules/registrations/http/controllers/activation-access.controller.ts) |
| POST | `/api/v1/registrations/sessions` | Crear borrador de registro | Público | [create-registration.controller.ts](../../apps/api/src/modules/registrations/http/controllers/create-registration.controller.ts) |
| GET | `/api/v1/applications/:id/document` | Obtener referencia de acceso al respaldo | `solicitudes:read` | [get-application-document-link.controller.ts](../../apps/api/src/modules/registrations/http/controllers/get-application-document-link.controller.ts) |
| GET | `/api/v1/applications/:id/document/content` | Leer contenido del respaldo | `solicitudes:read` | [get-application-document.controller.ts](../../apps/api/src/modules/registrations/http/controllers/get-application-document.controller.ts) |
| GET | `/api/v1/applications/metrics` | Consultar indicadores de bandeja | `solicitudes:read` | [get-application-metrics.controller.ts](../../apps/api/src/modules/registrations/http/controllers/get-application-metrics.controller.ts) |
| GET | `/api/v1/applications/:id` | Consultar expediente | `solicitudes:read` | [get-application.controller.ts](../../apps/api/src/modules/registrations/http/controllers/get-application.controller.ts) |
| GET | `/api/v1/registrations/sessions/:token/document` | Leer respaldo del borrador | Público | [get-draft-document.controller.ts](../../apps/api/src/modules/registrations/http/controllers/get-draft-document.controller.ts) |
| GET | `/api/v1/registrations/sessions/:token` | Consultar borrador | Público | [inspect-registration.controller.ts](../../apps/api/src/modules/registrations/http/controllers/inspect-registration.controller.ts) |
| POST | `/api/v1/email-verification/resend` | Emitir o reenviar código de verificación | Público | [issue-registration-code.controller.ts](../../apps/api/src/modules/registrations/http/controllers/issue-registration-code.controller.ts) |
| GET | `/api/v1/applications` | Listar solicitudes con búsqueda, filtros y paginación | `solicitudes:read` | [list-applications.controller.ts](../../apps/api/src/modules/registrations/http/controllers/list-applications.controller.ts) |
| GET | `/api/v1/registrations/careers` | Listar carreras del registro | Público | [list-registration-careers.controller.ts](../../apps/api/src/modules/registrations/http/controllers/list-registration-careers.controller.ts) |
| POST | `/api/v1/mail-events/retry-failed` | Reintentar notificaciones fallidas | `solicitudes:review` | [mail-events.controller.ts](../../apps/api/src/modules/registrations/http/controllers/mail-events.controller.ts) |
| POST | `/api/v1/mail-events/:id/retry` | Reintentar notificaciones fallidas | `solicitudes:review` | [mail-events.controller.ts](../../apps/api/src/modules/registrations/http/controllers/mail-events.controller.ts) |
| GET | `/api/v1/registrations/observed` | Consultar o corregir expediente observado y reentregar | Token de corrección | [observed-application.controller.ts](../../apps/api/src/modules/registrations/http/controllers/observed-application.controller.ts) |
| GET | `/api/v1/registrations/observed/document/content` | Consultar o corregir expediente observado y reentregar | Token de corrección | [observed-application.controller.ts](../../apps/api/src/modules/registrations/http/controllers/observed-application.controller.ts) |
| PATCH | `/api/v1/registrations/observed` | Consultar o corregir expediente observado y reentregar | Token de corrección | [observed-application.controller.ts](../../apps/api/src/modules/registrations/http/controllers/observed-application.controller.ts) |
| POST | `/api/v1/registrations/observed/document` | Consultar o corregir expediente observado y reentregar | Token de corrección | [observed-application.controller.ts](../../apps/api/src/modules/registrations/http/controllers/observed-application.controller.ts) |
| POST | `/api/v1/registrations/observed/submit` | Consultar o corregir expediente observado y reentregar | Token de corrección | [observed-application.controller.ts](../../apps/api/src/modules/registrations/http/controllers/observed-application.controller.ts) |
| POST | `/api/v1/applications/ocr/:jobId/complete` | Guardar o consultar resultado OCR por revisión | `solicitudes:read` | [ocr-results.controller.ts](../../apps/api/src/modules/registrations/http/controllers/ocr-results.controller.ts) |
| GET | `/api/v1/applications/:id/ocr` | Guardar o consultar resultado OCR por revisión | `solicitudes:read` | [ocr-results.controller.ts](../../apps/api/src/modules/registrations/http/controllers/ocr-results.controller.ts) |
| POST | `/api/v1/applications/ocr/statuses` | Consultar, reservar, renovar o procesar trabajo OCR | `solicitudes:read` | [ocr.controller.ts](../../apps/api/src/modules/registrations/http/controllers/ocr.controller.ts) |
| POST | `/api/v1/applications/ocr/claim` | Consultar, reservar, renovar o procesar trabajo OCR | `solicitudes:read` | [ocr.controller.ts](../../apps/api/src/modules/registrations/http/controllers/ocr.controller.ts) |
| POST | `/api/v1/applications/ocr/:jobId/renew` | Consultar, reservar, renovar o procesar trabajo OCR | `solicitudes:read` | [ocr.controller.ts](../../apps/api/src/modules/registrations/http/controllers/ocr.controller.ts) |
| POST | `/api/v1/applications/ocr/:jobId/document` | Consultar, reservar, renovar o procesar trabajo OCR | `solicitudes:read` | [ocr.controller.ts](../../apps/api/src/modules/registrations/http/controllers/ocr.controller.ts) |
| POST | `/api/v1/applications/ocr/:jobId/fail` | Consultar, reservar, renovar o procesar trabajo OCR | `solicitudes:read` | [ocr.controller.ts](../../apps/api/src/modules/registrations/http/controllers/ocr.controller.ts) |
| POST | `/api/v1/applications/:id/activation` | Renovar activación desde administración | `solicitudes:review` | [renew-activation.controller.ts](../../apps/api/src/modules/registrations/http/controllers/renew-activation.controller.ts) |
| POST | `/api/v1/registrations/observed/request-link` | Solicitar enlace de corrección | Público | [request-correction-link.controller.ts](../../apps/api/src/modules/registrations/http/controllers/request-correction-link.controller.ts) |
| POST | `/api/v1/applications/:id/review` | Emitir dictamen administrativo | `solicitudes:review` | [review-application.controller.ts](../../apps/api/src/modules/registrations/http/controllers/review-application.controller.ts) |
| POST | `/api/v1/registrations/status-query` | Solicitar estado por correo con respuesta pública genérica | Público | [status-query.controller.ts](../../apps/api/src/modules/registrations/http/controllers/status-query.controller.ts) |
| POST | `/api/v1/registrations/submit` | Entregar solicitud | Público | [submit-registration.controller.ts](../../apps/api/src/modules/registrations/http/controllers/submit-registration.controller.ts) |
| PATCH | `/api/v1/registrations/sessions/:token` | Actualizar datos del borrador | Público | [update-registration.controller.ts](../../apps/api/src/modules/registrations/http/controllers/update-registration.controller.ts) |
| POST | `/api/v1/documents` | Subir respaldo | Público | [upload-registration-document.controller.ts](../../apps/api/src/modules/registrations/http/controllers/upload-registration-document.controller.ts) |
| GET | `/api/v1/registrations/observed/access` | Validar enlace de corrección | Token de corrección | [validate-correction-access.controller.ts](../../apps/api/src/modules/registrations/http/controllers/validate-correction-access.controller.ts) |
| POST | `/api/v1/registrations/activate/verify` | Validar OTP de activación | Público | [verify-activation-code.controller.ts](../../apps/api/src/modules/registrations/http/controllers/verify-activation-code.controller.ts) |
| POST | `/api/v1/email-verification/verify` | Verificar código de correo | Público | [verify-registration-code.controller.ts](../../apps/api/src/modules/registrations/http/controllers/verify-registration-code.controller.ts) |

## Módulo `auth`

| Método | Ruta | Función | Acceso | Controlador |
| --- | --- | --- | --- | --- |
| POST | `/api/v1/auth/password` | Cambiar contraseña autenticada | Sesión autenticada | [change-password.controller.ts](../../apps/api/src/modules/auth/http/controllers/change-password.controller.ts) |
| GET | `/api/v1/auth/me` | Consultar usuario autenticado | `user:self:read` | [get-authenticated-user.controller.ts](../../apps/api/src/modules/auth/http/controllers/get-authenticated-user.controller.ts) |
| GET | `/api/v1/auth/session` | Inspeccionar sesión | Público | [inspect-session.controller.ts](../../apps/api/src/modules/auth/http/controllers/inspect-session.controller.ts) |
| GET | `/api/v1/auth/sessions` | Listar sesiones del usuario | `auth:sessions:self` | [list-sessions.controller.ts](../../apps/api/src/modules/auth/http/controllers/list-sessions.controller.ts) |
| POST | `/api/v1/auth/login` | Iniciar sesión | Público | [login.controller.ts](../../apps/api/src/modules/auth/http/controllers/login.controller.ts) |
| POST | `/api/v1/auth/logout-all` | Cerrar todas las sesiones | Sesión autenticada | [logout-all.controller.ts](../../apps/api/src/modules/auth/http/controllers/logout-all.controller.ts) |
| POST | `/api/v1/auth/logout` | Cerrar sesión actual | Sesión autenticada | [logout.controller.ts](../../apps/api/src/modules/auth/http/controllers/logout.controller.ts) |
| POST | `/api/v1/auth/refresh` | Renovar sesión | Público | [refresh-session.controller.ts](../../apps/api/src/modules/auth/http/controllers/refresh-session.controller.ts) |
| POST | `/api/v1/auth/password-recovery/request` | Solicitar recuperación | Público | [request-password-recovery.controller.ts](../../apps/api/src/modules/auth/http/controllers/request-password-recovery.controller.ts) |
| POST | `/api/v1/auth/password-recovery/reset` | Restablecer contraseña | Público | [reset-password.controller.ts](../../apps/api/src/modules/auth/http/controllers/reset-password.controller.ts) |
| DELETE | `/api/v1/auth/sessions/:id` | Revocar una sesión | `auth:sessions:self` | [revoke-session.controller.ts](../../apps/api/src/modules/auth/http/controllers/revoke-session.controller.ts) |
| POST | `/api/v1/auth/password-recovery/validate` | Validar credencial de recuperación | Público | [validate-password-recovery.controller.ts](../../apps/api/src/modules/auth/http/controllers/validate-password-recovery.controller.ts) |

## Reglas de integración

- Los endpoints OCR requieren sesión administrativa, permiso `solicitudes:read` y alcance autorizado; las operaciones de reserva usan además su token de trabajo. El resultado OCR no emite dictamen.
- La decisión se envía a `POST /api/v1/applications/:id/review` con `solicitudes:review`; los reintentos de correo no deben duplicarla.
- La consulta de estado y recuperación mantienen respuestas genéricas para evitar revelar cuentas o solicitudes.
- Los documentos se sirven mediante endpoints protegidos; no publicar respaldos ni URLs con credenciales.
- Las rutas de sesión son compartidas con otras épicas; se incluyen por su integración con HU-05 y HU-12.
