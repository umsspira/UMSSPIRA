# Mapa de rutas disponibles — UMSSPIRA

> Inventario de las rutas activas del **frontend** (`apps/web`, Next.js 14 App Router) y del **backend** (`apps/api`, NestJS), agrupadas por funcionalidad para uso en presentaciones.
>
> **Fecha de generación:** 2026-11-04 · **Ramas:** `dev`/`main` · **Método:** lectura directa de `apps/api/src/modules/**/*.controller.ts` (133 controladores, todos registrados en sus módulos) y `apps/web/src/app/**/page.tsx` (80 páginas).

---

## 1. Resumen

| Capa | Cantidad | Detalle |
| --- | ---: | --- |
| Endpoints backend | **148** | distribuidos en 25 namespaces bajo `/api/v1` (+ `/` y `/health` fuera del prefijo) |
| Páginas frontend | **80** | 51 en `(dashboard)`, 13 en `(public)`, 15 en `portal/`, 1 en la raíz (`/`) |
| Roles | **3** | `administrador`, `titulado`, `empresa` |
| Permisos distintos | **18** | declarados en `access.policy.ts` (17 se usan hoy en controladores) y sembrados por rol |
| WebSocket | **1** | namespace `/chat` (Socket.IO) |

### Distribución de endpoints por grupo

| Grupo | Endpoints |
| --- | ---: |
| Mentorías | 25 |
| Eventos (incluye pases QR) | 21 |
| Registro de titulados (flujo público) | 20 |
| Perfil profesional (`perfil`) | 14 |
| Chat | 13 |
| Autenticación (`auth`) | 12 |
| Empresas | 12 |
| Solicitudes / Backoffice | 9 |
| Reportería | 6 |
| Ofertas laborales | 6 |
| Encuestas | 3 |
| Radar de afinidad | 3 |
| Usuario | 1 |
| NLP | 1 |
| Infraestructura | 2 |

---

## 2. Cómo leer las tablas

**Columna "Acceso" del backend:**

| Valor | Significado |
| --- | --- |
| `público` | Decorador `@Public()`: no exige token. |
| `público (flujo de registro)` | `@PublicRegistration()`: acceso por token de registro/corrección, no por sesión. |
| `sesión requerida` | Exige `Authorization: Bearer <accessToken>` pero **no** declara permiso de negocio (ver nota en §4.2). |
| `permiso X → roles` | `@RequirePermissions('X')`; exige **todos** los permisos listados. La flecha indica qué roles lo tienen en `access.policy.ts`. |
| `rol X` | `@Roles('X')`: restricción directa de rol. |

**Columna "Protección" del frontend:**

| Valor | Significado |
| --- | --- |
| `público` | Sin sesión; accesible a visitantes. |
| `middleware` | Cubierto por el `matcher` de `src/middleware.ts`: valida cookie `umsspira_refresh` contra `/api/v1/auth/session` y aplica reglas por rol de `route-access.ts`. |
| `middleware + rol` | Además del middleware, `decideAccess()` restringe a un rol concreto. |
| `AuthGuard (layout)` | No está en el `matcher`, pero el `layout.tsx` de la carpeta monta `<AuthGuard>` que redirige a `/login` si no hay sesión. |
| `guard client (admin)` | El layout exige identidad de administrador mediante `AuthenticatedUserSessionProvider`. |
| `sin cobertura` | No hay regla de middleware ni de layout (ver §5). |

---

## 3. Frontend — rutas agrupadas por funcionalidad

### 3.1 Acceso, registro y páginas públicas (17)

