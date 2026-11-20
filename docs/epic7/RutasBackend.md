# Epic 7 — rutas backend

Prefijo global de la API: `/api/v1`. Los identificadores `:id`, `:registrationId` e `:inscripcionId` son parámetros de ruta. Las respuestas y validaciones detalladas están definidas por los DTOs, esquemas y controladores.

## Eventos, catálogo y portadas — sprints 1 y 2

| Método y ruta | Uso | Acceso |
| --- | --- | --- |
| `POST /api/v1/events` | Crear un evento. | Gestión de eventos |
| `GET /api/v1/events/owned` | Listar eventos propios para gestión. | Gestión de eventos |
| `GET /api/v1/events/owned/:id` | Consultar un evento propio. | Gestión de eventos |
| `GET /api/v1/events/drafts/:id` | Consultar un borrador propio. | Gestión de eventos |
| `PATCH /api/v1/events/drafts/:id` | Actualizar un borrador. | Gestión de eventos |
| `PATCH /api/v1/events/drafts/:id/publish` | Publicar inmediatamente un borrador. | Gestión de eventos |
| `PATCH /api/v1/events/owned/:id` | Modificar un evento publicado propio. | Gestión de eventos |
| `PATCH /api/v1/events/:id/cancel` | Cancelar un evento publicado propio. | Gestión de eventos |
| `GET /api/v1/events/inactive` | Listar eventos propios cancelados o finalizados. | Gestión de eventos |
| `PATCH /api/v1/events/owned/:id/retire` | Retirar un evento inactivo de la gestión activa. | Gestión de eventos |
| `GET /api/v1/events/catalog` | Consultar el catálogo de eventos publicados disponibles. | Público |
| `GET /api/v1/events/:id` | Consultar el detalle de un evento publicado. | Público |
| `POST /api/v1/events/covers` | Cargar una portada. | Gestión de eventos |
| `GET /api/v1/events/covers/:id` | Leer una portada publicada o una portada propia autorizada. | Público/propietario autorizado |
| `DELETE /api/v1/events/covers/:id` | Eliminar una portada temporal propia no vinculada. | Gestión de eventos |

## Inscripciones, participantes y pases QR — sprint 2

| Método y ruta | Uso | Acceso |
| --- | --- | --- |
| `POST /api/v1/events/:id/registrations` | Inscribirse a un evento y confirmar cupo. | Titulado |
| `PATCH /api/v1/events/registrations/:registrationId/cancel` | Cancelar una inscripción propia. | Titulado |
| `GET /api/v1/events/my-registrations` | Listar las inscripciones del titular autenticado. | Titulado |
| `GET /api/v1/events/owned/:id/participants` | Consultar participantes y ocupación de un evento. | Gestión de eventos |
| `POST /api/v1/registrations/:inscripcionId/pass` | Generar o asociar el pase QR de una inscripción propia. | Sesión autenticada |
| `GET /api/v1/registrations/my-passes` | Consultar los pases QR del titular autenticado. | Titulado |

HU-12 utiliza los pases obtenidos por el flujo existente y el almacenamiento local de la PWA; no añade un endpoint HTTP de consulta offline.

## Sprint 3 — completadas

| Método y ruta | HU | Uso | Acceso |
| --- | --- | --- | --- |
| `POST /api/v1/events/owned/:id/attendance` | HU14 | Validar un pase QR y registrar asistencia al evento propio. | Gestión de eventos |
| `PATCH /api/v1/events/drafts/:id/schedule` | HU15 | Programar o modificar la fecha de publicación de un borrador. | Gestión de eventos |
| `PATCH /api/v1/events/drafts/:id/schedule/cancel` | HU15 | Cancelar la programación pendiente. | Gestión de eventos |

## Rutas presentes en el código, pero no entregadas como HU completas

La existencia de estos endpoints no cambia el estado pendiente indicado en [AlcanceEpic7.md](./AlcanceEpic7.md).

| Método y ruta | HU | Uso | Estado |
| --- | --- | --- | --- |
| `POST /api/v1/push-subscriptions` | HU13 | Registrar o actualizar una suscripción push. | Incompleta |
| `GET /api/v1/push-subscriptions` | HU13 | Listar suscripciones del usuario autenticado. | Incompleta |
| `DELETE /api/v1/push-subscriptions` | HU13 | Eliminar una suscripción push. | Incompleta |
| `GET /api/v1/events/:id/certificate-template` | HU18/HU19 | Consultar la plantilla de certificado del evento. | Parcial/incompleta |
| `POST /api/v1/events/:id/certificate-template` | HU18/HU19 | Guardar una plantilla de certificado. | Parcial/incompleta |
| `POST /api/v1/events/:id/certificate-template/confirm` | HU18/HU19 | Confirmar una plantilla de certificado. | Parcial/incompleta |
| `GET /api/v1/events/:id/certificate-template/file` | HU18/HU19 | Obtener el archivo de la plantilla. | Parcial/incompleta |

HU16 y HU17 están pendientes según el responsable de Epic 7; este inventario no les atribuye endpoints como entregados.
Las rutas de certificados aparecen relacionadas con HU18/HU19 en el código, pero el mapeo exacto de cada operación debe confirmarse con sus criterios de aceptación.

## Permisos generales

- `Gestión de eventos` significa que el controlador exige el permiso `eventos:manage` y el backend verifica la identidad/propiedad que corresponda.
- `Titulado` significa que el endpoint requiere autenticación y rol de titulado.
- La lectura del catálogo y de eventos publicados es pública. La lectura de portadas conserva su autorización para los archivos no publicados.
- No se incluyen credenciales, tokens ni valores de configuración.
