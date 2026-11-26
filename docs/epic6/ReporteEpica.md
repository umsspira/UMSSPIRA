# Épica 6 · Reporte de la épica

**Estudios de Vacantes — HU-09 y HU-13** · Equipo epic6 · Estado al 25/11/2026, ramas `dev`, `feat/epic6-HU13-editar-vacante-validada` y `fix/epic6-HU13-bug01-bug02-editar-vacante`.

Este reporte cubre lo que el equipo epic6 entregó dentro de Épica 5 (Estudios de Vacantes): los **requisitos técnicos estructurados de la vacante (HU-09)** y la **edición validada de vacantes (HU-13)**, más las correcciones de QA sobre la edición. Qué rutas toca cada entrega está en [RutasBackend.md](./RutasBackend.md) y [RutasFrontend.md](./RutasFrontend.md).

## 1. Qué tenemos (entregado)

### HU-09 · Requisitos técnicos estructurados (PR #921)

- **Alta con requisitos:** `POST /api/v1/job-postings` acepta `requisitosTecnicos` (lista de hasta 30 nombres, cada uno de 1 a 200 caracteres) y los persiste en la tabla `vacante_requisito_tecnico` junto con `nombre_normalizado`, dentro de la misma transacción que crea la vacante.
- **Edición con requisitos:** `PATCH /api/v1/vacantes/:id` reemplaza la lista completa de requisitos en su transacción (baja y alta con `nombre_normalizado`, sin duplicados), con re-verificación de que la vacante es de la empresa del actor.
- **Lectura:** `GET /api/v1/job-postings` y `GET /api/v1/job-postings/:id` devuelven los requisitos (`requisitos[]` con nombre normalizado y sin duplicados por equivalencia de texto).
- **Frontend:** campo de requisitos con alta por Enter y chips eliminables (máximo 30, con contador y deduplicado) en el formulario de publicación (`publish-vacancy-form.tsx`) y en la página de edición de la vacante.
- **Pruebas:** aislamiento de requisitos por vacante y deduplicado en `prisma-job-posting.repository.spec.ts`; publicación e2e en `test/companies-job-postings.e2e.spec.ts`.

### HU-13 · Editar vacante validada (PR #910)

- **Validación Zod estricta** del body de `PATCH /api/v1/vacantes/:id`: mismos límites que el alta (título 1-150, modalidad `PRESENCIAL | HIBRIDO | REMOTO`, nivel 1-100, descripción 50-20000), `estado` normalizado al vocabulario único (`PUBLICADO | PAUSADO | CERRADO`) y `requisitosTecnicos`. Rechaza campos adicionales y bodies vacíos (400 `VALIDATION_ERROR` con `error.fields`).
- **Scoping por empresa:** puede editar el dueño de la empresa y los miembros activos (`empresa_usuario_registros`); quien no cumple recibe `404` sin revelar si la vacante existe.
- **Protección contra doble envío:** la actualización corre en una transacción con `pg_advisory_xact_lock` por vacante; dos envíos simultáneos se serializan y el resultado es el mismo que con un solo envío.
- **Permiso:** `@RequirePermissions('empresas:self:write')` (rol `empresa`).
- **Pruebas:** 47 tests del módulo `vacantes` (schema, servicio con scoping y campos parciales, y ruteo HTTP real con 200/400/404).
- **Documentación de entrega:** `apps/api/docs/endpoints/epic5/HU13-editar-vacante-validada.md` y `bruno/Vacantes/006-editar-vacante.bru`.

### Correcciones de QA sobre la edición (BUG-01 y BUG-02)

Rama `fix/epic6-HU13-bug01-bug02-editar-vacante` (reporte de Miguel Angel Massi Geronimo sobre HU 6.13).

| Bug | Qué pasaba | Cómo quedó |
| --- | --- | --- |
| BUG-01 (CAF-07) | "Guardar cambios" permanecía habilitado sin modificaciones y enviaba una actualización innecesaria | La página guarda una línea base de los valores precargados (modalidad, nivel, descripción y requisitos) y el botón queda **deshabilitado** mientras no hay diferencias; además `handleGuardar` no envía nada sin cambios. Se vuelve a deshabilitar después de guardar |
| BUG-02 (CAF-03) | La confirmación usaba la alerta nativa del navegador con un texto que no era el definido | Se reemplazaron las alertas nativas (éxito y error) por el componente propio `ActionNotice`: éxito con el mensaje **"Vacante actualizada correctamente"** (`role="status"`) y error con el mensaje del servidor (`role="alert"`, con reintentar) |