| Ruta | Pantalla | Protección |
| --- | --- | --- |
| `/` | Portada pública (landing) | público |
| `/login` | Inicio de sesión | público (con sesión → home del rol) |
| `/register` | Solicitud de registro de titulado | público |
| `/register/verify-email` | Verificación de correo | público |
| `/register/document` | Carga de documento de identidad | público |
| `/register/review` | Revisión de la solicitud | público |
| `/register/confirmation` | Confirmación de envío | público |
| `/register/correction` | Corrección de solicitud (base) | público |
| `/register/correction/[token]` | Corrección con token | público |
| `/activate` | Activación de cuenta de titulado | público |
| `/forgot-password` | Solicitud de recuperación de contraseña | público |
| `/reset-password` | Restablecer contraseña | público |
| `/company-invitation` | Invitación de empresa (sin token) | público |
| `/company-invitation/[token]` | Aceptar invitación de empresa | público |
| `/portal/institucional` | Landing institucional (tabs: `comunidad`, `directorio`, `carreras`, `eventos`, `nosotros`, `empleos`, `mentorias`) | público |
| `/offline` | Pantalla de red no disponible (PWA) | público |
| `/test-form` | Pantalla de prueba del formulario de empresa | público |

### 3.2 Portal del egresado — titulado (11)

| Ruta | Pantalla | Protección |
| --- | --- | --- |
| `/portal` | Inicio del portal | middleware |
| `/portal/comunidad` | Comunidad de egresados | middleware |
| `/portal/beneficios` | Beneficios y convenios | middleware |
| `/portal/empleos` | Bolsa de trabajo (portal) | middleware |
| `/portal/mentorias` | Mentorías (portal) | middleware |
| `/portal/eventos` | Catálogo de eventos | middleware |
| `/portal/eventos/[id]` | Detalle de evento | middleware |
| `/portal/eventos/mis-eventos` | Mis inscripciones a eventos | middleware |
| `/portal/mensajes` | Mensajería / chat | middleware |
| `/mis-pases` | Mis pases QR | **sin cobertura** |
| `/mis-pases/[passId]` | Detalle de un pase QR | **sin cobertura** |

### 3.3 Perfil profesional y afinidad (11)

| Ruta | Pantalla | Protección |
| --- | --- | --- |
| `/profile` | Resumen del perfil profesional | **sin cobertura** |
| `/profile/completar` | Completar mi perfil | **sin cobertura** |
| `/profile/records` | Mis registros (timeline) | **sin cobertura** |
| `/profile/experience/[id]/edit` | Editar experiencia laboral | **sin cobertura** |
| `/profile/education/[id]/edit` | Editar formación académica | **sin cobertura** |
| `/profile/certifications/[id]/edit` | Editar certificación | **sin cobertura** |
| `/epica-2/certificaciones/nueva` | Nueva certificación (Épica 2) | **sin cobertura** |
| `/afinidad` | Mi afinidad profesional | middleware + rol `titulado`/`administrador` |
| `/afinidad/egresado` | Afinidad — vista del egresado | middleware + rol `titulado`/`administrador` |
| `/afinidad/reclutador` | Afinidad — vista del reclutador | middleware + rol `empresa`/`administrador` |
| `/me` | Mi área personal | middleware |

### 3.4 Mentorías (11)

| Ruta | Pantalla | Protección |
| --- | --- | --- |
| `/mentorship` | Explorar mentores (inicio del módulo) | middleware |
| `/mentorship/directory` | Directorio / explorar mentores | middleware |
| `/mentorship/mentors/[mentorId]` | Perfil público de un mentor | middleware |
| `/mentorship/request/[mentorId]` | Enviar solicitud a un mentor | middleware |
| `/mentorship/requests` | Mis solicitudes (enviadas) | middleware |
| `/mentorship/requests/received` | Solicitudes recibidas (`?view=sent` = enviadas) | middleware |
| `/mentorship/profile` | Mi perfil de mentor | middleware |
| `/mentorship/profile/information` | Información de mi perfil de mentor | middleware |
| `/mentorship/profile/areas` | Áreas técnicas | middleware |
| `/mentorship/profile/interests` | Intereses de mentoría | middleware |
| `/mentorship/profile/availability` | Disponibilidad | middleware |

### 3.5 Bolsa de trabajo y empresas (11)

