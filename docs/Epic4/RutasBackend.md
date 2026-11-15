# Épica 4 · Rutas backend

Portal de Empresas (equipo G6). API `apps/api` (NestJS). Todas las rutas llevan el prefijo `/api/v1`. Estado según la rama `epic4` al 14/11/2026.

Salvo las marcadas como públicas, todas requieren sesión iniciada.

## Invitaciones y registro de empresas · `companies`

| Método | Ruta | Permiso | Qué hace |
| --- | --- | --- | --- |
| `POST` | `/companies/invitations` | `empresas:invite` | El administrador registra una empresa y le envía la invitación por correo |
| `GET` | `/companies/invitations/:token` | Pública | Valida el enlace de invitación (vigente, vencido, usado o cancelado) |
| `POST` | `/companies/invitations/:token/activate` | Pública | Activa la cuenta de la empresa desde la invitación |
| `POST` | `/companies/invitations/:invitationId/resend` | `empresas:invite` | Reenvía una invitación (desde el registro de empresas) |
| `GET` | `/companies/registry` | `empresas:invite` | Lista el registro de empresas e invitaciones para el administrador |

Archivos: `apps/api/src/modules/companies/http/controllers/*-company-invitation.controller.ts`, `list-company-registry.controller.ts`.

## Perfil de la empresa · `companies`

| Método | Ruta | Permiso | Qué hace |
| --- | --- | --- | --- |
| `GET` | `/companies/:companyId/header` | `empresas:self:read` | Encabezado del perfil (nombre, eslogan, logo y banner) |
| `GET` | `/companies/:companyId/contact` | `empresas:self:read` | Datos de contacto (teléfono, dirección) |
| `PUT` | `/companies/:companyId/profile` | `empresas:self:write` | Actualiza el perfil de la empresa |

Archivos: `get-company-header.controller.ts`, `get-company-contact.controller.ts`, `update-company-profile.controller.ts`.

## Usuarios de la empresa · `companies`

| Método | Ruta | Permiso | Qué hace |
| --- | --- | --- | --- |
| `GET` | `/companies/:companyId/users` | `empresas:self:read` | Lista usuarios activos, inactivos e invitaciones (pendientes y vencidas) |
| `POST` | `/companies/:companyId/users/invitations` | `empresas:self:read` | Invita a un colaborador (Administrador o Reclutador) |
| `PATCH` | `/companies/:companyId/users/:memberId` | `empresas:self:read` | Cambia el rol (`Administrador`/`Reclutador`) o el estado (`Activo`/`Inactivo`) |
| `DELETE` | `/companies/:companyId/users/invitations/:invitationId` | `empresas:self:read` | Cancela una invitación pendiente |

Archivo: `apps/api/src/modules/companies/company-users.controller.ts`.

## Vacantes · `job-postings` y `vacantes`

| Método | Ruta | Permiso | Qué hace |
| --- | --- | --- | --- |
| `POST` | `/job-postings` | `vacantes:create` | Publica una vacante |
| `GET` | `/vacantes/mis-vacantes` | Sesión | Vacantes de la empresa del usuario |
| `GET` | `/vacantes/:id` | Sesión | Detalle de una vacante de la empresa |
| `PATCH` | `/vacantes/:id` | Sesión | Edita título, modalidad, nivel, descripción o estado |
| `PATCH` | `/vacantes/:id/cerrar` | Sesión | Cambia el estado a `CERRADA` |
| `DELETE` | `/vacantes/:id` | Sesión | Elimina una vacante de la empresa |

Archivos: `apps/api/src/modules/job-postings/http/controllers/create-job-posting.controller.ts`, `apps/api/src/modules/vacantes/vacantes.controller.ts`.

## Postulantes y etapas · `vacantes` (Sprint 3)

| Método | Ruta | Permiso | Qué hace |
| --- | --- | --- | --- |
| `GET` | `/vacantes/:idVacante/postulantes` | `empresas:self:read` | Postulantes de la vacante, ordenados por `porcentaje_match` (sin porcentaje al final). HU-01 |
| `GET` | `/vacantes/:idVacante/postulantes/:idPostulacion` | `empresas:self:read` | Detalle de un postulante. HU-01 |
| `PATCH` | `/vacantes/:idVacante/postulantes/:idPostulacion/etapa` | `empresas:self:write` | Cambia la etapa; body `{ "etapa": "en_revision" }`. HU-04 |

- Acceso: el dueño de la empresa y sus usuarios activos (`empresa_usuario`).
- Vacante inexistente o de otra empresa: 404 en las rutas de lectura y 403 al cambiar la etapa.
- Etapas válidas: `postulado`, `en_revision`, `preseleccionado`, `entrevista`, `descartado`.
- El porcentaje de afinidad nunca se calcula aquí; se devuelve el guardado en `postulacion.porcentaje_match`.

## Tablas que usa la épica

`empresa`, `empresa_usuario`, `empresa_invitacion`, `correo_pendiente`, `vacante`, `vacante_requerimiento_laboral`, `postulacion` (lectura y cambio de `estado`), `usuario`, `titulado`.

## Datos de demostración

`apps/api/scripts/seed/epic-4.ts`, cargado con `pnpm --filter api db:seed:demo`: sectores, direcciones, teléfonos, habilidades, 2 vacantes de la empresa demo (`44500000-…-0001` con 13 postulantes, `44500000-…-0002` vacía) y 12 titulados de prueba.
