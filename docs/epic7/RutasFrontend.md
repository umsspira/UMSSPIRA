# Epic 7 — rutas frontend

Inventario de rutas de pantalla que existen en el frontend. El alcance se resume en [ReporteEpica.md](./ReporteEpica.md). Los segmentos entre corchetes son parámetros dinámicos de Next.js.

## Gestión administrativa de eventos

| Ruta | Uso |
| --- | --- |
| `/events` | Panel y listado de gestión de eventos. |
| `/events/create` | Crear un evento, guardar un borrador, publicarlo o programar su publicación. |
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

## Asistencia, notificaciones y certificados — sprint 3

| Ruta o interfaz | HU | Uso |
| --- | --- | --- |
| Campanita y tarjeta temporal | HU13/HU16 | Mostrar cambios y cancelaciones en la campanita; mostrar avisos nuevos, incluidos recordatorios, en la tarjeta temporal. No tienen ruta independiente. |
| Panel de notificaciones del navbar y `/portal/eventos/mis-eventos` | HU13/HU16 | Activar o desactivar las notificaciones push del dispositivo. |
| Panel de recordatorios en `/events` | HU16 | Consultar y modificar la anticipación de los recordatorios. |
| `/events/[id]/scanner` | HU14 | Escanear y validar pases para registrar asistencia. |
| `/events/create`, `/events` y `/events/drafts/[id]` | HU15 | Programar una publicación, modificarla o cancelarla dentro de las pantallas existentes. |
| `/events/[id]/certificates` | HU17 | Consultar, cargar y confirmar la plantilla del certificado. |
| `/events/[id]/certificates/emit` | HU18 | Consultar el resumen y gestionar la emisión de certificados. |
| `/mis-certificados` | HU19 | Consultar los certificados propios. |
| `/mis-certificados/[certificateId]` | HU19 | Consultar el detalle y descargar un certificado propio. |

Las rutas administrativas requieren una sesión con permiso de gestión; las rutas de inscripción, pases y certificados propios están asociadas a la cuenta del titulado. La API valida los permisos efectivos. Este inventario describe rutas presentes en el código y no sustituye la validación de QA.