| Ruta | Pantalla | Protección |
| --- | --- | --- |
| `/job-postings` | Ofertas laborales actuales | middleware |
| `/companies` | Perfil de mi empresa | AuthGuard (layout) |
| `/empresa/vacantes/publicar` | Publicar una vacante | AuthGuard (layout) |
| `/empresa/mis-vacantes` | Mis vacantes | AuthGuard (layout) |
| `/empresa/mis-vacantes/[id]` | Detalle de vacante | AuthGuard (layout) |
| `/empresa/mis-vacantes/[id]/editar` | Editar vacante | AuthGuard (layout) |
| `/empresa/mis-vacantes/[id]/candidatos` | Candidatos a la vacante | AuthGuard (layout) |
| `/empresa/mis-vacantes/[id]/candidatos/[applicantId]` | Ficha de un candidato | AuthGuard (layout) |
| `/empresa/gestion_usuarios` | Gestión de usuarios de la empresa | AuthGuard (layout) |
| `/empresa/postulantes` | Postulantes (empresa) | middleware + rol `empresa`/`administrador` |
| `/postulantes` | Postulantes (vista admin) | middleware + rol `empresa`/`administrador` |

### 3.6 Eventos (11)

| Ruta | Pantalla | Protección |
| --- | --- | --- |
| `/events` | Gestión de eventos (admin) | guard client (admin) |
| `/events/create` | Crear evento | guard client (admin) |
| `/events/drafts` | Borradores | guard client (admin) |
| `/events/drafts/[id]` | Editar borrador | guard client (admin) |
| `/events/[id]` | Detalle de evento (admin) | guard client (admin) |
| `/events/[id]/edit` | Editar evento publicado | guard client (admin) |
| `/events/[id]/participants` | Participantes | guard client (admin) |
| `/events/inactive` | Eventos inactivos | guard client (admin) |
| `/events/catalog` | Catálogo de eventos | sin cobertura (exento del guard admin) |
| `/events/catalog/[id]` | Detalle de evento (catálogo) | sin cobertura (exento del guard admin) |
| `/events/catalog/passes` | Pases del evento | sin cobertura (exento del guard admin) |

### 3.7 Solicitudes de registro / Backoffice (3)

| Ruta | Pantalla | Protección |
| --- | --- | --- |
| `/applications` | Solicitudes de registro (home del admin) | middleware + rol `administrador` |
| `/company-registry` | Registro de empresas | middleware + rol `administrador` |
| `/company-registry/new` | Nueva empresa en el registro | middleware + rol `administrador` |

### 3.8 Reportería institucional (3)

| Ruta | Pantalla | Protección |
| --- | --- | --- |
| `/reports` | Reportes institucionales | middleware + rol `administrador` |
| `/reports/encuestas` | Reportes de encuestas de empleabilidad | middleware + rol `administrador` |
| `/reportes-no-disponibles` | Pantalla de sustitución (503 cuando la API no responde) | pública (destino de `rewrite`) |

### 3.9 Encuestas y panel (2)

| Ruta | Pantalla | Protección |
| --- | --- | --- |
| `/surveys` | Encuesta de empleabilidad (titulado) | middleware + rol `titulado` |
| `/portal/admin` | Panel administrativo (dashboard) | **sin cobertura** |

---

## 4. Backend — endpoints agrupados por funcionalidad

Todos los grupos viven bajo `/api/v1` salvo `/` y `/health`.

### 4.1 Infraestructura (2)

| Verbo | Ruta | Acceso |
| --- | --- | --- |
| GET | `/` | público |
| GET | `/health` | público |

### 4.2 Autenticación y cuenta — `auth` (12)

| Verbo | Ruta | Acceso |
| --- | --- | --- |
| POST | `/api/v1/auth/login` | público |
| POST | `/api/v1/auth/refresh` | público |
| GET | `/api/v1/auth/session` | público |
| POST | `/api/v1/auth/password-recovery/request` | público |
| POST | `/api/v1/auth/password-recovery/validate` | público |
| POST | `/api/v1/auth/password-recovery/reset` | público |
| GET | `/api/v1/auth/me` | permiso `user:self:read` → todos los roles |
| GET | `/api/v1/auth/sessions` | permiso `auth:sessions:self` → todos los roles |
| DELETE | `/api/v1/auth/sessions/:id` | permiso `auth:sessions:self` → todos los roles |
| POST | `/api/v1/auth/password` | sesión requerida |
| POST | `/api/v1/auth/logout` | sesión requerida |
| POST | `/api/v1/auth/logout-all` | sesión requerida |

