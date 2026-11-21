# Directorio y perfil de mentores

Migra participación, información profesional, áreas, intereses, disponibilidad y desactivación administrativa. `POST /api/v1/mentorship/requests` crea solicitudes pendientes y valida que el titulado, el mentor y el horario cumplan las reglas. `GET /api/v1/mentorship/requests` lista solicitudes recibidas del mentor autenticado (página máxima de 20); `GET /api/v1/mentorship/requests/:id` consulta el detalle. `PATCH /api/v1/mentorship/requests/:id/accept` y `PATCH /api/v1/mentorship/requests/:id/reject` responden solicitudes pendientes. La aceptación crea una conexión en la misma transacción y las respuestas encolan correo usando el worker SMTP existente. `GET /api/v1/mentorship/my-requests` lista el historial del titulado autenticado y `PATCH /api/v1/mentorship/my-requests/:id/cancel` lo cancela. No requieren cambios de tablas ni migraciones.

## Rutas y acceso

Nest registra las rutas en los decoradores de cada controlador y conecta las clases en mentorship.module.ts. Cada archivo representa una operación; los schemas Zod comparten http/schemas/mentorship.schemas.ts. No se necesita un router de Express.

Los guards globales verifican sesión y RequirePermissions. La identidad propia se obtiene del actor; ningún body ni header puede escoger otro usuario. La desactivación administrativa comprueba las carreras asignadas al actor.

## Identidad y concurrencia

Usuario, titulado y mentor tienen UUID independientes. mentor.id_titulado enlaza un único perfil con su titulado. No comparar estos identificadores entre sí ni reutilizar actor.id como ID del mentor.

Las escrituras bloquean el titulado dentro de una transacción. Esto serializa cambios de participación, información, intereses, áreas y disponibilidad del mismo perfil; evita crear perfiles duplicados o agregar un interés después de quitar su área.

La información profesional usa columnas explícitas. La migración convierte el JSON histórico de experiencia; un mentor histórico sin titulado asociado detiene la migración para exigir una asociación válida.

## Disponibilidad

El directorio de la HU-6.7 muestra únicamente mentores cuyo último estado es AVAILABLE. PAUSED, UNAVAILABLE y la ausencia de disponibilidad los excluyen. Consultar no crea registros. La política `canReceiveMentorship` sigue determinando quién puede recibir solicitudes en otros flujos. El perfil detallado de la HU-6.9 muestra mentores activos AVAILABLE, PAUSED o sin estado (estos dos sin poder solicitar) y responde 404 si el último estado es UNAVAILABLE.
DISPONIBLE acepta solicitudes, EN_PAUSA conserva la visibilidad sin aceptarlas y NO_DISPONIBLE oculta el perfil del directorio. Sin estado registrado también permanece visible, pero no recibe solicitudes. Consultar no crea registros.

El módulo exporta MENTOR_AVAILABILITY_REPOSITORY mediante un port. Otros módulos pueden consultar canReceiveRequests sin importar Prisma ni consultar directamente estas tablas.

## Filtros del directorio

`GET /api/v1/mentorship/filter-options?areaIds=<uuid>&areaIds=<uuid>` requiere sesión de titulado y devuelve el catálogo de áreas activas junto con los intereses activos de las áreas seleccionadas. Sin áreas, `intereses` es una lista vacía.

`GET /api/v1/mentorship/profiles/filter?areaIds=<uuid>&interestIds=<uuid>` también requiere sesión de titulado. Los filtros aceptan UUID repetidos o separados por comas; dentro de cada grupo se aplica OR y, al combinar áreas e intereses, ambos criterios deben coincidir. Los intereses enviados junto con áreas deben pertenecer a alguna de ellas. IDs inexistentes, inactivos o incompatibles responden 400. Si no hay coincidencias, se responde 200 con `data: []`.

Los filtros solo leen el catálogo `area` y las relaciones `mentor_area`; no crean catálogos ni modifican perfiles. El directorio filtrado conserva la visibilidad habitual: solo titulados y mentores activos cuyo estado no sea `UNAVAILABLE`.

Los [contratos HTTP](../../../docs/endpoints/epic06-grupo06-hu1.6.md) documentan las rutas nuevas. La integración del frontend queda pendiente.

## Onboarding del mentor

`GET /api/v1/mentorship/onboarding` devuelve el avance derivado de los datos persistidos (`isComplete`, `currentStep`, `completedSteps`, catálogos y selección). Los `PUT /api/v1/mentorship/onboarding/areas|interests|availability` guardan un paso completo dentro de una transacción: bloquean el mentor, validan el orden (`1 → 2 → 3`), reemplazan la selección y actualizan `mentor_onboarding` como registro de avance.

- Paso 1 exige entre 1 y 5 áreas raíz activas; el paso 2 solo acepta intereses de esas áreas; el paso 3 exige estado y al menos un horario con `end > start`.
- `assertPreviousOnboardingStepCompleted` responde 409 `PASO_PREVIO_INCOMPLETO`; los datos de negocio inválidos responden 422 `DATOS_PASO_INVALIDOS` con `fields`; un mentor sin participación activa responde 403 `MENTOR_NO_HABILITADO`.
- La identidad sale del actor (`@CurrentActor`); los campos de identidad del body se ignoran en el schema.
- El paso 3 reemplaza los `EspacioDisponibleMentor` del mentor en la misma transacción. Guardar de nuevo el mismo paso es idempotente y no duplica `mentor_area`.
- La tabla `mentor_onboarding` tiene `id_mentor` único y `pasos_completados` (`Int[]`); `mentor_area` tiene índice único `(id_mentor, id_area)`.

El frontend vive en `/mentorship/onboarding` (`mentor-onboarding-wizard`) y el inicio `/mentorship` muestra `mentor-entry-card` según el avance. Las secciones del perfil usan `mentor-configuration-gate` para exigir el onboarding completo antes de editar.

## Mis solicitudes del titulado

`GET /api/v1/mentorship/my-requests` devuelve únicamente las solicitudes creadas por el actor (`id_usuario = actor.id`). No exige participación activa como mentor. Sin `estado` devuelve todos los estados; el orden es `fecha_creacion DESC`, `solicitud_fecha DESC`, `id DESC` y la página máxima es 20. La respuesta agrega `counts` por estado para evitar múltiples consultas desde el frontend. El nombre y cargo del mentor salen de su perfil; el cargo es el de la experiencia actual o más reciente.

`PATCH /api/v1/mentorship/my-requests/:id/cancel` cancela solo una solicitud propia en `PENDIENTE`. La transacción vuelve a comprobar existencia y propiedad (404 `SOLICITUD_NO_ENCONTRADA`, sin revelar solicitudes ajenas), ejecuta un `updateMany` condicionado por `id`, `id_usuario` y `estado` y responde 409 `SOLICITUD_NO_PENDIENTE` si otra petición ganó la carrera. La fecha de cancelación queda en `fecha_actualizacion`; `fecha_respuesta` se reserva para la respuesta del mentor. La bandeja del mentor ya consulta `CANCELADO`, por lo que ve el cambio sin endpoint adicional.

El frontend vive en `/mentorship/requests` (`my-requests`) y reutiliza `ConfirmModal` para exigir confirmación. La vista de “enviadas” simulada que existía dentro de solicitudes recibidas fue eliminada: la bandeja `/mentorship/requests/received` solo acepta o rechaza solicitudes recibidas.
