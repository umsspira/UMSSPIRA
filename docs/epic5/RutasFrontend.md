# Épica 5 — Rutas de Frontend

Rutas de la aplicación web (Next.js 14, App Router, `apps/web/src/app/`) trabajadas en las historias **HU2** y **HU10**.

- **HU2:** Gestión de requisitos técnicos por vacante.
- **HU10:** Visualizar vacantes con su porcentaje de afinidad.

Las pantallas llaman al backend a través del proxy de Next.js `/api/v1/[...path]` (`apps/web/src/app/api/v1/[...path]/route.ts`). Las rutas de API están en [RutasBackend.md](./RutasBackend.md).

## Resumen

| HU | Ruta | Rol que la usa | Estado en la HU |
| --- | --- | --- | --- |
| HU2 | `/empresa/mis-vacantes/:id/requisitos-tecnicos` | Empresa | Nueva |
| HU2 | `/empresa/vacantes/publicar` | Empresa | Modificada (redirección) |
| HU2 | `/empresa/mis-vacantes/:id` | Empresa | Modificada (acceso a requisitos) |
| HU10 | `/job-postings` | Titulado | Modificada (afinidad por vacante) |
| HU10 | `/job-postings/:id` | Titulado | Consume la afinidad del detalle |

## HU2 — Requisitos técnicos por vacante

### `/empresa/mis-vacantes/:id/requisitos-tecnicos`

- **Descripción:** Pantalla para consultar, agregar, editar y quitar las competencias técnicas de una vacante, y guardar la lista completa.
- **Parámetro:** `:id` es el UUID de la vacante.
- **Archivos:**
  - Página: `apps/web/src/app/(dashboard)/empresa/mis-vacantes/[id]/requisitos-tecnicos/page.tsx`
  - Componente: `apps/web/src/modules/job-postings/frontend/components/technical-requirements-manager.tsx`
  - Servicio HTTP: `apps/web/src/modules/job-postings/frontend/services/technical-requirements.service.ts`
- **Llamadas al backend:**
  - `GET /api/v1/job-postings/:vacancyId/technical-requirements` (carga inicial)
  - `PUT /api/v1/job-postings/:vacancyId/technical-requirements` (botón **Guardar requisitos**)
- **Navegación desde la pantalla:** **Mis vacantes** y **Atrás** vuelven a `/empresa/mis-vacantes`.
- **Estados:** carga, lista vacía, aviso de éxito y errores.
- **Acceso:** requiere sesión. La API exige el permiso `vacantes:create` y que la vacante pertenezca a una empresa del actor.

### `/empresa/vacantes/publicar`

- **Descripción:** Formulario de publicación de vacantes. Tras publicar correctamente, redirige a `/empresa/mis-vacantes/:id/requisitos-tecnicos` de la vacante recién creada.
- **Archivos:**
  - Página: `apps/web/src/app/(dashboard)/empresa/vacantes/publicar/page.tsx`
  - Formulario: `apps/web/src/shared/components/publish-vacancy-form.tsx`
- **Llamada al backend:** `POST /api/v1/job-postings`.

### `/empresa/mis-vacantes/:id`

- **Descripción:** Detalle de una vacante de la empresa. Incluye el botón **Requisitos técnicos**, que navega a `/empresa/mis-vacantes/:id/requisitos-tecnicos`.
- **Archivo:** `apps/web/src/app/(dashboard)/empresa/mis-vacantes/[id]/page.tsx`.

## HU10 — Vacantes con porcentaje de afinidad

### `/job-postings`

- **Descripción:** Listado de vacantes publicadas y disponibles. Para un titulado muestra en cada tarjeta el porcentaje de afinidad con su perfil, o `No disponible` si no hay cálculo. Incluye el botón **Actualizar lista**, que vuelve a consultar la API.
- **Archivos:**
  - Página: `apps/web/src/app/(dashboard)/job-postings/page.tsx`
  - Componente: `apps/web/src/app/(dashboard)/job-postings/job-postings-list.tsx`
  - Servicio HTTP: `apps/web/src/shared/services/job-postings.ts`
  - Acceso desde el encabezado del titulado (**Bolsa de trabajo**): `apps/web/src/modules/auth/frontend/components/titulado-header.tsx`
- **Llamada al backend:** `GET /api/v1/job-postings`.
- **Estados:** carga, listado con resultados, afinidad calculada, afinidad no disponible, listado vacío, error con **Reintentar**.
- **Acceso:** el middleware de Next.js (`apps/web/src/middleware.ts`) exige sesión para `/job-postings` y `/job-postings/*`. El panel de afinidad solo se muestra al rol `titulado`.

### `/job-postings/:id`

- **Descripción:** Detalle de una vacante disponible. Para un titulado muestra la afinidad devuelta por la API; si es `null` indica **Afinidad no calculada**. Una vacante no disponible muestra **Esta vacante ya no está disponible**.
- **Parámetro:** `:id` es el UUID de la vacante.
- **Archivos:**
  - Página: `apps/web/src/app/(dashboard)/job-postings/[id]/page.tsx`
  - Componente: `apps/web/src/app/(dashboard)/job-postings/[id]/vacancy-detail-client.tsx`
- **Llamada al backend:** `GET /api/v1/job-postings/:id`.
- **Navegación:** **Volver a vacantes** regresa a `/job-postings`.

## Proxy de la API (compartido)

| Ruta | Archivo | Uso en HU2 / HU10 |
| --- | --- | --- |
| `/api/v1/[...path]` | `apps/web/src/app/api/v1/[...path]/route.ts` | Reenvía al backend las llamadas a `job-postings` (GET, POST y PUT) |