### 4.3 Usuario — `user` (1)

| Verbo | Ruta | Acceso |
| --- | --- | --- |
| GET | `/api/v1/user/me` | permiso `user:self:read` → todos los roles |

### 4.4 Empresas — `companies`, `companies/invitations`, `companies/registry` (12)

| Verbo | Ruta | Acceso |
| --- | --- | --- |
| GET | `/api/v1/companies/:companyId/users` | permiso `empresas:self:read` → empresa |
| POST | `/api/v1/companies/:companyId/users/invitations` | permiso `empresas:self:read` → empresa |
| PATCH | `/api/v1/companies/:companyId/users/:memberId` | permiso `empresas:self:read` → empresa |
| DELETE | `/api/v1/companies/:companyId/users/invitations/:invitationId` | permiso `empresas:self:read` → empresa |
| GET | `/api/v1/companies/:companyId/header` | permiso `empresas:self:read` → empresa |
| GET | `/api/v1/companies/:companyId/contact` | permiso `empresas:self:read` → empresa |
| PUT | `/api/v1/companies/:companyId/profile` | permiso `empresas:self:write` → empresa |
| GET | `/api/v1/companies/invitations/:token` | público |
| POST | `/api/v1/companies/invitations/:token/activate` | público |
| POST | `/api/v1/companies/invitations` | permiso `empresas:invite` → administrador |
| POST | `/api/v1/companies/invitations/:invitationId/resend` | permiso `empresas:invite` → administrador |
| GET | `/api/v1/companies/registry` | permiso `empresas:invite` → administrador |

### 4.5 Ofertas laborales — `job-postings`, `vacantes` (6)

| Verbo | Ruta | Acceso |
| --- | --- | --- |
| POST | `/api/v1/job-postings` | permiso `vacantes:create` → empresa |
| GET | `/api/v1/vacantes/mis-vacantes` | sesión requerida |
| GET | `/api/v1/vacantes/:id` | sesión requerida |
| PATCH | `/api/v1/vacantes/:id` | sesión requerida |
| PATCH | `/api/v1/vacantes/:id/cerrar` | sesión requerida |
| DELETE | `/api/v1/vacantes/:id` | sesión requerida |

### 4.6 Registro de titulados — flujo público (20)

Accesibles sin sesión: el acceso se valida con **token de sesión de registro** (`:token`), **código de activación** o **token de corrección**.

| Verbo | Ruta | Acceso |
| --- | --- | --- |
| GET | `/api/v1/registrations/careers` | público (flujo de registro) |
| POST | `/api/v1/registrations/sessions` | público (flujo de registro) |
| GET | `/api/v1/registrations/sessions/:token` | público (flujo de registro) |
| PATCH | `/api/v1/registrations/sessions/:token` | público (flujo de registro) |
| GET | `/api/v1/registrations/sessions/:token/document` | público (flujo de registro) |
| POST | `/api/v1/registrations/submit` | público (flujo de registro) |
| POST | `/api/v1/email-verification/verify` | público (flujo de registro) |
| POST | `/api/v1/email-verification/resend` | público (flujo de registro) |
| POST | `/api/v1/documents` | público (flujo de registro) |
| POST | `/api/v1/registrations/activate` | público (flujo de registro) |
| POST | `/api/v1/registrations/activate/verify` | público (flujo de registro) |
| POST | `/api/v1/registrations/activate/status` | público (flujo de registro) |
| POST | `/api/v1/registrations/activate/resend` | público (flujo de registro) |
| POST | `/api/v1/registrations/observed/request-link` | público (flujo de registro) |
| GET | `/api/v1/registrations/observed/access` | público (flujo de registro) |
| GET | `/api/v1/registrations/observed` | público (flujo de registro) |
| PATCH | `/api/v1/registrations/observed` | público (flujo de registro) |
| GET | `/api/v1/registrations/observed/document/content` | público (flujo de registro) |
| POST | `/api/v1/registrations/observed/document` | público (flujo de registro) |
| POST | `/api/v1/registrations/observed/submit` | público (flujo de registro) |

