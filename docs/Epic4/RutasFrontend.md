# Épica 4 · Rutas frontend

Portal de Empresas (equipo G6). Aplicación `apps/web` (Next.js 14). Estado según la rama `epic4` al 14/11/2026.

Las llamadas al backend pasan por el proxy de Next.js `apps/web/src/app/api/v1/[...path]/route.ts` (módulos `companies`, `job-postings` y `vacantes`).

## Rutas públicas

| Ruta | Archivo | Qué hace | Backend que usa |
| --- | --- | --- | --- |
| `/company-invitation/[token]` | `app/(public)/company-invitation/[token]/page.tsx` | Valida la invitación recibida por correo y permite activar la cuenta de empresa | `GET /api/v1/companies/invitations/:token` · `POST /api/v1/companies/invitations/:token/activate` |
| `/company-invitation` | `app/(public)/company-invitation/page.tsx` | Enlace sin token: muestra "invitación no válida" | — |

## Rutas del administrador UMSS

| Ruta | Archivo | Qué hace | Backend que usa |
| --- | --- | --- | --- |
| `/company-registry` | `app/(dashboard)/company-registry/page.tsx` | Registro de empresas: lista de empresas e invitaciones con su estado; reenvío de invitaciones | `GET /api/v1/companies/registry` · `POST /api/v1/companies/invitations/:invitationId/resend` |
| `/company-registry/new` | `app/(dashboard)/company-registry/new/page.tsx` | Registrar una empresa y enviarle la invitación | `POST /api/v1/companies/invitations` |

Acceso: solo rol `administrador` (US-1.4, `route-access.ts`).

## Rutas de la empresa

| Ruta | Archivo | Qué hace | Backend que usa |
| --- | --- | --- | --- |
| `/companies` | `app/(dashboard)/companies/page.tsx` | Perfil de la empresa: encabezado, datos de contacto y edición | `GET /api/v1/companies/:companyId/header` · `GET /api/v1/companies/:companyId/contact` · `PUT /api/v1/companies/:companyId/profile` |
| `/empresa/vacantes/publicar` | `app/(dashboard)/empresa/vacantes/publicar/page.tsx` | Formulario para publicar una vacante | `POST /api/v1/job-postings` |
| `/empresa/mis-vacantes` | `app/(dashboard)/empresa/mis-vacantes/page.tsx` | Lista de vacantes de la empresa con filtros; acciones ver, editar, pausar, desactivar, eliminar y ver postulantes | `GET /api/v1/vacantes/mis-vacantes` · `PATCH /api/v1/vacantes/:id` · `PATCH /api/v1/vacantes/:id/cerrar` · `DELETE /api/v1/vacantes/:id` |
| `/empresa/mis-vacantes/[id]` | `app/(dashboard)/empresa/mis-vacantes/[id]/page.tsx` | Detalle de una vacante | `GET /api/v1/vacantes/:id` |
| `/empresa/mis-vacantes/[id]/editar` | `app/(dashboard)/empresa/mis-vacantes/[id]/editar/page.tsx` | Editar una vacante | `GET /api/v1/vacantes/:id` · `PATCH /api/v1/vacantes/:id` |
| `/empresa/mis-vacantes/[id]/candidatos` | `app/(dashboard)/empresa/mis-vacantes/[id]/candidatos/page.tsx` | Postulantes reales de la vacante: filtros, orden por afinidad y paginación de 10 (HU-01) | `GET /api/v1/vacantes/:idVacante/postulantes` |
| `/empresa/mis-vacantes/[id]/candidatos/[applicantId]` | `app/(dashboard)/empresa/mis-vacantes/[id]/candidatos/[applicantId]/page.tsx` | Detalle del postulante: perfil, afinidad y contacto (HU-01) | `GET /api/v1/vacantes/:idVacante/postulantes/:idPostulacion` |
| `/empresa/gestion_usuarios` | `app/(dashboard)/empresa/gestion_usuarios/page.tsx` | Usuarios de la empresa: invitar, cambiar rol, activar o desactivar y cancelar invitaciones; muestra las invitaciones vencidas (HU-02) | `GET /api/v1/companies/:companyId/users` · `POST /api/v1/companies/:companyId/users/invitations` · `PATCH /api/v1/companies/:companyId/users/:memberId` · `DELETE /api/v1/companies/:companyId/users/invitations/:invitationId` |
| `/empresa/postulantes` | `app/(dashboard)/empresa/postulantes/page.tsx` | Redirección a `/afinidad/reclutador` (vista de Épica 3) | — |

Acceso: rol `empresa` (y `administrador` donde `route-access.ts` lo permite). Al iniciar sesión, la empresa entra a `/companies`.

## Estados comunes de pantalla

`app/(dashboard)/empresa/loading.tsx` y `error.tsx` muestran un indicador de carga y un error con "Reintentar" para todas las rutas de `/empresa` (HU-03, PR #783 en revisión).

## Variables de entorno del front

| Variable | Valor local | Para qué |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3000` (sin `/api/v1`) | URL base del backend |
| `NEXT_PUBLIC_USE_MOCK` | `false` | `false` = postulantes reales; si falta, se usan datos de prueba |
