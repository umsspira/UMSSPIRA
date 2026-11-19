# Epic 7 — alcance y estado

Este documento resume las historias de usuario recibidas para los tres sprints y el estado de entrega indicado por el responsable de Epic 7. Las rutas se detallan en [RutasFrontend.md](./RutasFrontend.md) y [RutasBackend.md](./RutasBackend.md).

## Sprint 1 — completado

| HU | Funcionalidad |
| --- | --- |
| HU1.1 | Crear y guardar borradores de eventos, validar sus datos y gestionar sus portadas. |
| HU1.2 | Publicar eventos válidos para que estén disponibles en el catálogo. |
| HU2.1 | Consultar el catálogo público de eventos disponibles. |
| HU2.2 | Consultar el detalle de un evento publicado. |

En este sprint, el detalle no incluía inscripción, pases QR, asistencia, modo sin conexión ni notificaciones push; esas capacidades corresponden a historias posteriores.

## Sprint 2 — completado

| HU | Funcionalidad |
| --- | --- |
| HU3 | Inscribirse a un evento publicado, con control de cupos y duplicados. |
| HU4 | Cancelar la propia inscripción y liberar el cupo. |
| HU5 | Modificar un evento publicado. |
| HU6 | Cancelar un evento publicado. |
| HU7 | Retirar eventos cancelados o finalizados de la gestión activa, preservando relaciones cuando corresponda. |
| HU8 | Consultar participantes y ocupación de un evento. |
| HU9 | Consultar las inscripciones propias y su estado. |
| HU10 | Generar o asociar un pase QR único a una inscripción confirmada. |
| HU11 | Consultar los pases QR propios y su vigencia. |

## Sprint 3 — estado comunicado

| HU | Funcionalidad | Estado |
| --- | --- | --- |
| HU12 | Consultar el pase QR sin conexión, con los datos guardados previamente en la PWA. | Completada |
| HU13 | Suscripción y notificaciones push relacionadas con eventos. | Incompleta; no declararla entregada. |
| HU14 | Validar pases QR y registrar asistencia. | Completada |
| HU15 | Programar, modificar y cancelar la publicación de un evento. | Completada |
| HU16 | Pendiente de completar según el responsable de Epic 7. | Incompleta |
| HU17 | Pendiente de completar según el responsable de Epic 7. | Incompleta |
| HU18 | Pendiente de completar según el responsable de Epic 7. | Incompleta |
| HU19 | Pendiente de completar según el responsable de Epic 7. | Incompleta |

## Límites de esta entrega

- Se consideran entregadas las HUs de los sprints 1 y 2, y únicamente HU12, HU14 y HU15 del sprint 3.
- HU13 y HU16 a HU19 quedan pendientes; no se deben presentar como trabajo completado ni como validado por QA.
- El repositorio contiene partes de la implementación de HU13 y rutas relacionadas con certificados. Su presencia en el código no cambia el estado comunicado: esas historias siguen incompletas hasta cerrar su alcance, integración y validación.
- El modo sin conexión corresponde a HU12; la asistencia presencial mediante escaneo corresponde a HU14. Son flujos distintos.
- Las exclusiones permanentes adicionales deben confirmarse con el backlog o con el responsable de la épica. No se infieren solo porque una ruta o función no aparezca en el código actual.

## Mejoras candidatas para una versión futura

Estas son ideas que no aparecen en las historias de los sprints 1–3 compartidas. Son propuestas, no funcionalidades comprometidas ni exclusiones aprobadas. Antes de presentarlas como fuera de alcance, compararlas con el contenido de HU13 y HU16–HU19, que aún está pendiente.

- **Lista de espera para eventos sin cupos:** permitir que un titulado se anote y ofrecer automáticamente un cupo liberado por una cancelación.
- **Sincronización con calendarios:** descargar un evento como archivo ICS o agregarlo a un calendario externo.
- **Exportación de participantes y asistencia:** descargar listados o resúmenes de ocupación para uso administrativo, por ejemplo en CSV.
- **Descubrimiento avanzado de eventos:** filtrar por categoría, modalidad, ubicación o rango de fechas, o guardar eventos favoritos.

## Notas para mantenimiento

- Los segmentos entre corchetes de las rutas, por ejemplo `[id]`, representan parámetros dinámicos.
- El grupo de rutas Next.js `(dashboard)` organiza el código, pero no forma parte de la URL pública.
- No guardar credenciales, claves privadas ni valores de `.env` en esta documentación.