### 4.7 Solicitudes de registro / Backoffice — `applications`, `mail-events` (9)

| Verbo | Ruta | Acceso |
| --- | --- | --- |
| GET | `/api/v1/applications` | permiso `solicitudes:read` → administrador |
| GET | `/api/v1/applications/metrics` | permiso `solicitudes:read` → administrador |
| GET | `/api/v1/applications/:id` | permiso `solicitudes:read` → administrador |
| GET | `/api/v1/applications/:id/document` | permiso `solicitudes:read` → administrador |
| GET | `/api/v1/applications/:id/document/content` | permiso `solicitudes:read` → administrador |
| POST | `/api/v1/applications/:id/review` | permiso `solicitudes:review` → administrador |
| POST | `/api/v1/applications/:id/activation` | permiso `solicitudes:review` → administrador |
| POST | `/api/v1/mail-events/:id/retry` | permiso `solicitudes:review` → administrador |
| POST | `/api/v1/mail-events/retry-failed` | permiso `solicitudes:review` → administrador |

### 4.8 Perfil profesional — `perfil` (14)

| Verbo | Ruta | Acceso |
| --- | --- | --- |
| GET | `/api/v1/perfil` | permiso `perfil:self:read` → titulado |
| GET | `/api/v1/perfil/:section/:id` | permiso `perfil:self:read` → titulado |
| PUT | `/api/v1/perfil/:section/:id` | permiso `perfil:self:write` → titulado |
| DELETE | `/api/v1/perfil/:section/:id` | permiso `perfil:self:write` → titulado |
| POST | `/api/v1/perfil/formacion-academica` | permiso `perfil:self:write` → titulado |
| POST | `/api/v1/perfil/experiencia-laboral` | permiso `perfil:self:write` → titulado |
| POST | `/api/v1/perfil/certificaciones` | permiso `perfil:self:write` → titulado |
| GET | `/api/v1/perfil/descripcion-profesional` | permiso `perfil:self:read` → titulado |
| PUT | `/api/v1/perfil/descripcion-profesional` | permiso `perfil:self:write` → titulado |
| GET | `/api/v1/perfil/exportar-json` | permiso `perfil:self:read` → titulado |
| POST | `/api/v1/perfil/certificaciones/:id/respaldo` | permiso `perfil:self:write` → titulado |
| GET | `/api/v1/perfil/certificaciones/:id/respaldo` | permiso `perfil:self:read` → titulado |
| GET | `/api/v1/perfil/certificaciones/:id/respaldo/enlace` | permiso `perfil:self:read` → titulado |
| GET | `/api/v1/perfil/respaldos/:id/archivo` | público (URL firmada) |

### 4.9 Eventos — `events` + pases QR (21)

| Verbo | Ruta | Acceso |
| --- | --- | --- |
| GET | `/api/v1/events/catalog` | público |
| GET | `/api/v1/events/:id` | público |
| GET | `/api/v1/events/covers/:id` | público |
| POST | `/api/v1/events` | permiso `eventos:manage` → administrador |
| GET | `/api/v1/events/owned` | permiso `eventos:manage` → administrador |
| GET | `/api/v1/events/owned/:id` | permiso `eventos:manage` → administrador |
| PATCH | `/api/v1/events/owned/:id` | permiso `eventos:manage` → administrador |
| PATCH | `/api/v1/events/owned/:id/retire` | permiso `eventos:manage` → administrador |
| GET | `/api/v1/events/owned/:id/participants` | permiso `eventos:manage` → administrador |
| PATCH | `/api/v1/events/:id/cancel` | permiso `eventos:manage` → administrador |
| GET | `/api/v1/events/inactive` | permiso `eventos:manage` → administrador |
| GET | `/api/v1/events/drafts/:id` | permiso `eventos:manage` → administrador |
| PATCH | `/api/v1/events/drafts/:id` | permiso `eventos:manage` → administrador |
| PATCH | `/api/v1/events/drafts/:id/publish` | permiso `eventos:manage` → administrador |
| POST | `/api/v1/events/covers` | permiso `eventos:manage` → administrador |
| DELETE | `/api/v1/events/covers/:id` | permiso `eventos:manage` → administrador |
| POST | `/api/v1/events/:id/registrations` | rol `titulado` |
| GET | `/api/v1/events/my-registrations` | rol `titulado` |
| PATCH | `/api/v1/events/registrations/:registrationId/cancel` | rol `titulado` |
| POST | `/api/v1/registrations/:inscripcionId/pass` | sesión requerida |
| GET | `/api/v1/registrations/my-passes` | sesión requerida |

