# Epic 7 — rutas frontend

Inventario de rutas de pantalla que existen en el frontend. El estado de cada HU se describe en [AlcanceEpic7.md](./AlcanceEpic7.md). Los segmentos entre corchetes son parámetros dinámicos de Next.js.

## Gestión administrativa de eventos

| Ruta | Uso |
| --- | --- |
| `/events` | Panel y listado de gestión de eventos. |
| `/events/create` | Crear un evento como borrador. |
| `/events/drafts` | Consultar los borradores propios. |
| `/events/drafts/[id]` | Consultar y editar un borrador y gestionar su publicación. |
| `/events/[id]` | Consultar la vista administrativa de un evento. |
| `/events/[id]/edit` | Editar un evento publicado. |
| `/events/inactive` | Consultar eventos cancelados o finalizados y retirarlos de la gestión activa. |
| `/events/[id]/participants` | Consultar participantes y ocupación. |

## Catálogo e inscripción — sprints 1 y 2

| Ruta | Uso |
| --- | --- |
| `/portal/eventos` | Catálogo de eventos para titulados. |
| `/portal/eventos/[id]` | Detalle del evento e inscripción cuando esté disponible. |
| `/portal/eventos/mis-eventos` | Consultar inscripciones propias, sus estados y cancelar una inscripción cuando corresponda. |
| `/events/catalog` | Ruta de catálogo conservada por compatibilidad. |
| `/events/catalog/[id]` | Ruta de detalle conservada por compatibilidad. |

## Pases QR — sprints 2 y 3

| Ruta | Uso |
| --- | --- |
| `/mis-pases` | Listar y filtrar los pases QR propios. |
| `/mis-pases/[passId]` | Consultar el detalle de un pase QR; HU12 puede mostrar el pase guardado si no hay conexión. |
| `/mis-pases/offline` | Consultar los pases guardados localmente para el uso sin conexión de HU12. |
| `/events/catalog/passes` | Ruta anterior de pases, conservada por compatibilidad. |
| `/offline` | Pantalla de fallback general del service worker cuando una página no está disponible sin conexión; no reemplaza la vista offline de los pases. |

## Sprint 3 y estado parcial

| Ruta o interfaz | HU | Estado |
| --- | --- | --- |
| `/events/[id]/scanner` | HU14 | Completada: escaneo y validación de pases para registrar asistencia. |
| `/events/create`, `/events` y `/events/drafts/[id]` | HU15 | Completada: programar una publicación, modificarla o cancelarla dentro de las pantallas existentes; no tiene una ruta separada. |
| Panel de permisos/notificaciones del navbar | HU13 | Parcial/incompleta; no es una ruta independiente. |
| `/events/[id]/certificates` | HU18/HU19 | Hay una pantalla en el código, pero las historias permanecen incompletas según el estado comunicado; confirmar el mapeo exacto de la pantalla. |
| HU16 y HU17 | HU16/HU17 | Pendientes; no se documentan como rutas entregadas. |

Las rutas administrativas requieren una sesión con permiso de gestión; las rutas de inscripción y pases están asociadas a la cuenta del titulado. La API valida los permisos efectivos.
