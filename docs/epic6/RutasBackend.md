# Épica 6 · Rutas backend

## Contrato y arquitectura

La API Nest usa el prefijo global `/api/v1`. El proxy de Next reenvía las mismas rutas desde `/api/v1/...` del frontend y permite los módulos `job-postings` y `vacantes`. Todas las rutas pasan por los guards globales de sesión; las mutaciones con cookie exigen además `X-CSRF-Token`.

Las respuestas exitosas van envueltas en `{ "data": ... }` y los errores en `{ "error": { "code", "message" } }` (mensajes en español, códigos `SCREAMING_SNAKE`); la validación añade `error.fields`. Excepción heredada: `GET /api/v1/vacantes/mis-vacantes` devuelve un arreglo plano (deuda del módulo `vacantes`).

Este documento cubre las rutas del alcance del equipo epic6: los requisitos técnicos estructurados (HU-09) y la edición validada de vacantes (HU-13). El listado y detalle público de vacantes está documentado en [`docs/epic5/RutasBackend.md`](../epic5/RutasBackend.md).

**Tablas involucradas:** `vacante`, `vacante_requisito_tecnico` (creada por la migración `20261116190000_epic5_hu001_requisitos_tecnicos`) y `empresa` / `empresa_usuario_registros` para el scoping.

---

## `POST /api/v1/job-postings` — publicar vacante con requisitos (HU-09)

**Permiso:** `vacantes:create` (rol `empresa`). · **Controller:** `CreateJobPostingController` (`apps/api/src/modules/job-postings`). · **Schema:** `createJobPostingSchema` (Zod, estricto).

### Body

| Campo | Regla |
| --- | --- |
| `empresaId` | UUID de la empresa |
| `titulo` | string, 1-150 |
| `modalidad` | enum `PRESENCIAL \| HIBRIDO \| REMOTO` |
| `nivelExperiencia` | string, 1-100 |
| `descripcionTecnica` | string, 50-20000 |
| `requisitosTecnicos` | arreglo opcional de hasta 30 nombres (1-200 cada uno); por defecto `[]` |

### Comportamiento

- Crea la vacante con `estado = PUBLICADO` y, en la misma transacción, inserta los requisitos en `vacante_requisito_tecnico` con `nombre_normalizado` calculado con `normalize-technical-requirement-name`.
- El scoping se verifica en el caso de uso (`actor.scopes.companyIds`) y se re-filtra en el repositorio (`connect` por `id` + `id_usuario`); si la empresa no es del actor responde `404 COMPANY_NOT_FOUND`.

### Errores

- `400 VALIDATION_ERROR` — body fuera del schema (`error.fields` detalla).
- `403 FORBIDDEN` — sin el permiso `vacantes:create` o la empresa no pertenece al actor.
- `404 COMPANY_NOT_FOUND` — la empresa no existe.

---

## `PATCH /api/v1/vacantes/:id` — editar vacante validada (HU-13)

**Permiso:** `empresas:self:write` (rol `empresa`). · **Controller/Service:** `apps/api/src/modules/vacantes/`. · **Schema:** `updateVacanteSchema` (Zod, estricto). · **Bruno:** `bruno/Vacantes/006-editar-vacante.bru`. · **Detalle completo:** [`apps/api/docs/endpoints/epic5/HU13-editar-vacante-validada.md`](../../apps/api/docs/endpoints/epic5/HU13-editar-vacante-validada.md).

### Body (actualización parcial)

Todos los campos opcionales, pero debe venir **al menos uno**. No se aceptan campos adicionales.

| Campo | Regla |
| --- | --- |
| `titulo` | string, 1-150 |
| `modalidad` | enum `PRESENCIAL \| HIBRIDO \| REMOTO` |
| `nivel_experiencia` | string, 1-100 |
| `descripcion_tecnica` | string, 50-20000 |
| `estado` | string admitido por la política única: se normaliza a `PUBLICADO \| PAUSADO \| CERRADO` (acepta alias históricos) |
| `requisitosTecnicos` | hasta 30 nombres (1-200); si se envía, reemplaza la lista completa |