> **Nota:** los dos últimos viven en el namespace `registrations` (controlador `event-passes.controller.ts`) pero pertenecen funcionalmente a eventos: generan y listan los **pases QR**.

### 4.10 Mentorías — `mentorship`, `mentorship/requests` (25)

**Directorio y detalle**

| Verbo | Ruta | Acceso |
| --- | --- | --- |
| ALL | `/api/v1/mentorship/profiles` | sesión requerida (solo acepta GET; otros métodos → 405) |
| GET | `/api/v1/mentorship/profiles/:id` | sesión requerida |
| GET | `/api/v1/mentorship/profiles/:id/slots` | sesión requerida |
| GET | `/api/v1/mentorship/profiles/filter` | permiso `mentores:self:write` → titulado |
| GET | `/api/v1/mentorship/filter-options` | permiso `mentores:self:write` → titulado |
| PATCH | `/api/v1/mentorship/profiles/:id/deactivate` | permiso `mentores:manage` → administrador |

**Mi perfil de mentor**

| Verbo | Ruta | Acceso |
| --- | --- | --- |
| GET | `/api/v1/mentorship/my-profile` | permiso `mentores:self:write` → titulado |
| PATCH | `/api/v1/mentorship/my-profile/participation` | permiso `mentores:self:write` → titulado |
| GET | `/api/v1/mentorship/eligibility` | permiso `mentores:self:write` → titulado |
| GET | `/api/v1/mentorship/my-profile/information` | permiso `mentores:self:write` → titulado |
| PATCH | `/api/v1/mentorship/my-profile/information` | permiso `mentores:self:write` → titulado |
| DELETE | `/api/v1/mentorship/my-profile/information` | permiso `mentores:self:write` → titulado |
| GET | `/api/v1/mentorship/my-profile/areas` | permiso `mentores:self:write` → titulado |
| PATCH | `/api/v1/mentorship/my-profile/areas` | permiso `mentores:self:write` → titulado |
| GET | `/api/v1/mentorship/availability` | permiso `mentores:self:write` → titulado |
| PATCH | `/api/v1/mentorship/availability` | permiso `mentores:self:write` → titulado |

**Intereses**

| Verbo | Ruta | Acceso |
| --- | --- | --- |
| GET | `/api/v1/mentorship/interests/catalog` | permiso `mentores:self:write` → titulado |
| GET | `/api/v1/mentorship/interests/mine` | permiso `mentores:self:write` → titulado |
| POST | `/api/v1/mentorship/interests` | permiso `mentores:self:write` → titulado |
| DELETE | `/api/v1/mentorship/interests/:id` | permiso `mentores:self:write` → titulado |

**Solicitudes**

| Verbo | Ruta | Acceso |
| --- | --- | --- |
| GET | `/api/v1/mentorship/requests` | sesión requerida |
| GET | `/api/v1/mentorship/requests/:id` | sesión requerida |
| POST | `/api/v1/mentorship/requests` | permiso `mentores:self:write` → titulado |
| PATCH | `/api/v1/mentorship/requests/:id/accept` | sesión requerida |
| PATCH | `/api/v1/mentorship/requests/:id/reject` | sesión requerida |

### 4.11 Reportería — `reports` (6)

