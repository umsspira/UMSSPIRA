# Reporte de la Épica 7 · Gestión de eventos

Este reporte resume lo implementado durante los tres sprints y los imprevistos encontrados durante el desarrollo y la integración. Las rutas de pantalla y API están en [RutasFrontend.md](./RutasFrontend.md) y [RutasBackend.md](./RutasBackend.md).

## 1. Objetivo

Permitir la gestión y publicación de eventos, su consulta por parte de titulados, la inscripción y administración de cupos, el uso de pases QR, el registro de asistencia, las notificaciones y los certificados.

## 2. Qué implementamos

### Sprint 1 · Creación y consulta de eventos — completado

- **HU1.1:** crear y guardar eventos como borradores, validar sus datos y gestionar sus portadas.
- **HU1.2:** publicar eventos válidos para que aparezcan en el catálogo.
- **HU2.1:** consultar el catálogo público de eventos disponibles.
- **HU2.2:** consultar el detalle de un evento publicado.

### Sprint 2 · Inscripciones y pases QR — completado

- **HU3:** inscribirse a un evento publicado, con control de cupos y duplicados.
- **HU4:** cancelar una inscripción propia y liberar el cupo.
- **HU5:** modificar un evento publicado.
- **HU6:** cancelar un evento publicado.
- **HU7:** retirar eventos cancelados o finalizados de la gestión activa, preservando el historial cuando corresponda.
- **HU8:** consultar participantes y ocupación de un evento.
- **HU9:** consultar las inscripciones propias y su estado.
- **HU10:** generar o asociar un pase QR único a una inscripción confirmada.
- **HU11:** consultar los pases QR propios y su vigencia.

### Sprint 3 · Offline, asistencia, notificaciones y certificados — completado

- **HU12:** guardar y consultar pases QR sin conexión desde la PWA, mediante almacenamiento local y una vista offline.
- **HU13:** gestionar las suscripciones y notificaciones push de eventos, incluyendo su visualización en el panel de notificaciones.
- **HU14:** escanear y validar pases QR para registrar asistencia a un evento propio.
- **HU15:** programar, modificar y cancelar la publicación de eventos desde las pantallas de borrador.
- **HU16:** configurar la anticipación y enviar recordatorios de eventos mediante un worker, con persistencia y prevención de envíos duplicados.
- **HU17:** cargar, consultar y confirmar la plantilla PDF de certificados de un evento.
- **HU18:** generar certificados para los participantes y consultar el estado y resumen de emisión.
- **HU19:** consultar y descargar los certificados propios.

Los cambios y cancelaciones aparecen en la campanita. Los recordatorios nuevos se muestran en la tarjeta temporal mientras la aplicación está activa, pero no en la campanita. Los avisos push son opcionales y requieren la suscripción del dispositivo.

## 3. Qué no esperábamos

| Situación inesperada | Impacto | Cómo se resolvió |
| --- | --- | --- |
| La Supabase de la Épica 7 tenía un historial de migraciones distinto al de la rama; aparecían migraciones de otras épicas y archivos faltantes. | `prisma migrate status` reportó diferencias y faltaban tablas o columnas consultadas por los workers de publicación programada y recordatorios. | Se recuperó la migración faltante desde `dev` y se aplicaron las migraciones de eventos cuando se confirmó que correspondía. Como `db:deploy` no filtra por épica, se acordó revisar el estado antes de desplegar migraciones adicionales. |
| Los recordatorios no llegaban al activarlos desde la aplicación. | El flujo usa push del navegador, requiere suscripción y configuración VAPID coincidente, y no reenvía avisos vencidos antes de activar la suscripción. | Se configuró la suscripción local, se comprobó la pareja de claves sin incluirlas en el repositorio y se reiniciaron los servicios. |
| Cambiar la fecha u hora de un evento producía un error SQL al reprogramar recordatorios (`42804`). | La edición del evento podía responder 500 y dejar sin actualizar la programación del aviso. | Se corrigió el cálculo del intervalo y se ajustó la consulta de reprogramación; pasaron las pruebas específicas, el chequeo de tipos y el lint. |

Las claves, credenciales y valores de entorno se configuran localmente y no se incluyen en este reporte.

## Mejoras candidatas para una versión futura

Son propuestas para evaluar, no funcionalidades comprometidas ni exclusiones aprobadas.

- **Lista de espera para eventos sin cupos:** permitir que un titulado se anote y ofrecer automáticamente un cupo liberado por una cancelación.
- **Sincronización con calendarios:** descargar un evento como archivo ICS o agregarlo a un calendario externo.
- **Exportación de participantes y asistencia:** descargar listados o resúmenes de ocupación para uso administrativo, por ejemplo en CSV.
- **Descubrimiento avanzado de eventos:** filtrar por categoría, modalidad, ubicación o rango de fechas, o guardar eventos favoritos.

## Notas para mantenimiento

- Los segmentos entre corchetes de las rutas, por ejemplo `[id]`, representan parámetros dinámicos.
- El grupo de rutas Next.js `(dashboard)` organiza el código, pero no forma parte de la URL pública.
- No guardar credenciales, claves privadas ni valores de `.env` en esta documentación.