### Comportamiento

- Solo se escriben los campos enviados; el resto queda intacto.
- **Scoping:** la vacante debe pertenecer a la empresa del actor (dueño `empresa.id_usuario` o miembro activo `empresa_usuario_registros`). Si no, `404` sin revelar si existe.
- **Anti-doble-envío:** la actualización corre en una transacción con `pg_advisory_xact_lock(hashtext(idVacante))`; dos envíos simultáneos se serializan y el resultado es idéntico al de un solo envío.
- **Requisitos técnicos:** dentro de la misma transacción se re-verifica la propiedad, se eliminan los requisitos anteriores y se insertan los nuevos con `nombre_normalizado` (`skipDuplicates`).
- **Pendiente (HU-12):** el punto de enganche para el recálculo de afinidad está marcado en la transacción; se activará con el servicio de matching.

### Respuesta `200`

Devuelve la vacante actualizada.

### Errores

- `400 VALIDATION_ERROR` — body fuera del schema, sin campos o con campos adicionales.
- `401 UNAUTHENTICATED` — sesión ausente o CSRF faltante con cookie.
- `403 FORBIDDEN` — sin el permiso `empresas:self:write`.
- `404 NOT_FOUND` — la vacante no existe o no es de la empresa del actor.

---

## `GET /api/v1/vacantes/:id` — detalle para edición

**Controller/Service:** `apps/api/src/modules/vacantes/` (`obtenerVacantePorId`).

Devuelve el objeto de la vacante (sin envoltorio `data`, herencia del módulo) incluyendo `requisito_tecnico_registros` (los requisitos técnicos), que es lo que precarga el formulario de edición. Propiedad verificada igual que en la edición.

---

## `GET /api/v1/vacantes/mis-vacantes` — lista de la empresa

**Controller/Service:** `apps/api/src/modules/vacantes/` (`obtenerMisVacantes`).

Devuelve las vacantes de la empresa del actor ordenadas por `created_at` descendente, en un **arreglo plano** (sin envoltorio `data`; deuda heredada). La UI (`/empresa/mis-vacantes`) lo consume así y normaliza los estados para los filtros (Todas / Activas / Pausadas / Cerradas).

---

## Rutas relacionadas fuera del alcance

| Ruta | De quién | Nota |
| --- | --- | --- |
| `GET /api/v1/job-postings` y `GET /api/v1/job-postings/:id` | Épica 5 (HU-001) | Listado y detalle público con `requisitos[]`; ver `docs/epic5/RutasBackend.md` |
| `PATCH /api/v1/vacantes/:id/cerrar`, pausar y `DELETE /api/v1/vacantes/:id` | HU-14 (epic8) | Ciclo de vida; hoy pasan por la política única de estados y verifican la empresa |
| `GET /api/v1/vacantes/:idVacante/postulantes` | Épica 4 (HU-01) | Postulantes de la vacante |

## Pruebas que cubren estas rutas

- `apps/api/src/modules/vacantes/vacantes.schemas.spec.ts` — reglas del schema de edición.
- `apps/api/src/modules/vacantes/vacantes.service.spec.ts` — scoping (dueño / miembro activo / ajeno), campos parciales y bloqueo anti-doble-envío.
- `apps/api/src/modules/vacantes/vacantes.controller.routes.spec.ts` — ruteo HTTP real: 200 con datos validados, 400 con campos inválidos o adicionales, 404 del scoping y permiso requerido.
- `apps/api/src/modules/job-postings/infrastructure/repositories/prisma-job-posting.repository.spec.ts` — requisitos aislados por vacante.
- `apps/api/test/companies-job-postings.e2e.spec.ts` — publicación e2e (permisos, scoping, validaciones).