| Verbo | Ruta | Acceso |
| --- | --- | --- |
| GET | `/api/v1/reports/metrics` | permiso `reportes:read` → administrador |
| GET | `/api/v1/reports/graduates` | permiso `reportes:read` → administrador |
| GET | `/api/v1/reports/graduates/report` | permiso `reportes:read` → administrador |
| GET | `/api/v1/reports/graduates/csv` | permiso `reportes:read` → administrador |
| GET | `/api/v1/reports/graduates/pdf` | permiso `reportes:read` → administrador |
| GET | `/api/v1/reports/surveys` | permiso `reportes:read` → administrador |

### 4.12 Encuestas de empleabilidad — `surveys` (3)

| Verbo | Ruta | Acceso |
| --- | --- | --- |
| GET | `/api/v1/surveys/me` | rol `titulado` |
| GET | `/api/v1/surveys/status` | rol `titulado` |
| POST | `/api/v1/surveys` | rol `titulado` |

### 4.13 Chat — `chat`, `chat/conversations` (13) + WebSocket `/chat`

| Verbo | Ruta | Acceso |
| --- | --- | --- |
| GET | `/api/v1/chat/contacts` | permiso `user:self:read` → todos los roles |
| GET | `/api/v1/chat/unread-summary` | permiso `user:self:read` → todos los roles |
| POST | `/api/v1/chat/conversations` | permiso `user:self:read` → todos los roles |
| GET | `/api/v1/chat/conversations` | permiso `user:self:read` → todos los roles |
| GET | `/api/v1/chat/conversations/:id` | permiso `user:self:read` → todos los roles |
| PATCH | `/api/v1/chat/conversations/:id/request` | permiso `user:self:read` → todos los roles |
| PUT | `/api/v1/chat/conversations/:id/read-receipt` | permiso `user:self:read` → todos los roles |
| GET | `/api/v1/chat/conversations/:id/messages` | permiso `user:self:read` → todos los roles |
| POST | `/api/v1/chat/conversations/:id/messages` | permiso `user:self:read` → todos los roles |
| PATCH | `/api/v1/chat/conversations/:id/messages/:messageId` | permiso `user:self:read` → todos los roles |
| DELETE | `/api/v1/chat/conversations/:id/messages/:messageId` | permiso `user:self:read` → todos los roles |
| POST | `/api/v1/chat/conversations/:id/attachments` | permiso `user:self:read` → todos los roles |
| GET | `/api/v1/chat/conversations/:id/messages/:messageId/attachment` | permiso `user:self:read` → todos los roles |

**Tiempo real:** Socket.IO en el namespace **`/chat`** (eventos `chat:ready`, `chat:session_expired`, `chat:changed`). El middleware valida el `origin` contra `CORS_ORIGINS` y el token de autenticación en el handshake.

### 4.14 Radar de afinidad — `radar` (3)

| Verbo | Ruta | Acceso |
| --- | --- | --- |
| GET | `/api/v1/radar` | permiso `radar:self:read` → titulado |
| GET | `/api/v1/radar/certifications/:area` | permiso `radar:self:read` → titulado |
| POST | `/api/v1/radar/recalculate` | permiso `radar:self:write` → titulado |

### 4.15 Procesamiento de lenguaje — `nlp` (1)

| Verbo | Ruta | Acceso |
| --- | --- | --- |
| POST | `/api/v1/nlp/extract` | permiso `nlp:extract` → administrador, titulado |

---

## 5. Matriz de roles y permisos

Fuente: `apps/api/src/modules/user/domain/policies/access.policy.ts`.

| Permiso | administrador | titulado | empresa |
| --- | :-: | :-: | :-: |
| `user:self:read` | ✅ | ✅ | ✅ |
| `auth:sessions:self` | ✅ | ✅ | ✅ |
| `solicitudes:read` | ✅ | — | — |
| `solicitudes:review` | ✅ | — | — |
| `eventos:manage` | ✅ | — | — |
| `eventos:read` | — | ✅ | ✅ |
| `reportes:read` | ✅ | — | — |
| `mentores:manage` | ✅ | — | — |
| `mentores:self:write` | — | ✅ | — |
| `perfil:self:read` | — | ✅ | — |
| `perfil:self:write` | — | ✅ | — |
| `radar:self:read` | — | ✅ | — |
| `radar:self:write` | — | ✅ | — |
| `nlp:extract` | ✅ | ✅ | — |
| `empresas:invite` | ✅ | — | — |
| `empresas:self:read` | — | — | ✅ |
| `empresas:self:write` | — | — | ✅ |
| `vacantes:create` | — | — | ✅ |