Cinco tests web nuevos cubren ambos bugs en `apps/web/src/app/(dashboard)/empresa/mis-vacantes/[id]/editar/page.test.tsx`.

## 2. Qué no tenemos (pendientes)

| Pendiente | De quién depende | Notas |
| --- | --- | --- |
| Recálculo de afinidad al guardar la vacante | HU-10 / HU-12 (epic7) | El punto de enganche está marcado en la transacción de `PATCH /vacantes/:id`; la propuesta acordada es confirmar el cambio de requisitos en la transacción y que la siguiente consulta compare el hash persistido para recalcular solo las postulaciones de esa vacante |
| Módulo `vacantes` fuera de la convención del repo | Deuda heredada | Sin arquitectura hexagonal, sin Zod en todas sus rutas y con respuestas sin envoltorio `{ data }` (por ejemplo `GET /vacantes/mis-vacantes` devuelve un arreglo plano). Se va corrigiendo ruta por ruta |
| Requisitos sin edición individual | Posible mejora | La edición reemplaza la lista completa; no hay reordenamiento ni edición de un requisito suelto |
| Título no editable en el formulario de edición | Decisión a confirmar con el PO | El campo título está en solo lectura en `/empresa/mis-vacantes/[id]/editar`; el endpoint sí acepta modificarlo |
| Migración de `vacante_requisito_tecnico` en producción | Operación | Sin `pnpm --filter api db:deploy` contra el `DIRECT_URL` de producción, el listado de vacantes responde 500 (la tabla no existe en la BD remota) |
| Pruebas e2e de edición contra BD real | Calidad | Hoy las pruebas del módulo usan el patrón del propio módulo (servicio y ruteo HTTP con dobles); la integración con Postgres real queda pendiente |

## 3. Cosas que no esperábamos

| Qué pasó | Impacto | Cómo lo resolvimos |
| --- | --- | --- |
| El formulario de edición enviaba las etiquetas visibles ("Híbrido", "Remoto") en vez del vocabulario canónico de la API | La validación estricta de HU-13 habría rechazado el guardado con 400 | La página mapea las etiquetas al vocabulario canónico antes de enviar (`fix(web)` del PR #910) |
| La tabla `vacante_requisito_tecnico` (migración `20261116190000_epic5_hu001_requisitos_tecnicos`) no estaba aplicada en la BD de producción | `GET /api/v1/job-postings` respondía `500 INTERNAL_ERROR` y la bolsa de trabajo no cargaba | Se aplicaron las migraciones pendientes con `db:deploy`; el error genérico venía de un fallo de Prisma sin traducción |
| Los bugs de QA se reportaron contra una versión que ya incluía el trabajo de requisitos fusionado en `dev` | Corregir sobre la rama antigua habría duplicado trabajo | Las correcciones se hicieron sobre `dev` (rama `fix/epic6-HU13-bug01-bug02-editar-vacante`) |
| commitlint rechaza mensajes de commit de más de 100 caracteres | Un commit quedó sin crear | Mensaje más corto; recordarlo en los próximos commits del equipo |

## 4. Cómo probar

1. `pnpm --filter api db:deploy`, `pnpm --filter api prisma:generate` y `pnpm --filter api db:seed:demo` (con `APP_ENV=dev`, `epic` o `test`).
2. En `apps/web/.env.local`: `NEXT_PUBLIC_API_URL=http://localhost:3000` y `NEXT_PUBLIC_USE_MOCK=false`.
3. `pnpm run dev`.
4. Entrar con la cuenta de empresa (`empresa@umss.edu.bo` / `empresa1234`):
   - **HU-09:** publicar una vacante en `/empresa/vacantes/publicar` agregando requisitos con Enter, y verificar que aparecen en el listado y el detalle público.
   - **HU-13:** editar una vacante propia desde `/empresa/mis-vacantes` y verificar que un body fuera del schema responde 400, que un usuario ajeno recibe 404 y que los miembros activos de la empresa pueden editar.
   - **BUG-01/02:** en la edición, comprobar que "Guardar cambios" está deshabilitado sin cambios, que se habilita al modificar, y que al guardar aparece "Vacante actualizada correctamente" sin alertas del navegador.

## 5. Referencias

- [RutasBackend.md](./RutasBackend.md) — endpoints del alcance del equipo.
- [RutasFrontend.md](./RutasFrontend.md) — páginas y componentes del alcance del equipo.
- `apps/api/docs/endpoints/epic5/HU13-editar-vacante-validada.md` — contrato completo de la edición.
- `bruno/Vacantes/006-editar-vacante.bru` — request manual de edición.
- `docs/epic5/RutasBackend.md` — contrato del listado y detalle público de vacantes.
