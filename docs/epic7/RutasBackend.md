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

## Asistencia y publicación programada — sprint 3

| Método y ruta | HU | Uso | Acceso |
| --- | --- | --- | --- |
| `POST /api/v1/events/owned/:id/attendance` | HU14 | Validar un pase QR y registrar asistencia al evento propio. | Gestión de eventos |
| `PATCH /api/v1/events/drafts/:id/schedule` | HU15 | Programar o modificar la fecha de publicación de un borrador. | Gestión de eventos |
| `PATCH /api/v1/events/drafts/:id/schedule/cancel` | HU15 | Cancelar la programación pendiente. | Gestión de eventos |

## Notificaciones y recordatorios — sprint 3

El detalle funcional de las historias está en [ReporteEpica.md](./ReporteEpica.md). Las notificaciones push requieren una suscripción del dispositivo; los avisos también se guardan para consultarlos en la aplicación.

| Método y ruta | HU | Uso | Acceso |
| --- | --- | --- | --- |
| `POST /api/v1/push-subscriptions` | HU13 | Registrar o actualizar una suscripción push. | Titulado |
| `GET /api/v1/push-subscriptions` | HU13 | Listar suscripciones del usuario autenticado. | Titulado |
| `DELETE /api/v1/push-subscriptions` | HU13 | Eliminar una suscripción push. | Titulado |
| `GET /api/v1/event-notifications` | HU13/HU16 | Listar hasta 30 avisos y 30 recordatorios recientes, identificando cuáles son recordatorios. | Titulado |
| `PATCH /api/v1/event-notifications/:id/read` | HU13/HU16 | Marcar un aviso propio como leído. | Titulado |
| `GET /api/v1/events/reminder-settings` | HU16 | Consultar la anticipación de los recordatorios. | Gestión de eventos |
| `PATCH /api/v1/events/reminder-settings` | HU16 | Actualizar la anticipación de los recordatorios. | Gestión de eventos |

El envío de recordatorios lo ejecuta un worker; no dispone de una ruta HTTP de envío manual en este inventario.

## Certificados — sprint 3

| Método y ruta | HU | Uso | Acceso |
| --- | --- | --- | --- |
| `GET /api/v1/events/:id/certificate-template` | HU17 | Consultar la plantilla de certificado del evento. | Gestión de eventos |
| `POST /api/v1/events/:id/certificate-template` | HU17 | Cargar una plantilla de certificado. | Gestión de eventos |
| `POST /api/v1/events/:id/certificate-template/confirm` | HU17 | Confirmar una plantilla de certificado. | Gestión de eventos |
| `GET /api/v1/events/:id/certificate-template/file` | HU17 | Obtener el archivo de la plantilla. | Gestión de eventos |
| `POST /api/v1/events/:eventId/certificates/generate` | HU18 | Iniciar la generación de certificados. | Gestión de eventos |
| `GET /api/v1/events/:eventId/certificates/status` | HU18 | Consultar el estado de la generación. | Gestión de eventos |
| `GET /api/v1/events/:eventId/certificates/summary` | HU18 | Consultar el resumen de emisión. | Gestión de eventos |
| `GET /api/v1/events/:eventId/certificates/:userId/download` | HU18 | Obtener el certificado de un participante. | Gestión de eventos |
| `GET /api/v1/certificates/me` | HU19 | Listar certificados propios. | Titulado |
| `GET /api/v1/certificates/me/:certificateId/download` | HU19 | Descargar un certificado propio. | Titulado |

## Permisos generales

- `Gestión de eventos` significa que el controlador exige el permiso `eventos:manage` y el backend verifica la identidad/propiedad que corresponda.
- `Titulado` significa que el endpoint requiere autenticación y rol de titulado.
- La lectura del catálogo y de eventos publicados es pública. La lectura de portadas conserva su autorización para los archivos no publicados.
- No se incluyen credenciales, tokens ni valores de configuración.
- Este inventario describe endpoints presentes en el código y no sustituye la validación de QA.
