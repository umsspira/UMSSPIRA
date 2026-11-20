# HU-001 · Rutas frontend

## Alcance

La bolsa existente para titulados era contenido institucional estático en `/portal/empleos`; no consultaba vacantes reales. HU-001 conserva la página y el diseño del portal, reemplaza las tarjetas demostrativas de ofertas por el listado consultado y añade el detalle de una vacante. La escritura de requisitos no forma parte de HU-001.

Las pantallas reutilizan `PortalLayout`, los colores y tipografía del portal, `Spinner` y `ErrorAlert`. No hay datos de vacantes de prueba en el código de producción.

## `/portal/empleos` — listado de vacantes

| Propiedad | Implementación |
|---|---|
| Página | [`apps/web/src/app/portal/empleos/page.tsx`](../../apps/web/src/app/portal/empleos/page.tsx) |
| Vista institucional | [`apps/web/src/app/portal/institucional/institucional-views.tsx`](../../apps/web/src/app/portal/institucional/institucional-views.tsx), componente `EmpleosView` |
| Listado y estados | [`apps/web/src/app/portal/empleos/_components/available-job-postings.tsx`](../../apps/web/src/app/portal/empleos/_components/available-job-postings.tsx), componente `AvailableJobPostingsSection` |
| Servicio | [`apps/web/src/shared/services/available-job-postings.ts`](../../apps/web/src/shared/services/available-job-postings.ts) |
| Llamada | `GET /api/v1/job-postings`, a través del proxy del mismo origen |
| Middleware | [`apps/web/src/middleware.ts`](../../apps/web/src/middleware.ts); protege `/portal/empleos` y sus subrutas |

`AvailableJobPostingsSection` consulta al montar y nuevamente al pulsar «Reintentar». No conserva resultados antiguos si falla una nueva consulta.

### Estados y textos

- **Cargando:** `Spinner`, indicador `role="status"` y el texto «Cargando vacantes disponibles. Espera un momento...», con tarjetas skeleton.
- **Vacío:** «Aún no hay vacantes disponibles» y enlace «Volver al inicio» hacia `/portal`.
- **Error:** `ErrorAlert` con título «No pudimos cargar las vacantes», mensaje amigable y botón «Reintentar».
- **Éxito:** una tarjeta por elemento retornado por la API, mostrando `titulo`, `empresa` y enlace «Ver oferta». El enlace apunta a `/portal/empleos/{id}`.

## `/portal/empleos/[id]` — detalle

| Propiedad | Implementación |
|---|---|
| Página dinámica | [`apps/web/src/app/portal/empleos/[id]/page.tsx`](../../apps/web/src/app/portal/empleos/[id]/page.tsx) |
| Componente | [`apps/web/src/app/portal/empleos/_components/job-posting-detail.tsx`](../../apps/web/src/app/portal/empleos/_components/job-posting-detail.tsx), componente `JobPostingDetail` |
| Servicio | [`apps/web/src/shared/services/available-job-postings.ts`](../../apps/web/src/shared/services/available-job-postings.ts) |
| Llamada | `GET /api/v1/job-postings/{id}`, a través del proxy del mismo origen |
| Parámetro | `id`, UUID obtenido de la tarjeta «Ver oferta» |

### Estados y textos

- **Cargando:** `Spinner` con «Cargando oferta. Espera un momento...».
- **404:** «Esta vacante no existe o ya no está disponible» y enlace para volver a la lista. No se muestran datos de otra oferta.
- **Fallo de conexión/servidor:** alerta «No pudimos cargar los requisitos», explicación amigable y botón «Reintentar».
- **Detalle cargado:** empresa, puesto, descripción registrada, modalidad, nivel de experiencia y fecha de publicación.
- **Sin requisitos:** cuando `requisitos` es `[]`, se muestra «Esta vacante no requiere conocimientos técnicos específicos».
- **Con requisitos:** cada requisito se muestra una sola vez; la deduplicación se realiza en el presenter de backend y el frontend representa la respuesta.

## Criterios de aceptación cubiertos

| Criterio | Ruta/estado |
|---|---|
| CA-01 | El listado muestra las vacantes recibidas del endpoint, en orden reciente y sin duplicados de consulta; cada tarjeta tiene puesto, empresa y «Ver oferta». |
| CA-02 | Cada entrada procede de una nueva lectura; el proxy aplica `no-store` y la API vuelve a evaluar el estado y `fecha_cierre`. |
| CA-03 | Estado de carga del listado y texto exacto indicados arriba. |
| CA-04 | Estado vacío y enlace «Volver al inicio». |
| CA-05 | Error de listado sin mostrar datos anteriores y reintento. |
| CA-06 | «Ver oferta» abre `/portal/empleos/[id]`, que consulta el detalle y requisitos actuales. |
| CA-07 | Se muestran los requisitos deduplicados por nombre normalizado por el backend. |
| CA-08 | El detalle recibe únicamente requisitos asociados a la vacante solicitada. |
| CA-09 | Mensaje específico cuando el detalle devuelve `requisitos: []`. |
| CA-10 | La respuesta 404 produce un estado de vacante no encontrada/no disponible sin datos de otros puestos. |
| CA-11 | Los errores al cargar el detalle y sus requisitos presentan una alerta amigable con reintento. |

## Pruebas frontend

- [`available-job-postings.test.tsx`](../../apps/web/src/app/portal/empleos/_components/available-job-postings.test.tsx): carga, vacío, error/reintento y tarjeta con datos del servicio.
- [`job-posting-detail.test.tsx`](../../apps/web/src/app/portal/empleos/_components/job-posting-detail.test.tsx): detalle, requisitos vacíos, 404 y fallo de conexión/reintento.
- Las pruebas aíslan el servicio HTTP; los datos de prueba existen únicamente en el entorno de tests.

## Proxy y acceso

El proxy [`apps/web/src/app/api/v1/[...path]/route.ts`](../../apps/web/src/app/api/v1/%5B...path%5D/route.ts) ya incluye `job-postings` en `MODULES`; no se modificó. El matcher de [`apps/web/src/middleware.ts`](../../apps/web/src/middleware.ts) ahora incluye `/portal/empleos/:path*` para que el detalle también quede cubierto por la sesión existente.

## Archivos de frontend relacionados

- Modificados: `apps/web/src/app/portal/institucional/institucional-views.tsx`, `apps/web/src/middleware.ts`.
- Añadidos: `apps/web/src/app/portal/empleos/[id]/page.tsx`, `apps/web/src/app/portal/empleos/_components/available-job-postings.tsx`, `apps/web/src/app/portal/empleos/_components/job-posting-detail.tsx`, sus dos tests y `apps/web/src/shared/services/available-job-postings.ts`.
- El archivo de página existente [`apps/web/src/app/portal/empleos/page.tsx`](../../apps/web/src/app/portal/empleos/page.tsx) y el proxy no requieren cambios.
