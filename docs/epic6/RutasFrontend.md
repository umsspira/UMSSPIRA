# Épica 6 · Rutas frontend

Rutas del alcance del equipo epic6 dentro de **Estudios de Vacantes**: los requisitos técnicos estructurados (HU-09) y la edición validada de vacantes (HU-13, con las correcciones BUG-01 y BUG-02). Todas están bajo el grupo de rutas `(dashboard)` con la sesión protegida por `apps/web/src/middleware.ts` y el rol `empresa`.

| Ruta | Qué muestra |
| --- | --- |
| `/empresa/vacantes/publicar` | Alta de vacante con requisitos técnicos |
| `/empresa/mis-vacantes` | Lista de vacantes de la empresa con acciones (pausar, cerrar, eliminar) |
| `/empresa/mis-vacantes/[id]` | Detalle de la vacante propia |
| `/empresa/mis-vacantes/[id]/editar` | Edición validada de la vacante (HU-13, BUG-01, BUG-02) |

---

## `/empresa/vacantes/publicar` · Publicar vacante (HU-09)

| | |
| --- | --- |
| Página | `apps/web/src/app/(dashboard)/empresa/vacantes/publicar/page.tsx` |
| Componente | `apps/web/src/shared/components/publish-vacancy-form.tsx` |
| Servicio | `apps/web/src/shared/services/job-postings.ts` → `createJobPosting()` |
| Llamada | `POST /api/v1/job-postings` con `requisitosTecnicos`, a través del proxy del mismo origen |

El formulario tiene título, modalidad, nivel de experiencia, descripción técnica y el campo de **requisitos técnicos**: se agrega cada requisito con Enter, aparece como chip eliminable, hay deduplicado por nombre normalizado y un contador de 30. El `empresaId` se inyecta en el servicio con la empresa del usuario autenticado.

---

## `/empresa/mis-vacantes` · Mis vacantes

| | |
| --- | --- |
| Página | `apps/web/src/app/(dashboard)/empresa/mis-vacantes/page.tsx` |
| Servicio | `apps/web/src/shared/services/vacancies.ts` y llamadas directas a la API |
| Llamadas | `GET /api/v1/vacantes/mis-vacantes`, `PATCH /api/v1/vacantes/:id` (pausar), `PATCH /api/v1/vacantes/:id/cerrar`, `DELETE /api/v1/vacantes/:id` |

Lista las vacantes de la empresa con filtros por estado (Todas / Activas / Pausadas / Cerradas), badges de estado y acciones por fila: editar (enlace a la edición), pausar, cerrar y eliminar con confirmación.

---

## `/empresa/mis-vacantes/[id]` · Detalle de la vacante

| | |
| --- | --- |
| Página | `apps/web/src/app/(dashboard)/empresa/mis-vacantes/[id]/page.tsx` |
| Llamada | `GET /api/v1/vacantes/:id` |

Muestra los datos de la vacante propia y enlaces a la edición y a los postulantes (`/empresa/mis-vacantes/[id]/candidatos`, alcance de Épica 4).

---

## `/empresa/mis-vacantes/[id]/editar` · Editar vacante (HU-13, BUG-01, BUG-02)

| | |
| --- | --- |
| Página | `apps/web/src/app/(dashboard)/empresa/mis-vacantes/[id]/editar/page.tsx` |
| Componente de avisos | `apps/web/src/shared/components/action-notice.tsx` (`ActionNotice`) |
| Estados de pantalla | `apps/web/src/app/(dashboard)/empresa/_components/estado-pantalla.tsx` (`Cargando`, `EstadoError`) |
| Llamadas | `GET /api/v1/vacantes/:id` (precarga) y `PATCH /api/v1/vacantes/:id` (guardado) |

### Campos

- **Título** — en solo lectura (el endpoint sí permite modificarlo; pendiente decidir con el PO).
- **Modalidad** y **Nivel de experiencia** — selects con etiquetas legibles ("Híbrido", "Junior"); al guardar se mapean al vocabulario que valida la API (`HIBRIDO`, `JUNIOR`).
- **Descripción técnica** — textarea.
- **Requisitos técnicos** — mismos chips que en publicación (alta con Enter, eliminación, máximo 30).
- Badge de estado de la vacante (normalizado con `shared/utils/vacancy-status`).

### BUG-01 · Guardar cambios sin modificaciones

La página guarda una **línea base** de los valores precargados (modalidad, nivel, descripción y requisitos). El botón **Guardar cambios** permanece **deshabilitado** mientras no hay diferencias con esa línea base, se habilita al modificar cualquier campo (incluidos los requisitos) y se vuelve a deshabilitar si se revierten los cambios o después de guardar. Como refuerzo, `handleGuardar` no envía la petición si no hay cambios: nunca se realiza una actualización innecesaria.

### BUG-02 · Confirmación del guardado

No se usan alertas nativas del navegador. La confirmación se muestra con el componente propio `ActionNotice`:

- **Éxito:** mensaje "Vacante actualizada correctamente" (`role="status"`, ícono + texto, accesible).
- **Error:** mensaje del servidor (`role="alert"`) con botón de reintentar.

La página no navega automáticamente al guardar (para que la confirmación sea visible); el usuario vuelve con el enlace "Volver a Mis vacantes" o el botón "Cancelar".

### Estados de la pantalla

1. **Carga** — `Cargando` mientras se precarga la vacante.
2. **Error de carga** — `EstadoError` con "Reintentar" (recarga la vacante).
3. **Edición** — formulario con Guardar habilitado solo con cambios.
4. **Guardado** — aviso de éxito y botón deshabilitado de nuevo.
5. **Error al guardar** — aviso de error con el mensaje del servidor y reintentar.

---

## Pruebas web

| Archivo | Qué cubre |
| --- | --- |
| `apps/web/src/app/(dashboard)/empresa/mis-vacantes/[id]/editar/page.test.tsx` | BUG-01 (botón deshabilitado sin cambios, habilita/re-deshabilita al modificar/revertir, no envía PATCH sin cambios) y BUG-02 (confirmación propia con el mensaje definido, errores del servidor, cero llamadas a `window.alert`) |

Pruebas relacionadas de otras épicas: `publish-vacancy-form` y la lista de postulantes (`applicants.test.ts`, Épica 4).
