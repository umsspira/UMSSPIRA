# HTTP

controllers contiene una operación por archivo y schemas/events.schemas.ts reúne toda la validación del módulo. Los schemas convierten la referencia de portada que devuelve la API en un UUID interno. presenters traduce fechas a ISO-8601 y construye la ruta de imagen desde esa relación.

Las rutas de gestión llevan permisos explícitos. Las rutas públicas usan Public. Solo la lectura de portadas combina Public con OptionalAuthenticationGuard: luego el repositorio determina si la portada está publicada o pertenece al actor. Este guard no concede permisos ni sustituye las condiciones de propiedad.

La ruta de portada devuelve bytes; las demás lecturas y escrituras usan data y la eliminación devuelve 204. El prefijo /api/v1 se añade en la configuración HTTP global.

La ruta protegida `/api/v1/events/reminder-settings` permite consultar y actualizar una anticipación global de 1 a 720 horas (24 por defecto). Al cambiarla, se reprograman los avisos pendientes de eventos publicados y se aplica a nuevas inscripciones. `EventReminderWorker` valida nuevamente el evento y la inscripción antes del envío Push.