### Home por rol (`route-access.ts`)

| Rol | Pantalla de inicio |
| --- | --- |
| `administrador` | `/applications` |
| `titulado` | `/portal` |
| `empresa` | `/companies` |
| Otro / sin definir | `/me` |

### Reglas de acceso por rol en el middleware

| Rutas | Roles permitidos |
| --- | --- |
| `/applications`, `/reports/*`, `/company-registry*` | `administrador` |
| `/surveys*` | `titulado` |
| `/afinidad`, `/afinidad/egresado` | `titulado`, `administrador` |
| `/afinidad/reclutador`, `/empresa/postulantes*`, `/postulantes*` | `empresa`, `administrador` |
| Resto de rutas del `matcher` | cualquier rol con sesión válida |

---

## 6. Capas de protección (resumen para la presentación)

```
Visitante ──►  Rutas públicas (3.1, 4.1, 4.2, 4.6)
                    │
                    ▼  inicia sesión
Sesión ──► middleware (cookie → /api/v1/auth/session → decideAccess por rol)
                    │
        ┌───────────┼────────────────┐
        ▼           ▼                ▼
   titulado     empresa        administrador
   /portal      /companies     /applications
        │           │                │
        └───────────┴────────────────┘
                    ▼
        Guards globales de la API
        (AuthenticationGuard + PermissionsGuard)
                    ▼
        @RequirePermissions / @Roles / @Public
                    ▼
        Alcance de datos (actor.scopes.*)
```

**Proxy del frontend:** `apps/web/src/app/api/v1/[...path]/route.ts` expone una lista blanca de módulos. Una petición a un namespace fuera de esa lista responde `404 NOT_FOUND` desde el propio frontend:

```
auth · user · companies · job-postings · registrations · applications ·
email-verification · documents · perfil · events · mentorship · reports ·
surveys · nlp · radar · chat
```

> ⚠️ Los namespaces **`vacantes`** y **`mail-events`** no están en esa lista: el frontend los llama directamente a `NEXT_PUBLIC_API_URL` (no a través del proxy) y `mail-events` solo se usa desde Bruno/Postman.

---

## 7. Observaciones detectadas al generar el inventario

1. **Rutas del dashboard sin cobertura de middleware** (§3.2, §3.3, §3.9): `/profile*`, `/mis-pases*` y `/portal/admin` no entran en el `matcher` de `src/middleware.ts` ni montan `<AuthGuard>`. La API responde 401 y la pantalla muestra su estado de error, pero no hay redirección automática a `/login`.
2. **`/test-form`** es una pantalla de prueba (datos de empresa ficticios) publicada en la raíz.
3. **`/portal/admin`** es un dashboard con datos estáticos y no está protegido por el middleware; el enlace solo se muestra a `administrador` desde la navbar.
4. **`POST`, `PATCH` y `DELETE` sobre `/api/v1/companies/:companyId/users/*`** usan el permiso `empresas:self:read` (lectura) pese a ser operaciones de escritura.
5. **`/api/v1/vacantes/*`** no declara `@RequirePermissions`: depende solo de la sesión y del alcance de `@CurrentActor`.
6. **`GET /api/v1/mentorship/profiles`** está registrado con `@All` pero rechaza con 405 todo método distinto de GET.
7. **Duplicado de navbar:** existen `admin-navbar.tsx` y `adminnavbar.tsx` en `src/shared/components/`.
8. Todas las rutas de la sección 3.4 (mentorías) y gran parte de 3.6 (eventos) sí están cubiertas por el middleware; la protección de eventos de gestión se resuelve en cliente con `AuthenticatedUserSessionProvider`, que exige `role === 'administrador'`.

---

*Documento generado a partir del código fuente. Para regenerarlo, revisar `apps/api/src/modules/**/*.controller.ts` y `apps/web/src/app/**/page.tsx`.*
