# Épica 5 — Rutas de Backend

Endpoints de la API (NestJS, `apps/api/src/modules/job-postings/`) trabajados en las historias **HU2** y **HU10**. Todos usan el prefijo global `/api/v1` y el namespace `job-postings`.

- **HU2:** Gestión de requisitos técnicos por vacante.
- **HU10:** Visualizar vacantes con su porcentaje de afinidad.

Las pantallas que consumen estas rutas están en [RutasFrontend.md](./RutasFrontend.md). Todas las rutas requieren sesión autenticada (guard global).

## Resumen

| HU | Método | Ruta | Permiso | Controlador |
| --- | --- | --- | --- | --- |
| HU2 | `GET` | `/api/v1/job-postings/:vacancyId/technical-requirements` | `vacantes:create` | `get-technical-requirements.controller.ts` |
| HU2 | `PUT` | `/api/v1/job-postings/:vacancyId/technical-requirements` | `vacantes:create` | `save-technical-requirements.controller.ts` |
| HU2 | `POST` | `/api/v1/job-postings` | `vacantes:create` | `create-job-posting.controller.ts` |
| HU10 | `GET` | `/api/v1/job-postings` | Sesión válida | `list-published-job-postings.controller.ts` |
| HU10 | `GET` | `/api/v1/job-postings/:id` | Sesión válida | `get-published-job-posting.controller.ts` |

Los controladores están en `apps/api/src/modules/job-postings/http/controllers/`.

## HU2 — Requisitos técnicos por vacante

### `GET /api/v1/job-postings/:vacancyId/technical-requirements`

- **Descripción:** Devuelve los requisitos técnicos de una vacante.
- **Parámetro de ruta:** `vacancyId` (UUID).
- **Permiso:** `vacantes:create`. La vacante debe pertenecer a una empresa del alcance del actor.
- **Respuesta `200`:**

  ```json
  {
    "data": {
      "vacanteId": "uuid",
      "vacanteTitulo": "Desarrollador de software",
      "requisitos": [
        {
          "id": "uuid",
          "competenciaTecnica": "SQL",
          "nivelEsperado": "AVANZADO",
          "tipo": "OBLIGATORIO",
          "descripcion": "Consultas y optimización",
          "fechaCreacion": "2026-11-10T12:00:00.000Z"
        }
      ]
    }
  }
  ```

- **Errores:** `400` (UUID no válido), `401` (sin sesión), `403` (sin permiso), `404` (`JOB_POSTING_NOT_FOUND`: vacante inexistente o fuera del alcance), `503` (`TECHNICAL_REQUIREMENTS_UNAVAILABLE`: esquema no aplicado en el entorno).

### `PUT /api/v1/job-postings/:vacancyId/technical-requirements`

- **Descripción:** Reemplaza la lista completa de requisitos de la vacante dentro de una transacción. Enviar `requisitos: []` elimina todos.
- **Parámetro de ruta:** `vacancyId` (UUID).
- **Permiso:** `vacantes:create`. Con autenticación por cookie requiere el token CSRF global.
- **Body:**

  ```json
  {
    "requisitos": [
      {
        "competenciaTecnica": "SQL",
        "nivelEsperado": "AVANZADO",
        "tipo": "OBLIGATORIO",
        "descripcion": "Consultas y optimización"
      }
    ]
  }
  ```

- **Reglas:** máximo 50 requisitos; `competenciaTecnica` de 1 a 120 caracteres; `nivelEsperado` ∈ `BASICO`, `INTERMEDIO`, `AVANZADO`; `tipo` ∈ `OBLIGATORIO`, `DESEABLE`; `descripcion` opcional de hasta 500 caracteres; no se aceptan propiedades adicionales.
- **Respuesta `200`:** misma forma que el `GET`.
- **Errores:** `400` (body no válido), `401`, `403`, `404` (`JOB_POSTING_NOT_FOUND`), `409` (`DUPLICATE_TECHNICAL_REQUIREMENT`: competencias duplicadas tras normalizar mayúsculas, espacios y tildes; la lista anterior se conserva), `503` (`TECHNICAL_REQUIREMENTS_UNAVAILABLE`).
- **Persistencia:** tabla `public.vacante_requisito_tecnico`.

### `POST /api/v1/job-postings`

- **Descripción:** Publica una vacante (ruta existente). En HU2, el frontend usa la vacante creada para redirigir a la pantalla de requisitos técnicos. HU2 solo ajustó el tipo de respuesta que consume el frontend.
- **Permiso:** `vacantes:create`.
- **Archivo:** `create-job-posting.controller.ts`.

## HU10 — Vacantes con porcentaje de afinidad

### `GET /api/v1/job-postings`

- **Descripción:** Lista las vacantes publicadas y no vencidas. Para un actor con rol `titulado`, cada vacante incluye `porcentajeAfinidad` calculado con el perfil del actor autenticado; el perfil se obtiene del scope de la sesión y no se envía en la petición. El perfil se lee una sola vez por consulta.
- **Parámetros:** ninguno.
- **Permiso:** sesión válida, sin permiso específico.
- **Respuesta `200`:**

  ```json
  {
    "data": [
      {
        "id": "uuid",
        "titulo": "Desarrollador frontend",
        "modalidad": "REMOTO",
        "nivelExperiencia": "Junior",
        "descripcionTecnica": "Desarrollo de interfaces web.",
        "fechaPublicacion": "2026-11-13T10:00:00.000Z",
        "empresa": {
          "razonSocial": "Empresa de prueba",
          "descripcion": null,
          "logoUrl": null,
          "bannerUrl": null
        },
        "requisitosTecnicos": [
          { "areaId": "uuid", "nombre": "Desarrollo de software", "nivel": "Intermedio" }
        ],
        "porcentajeAfinidad": 100
      }
    ]
  }
  ```

- **`porcentajeAfinidad`:** número entre 0 y 100 (hasta dos decimales) o `null` cuando no hay cálculo disponible (sin perfil, sin requisitos utilizables o actor que no es titulado). `0` solo se devuelve cuando el cálculo se realizó y no hubo coincidencias.
- **Disponibilidad:** solo estados publicados (`PUBLICADO`, `PUBLICADA`, `ACTIVA`, `ACTIVO`, `ACTIVE`, `PUBLISHED`) con `fecha_cierre` nula o posterior a la consulta.
- **Respuesta vacía:** `200` con `data: []`.
- **Errores:** `401` (sin sesión). Ante un fallo al leer vacantes o perfil, la API devuelve error y no un porcentaje alternativo.

### `GET /api/v1/job-postings/:id`

- **Descripción:** Detalle de una vacante disponible, con el mismo contrato de cada elemento del listado, incluido `porcentajeAfinidad` del actor autenticado.
- **Parámetro de ruta:** `id` (UUID).
- **Permiso:** sesión válida, sin permiso específico.
- **Respuesta `200`:** `{ "data": { ... } }`.
- **Errores:** `401`; `404` con `JOB_POSTING_NOT_FOUND` si el identificador no es válido o la vacante no existe, está cerrada o venció.

## Archivos principales

| Capa | HU2 | HU10 |
| --- | --- | --- |
| Casos de uso | `get-technical-requirements.use-case.ts`, `save-technical-requirements.use-case.ts` | `list-published-job-postings.use-case.ts`, `get-published-job-posting.use-case.ts` |
| Dominio | `technical-requirement.entity.ts`, `technical-requirement.errors.ts` | `job-posting-affinity.policy.ts` |
| Validación | `technical-requirements.schemas.ts` | — |
| Presentación | `technical-requirements.presenter.ts` | `published-job-posting.presenter.ts` |
| Infraestructura | `prisma-technical-requirements.repository.ts` | `prisma-job-posting.repository.ts` |
| Módulo y providers | `job-postings.module.ts`, `job-postings.providers.ts` | `job-postings.module.ts`, `job-postings.providers.ts` |

Tipos compartidos con el frontend: `packages/shared-types/src/job-posting.ts`.

## Documentación relacionada

- [HU2 — Requisitos técnicos](../hu2-requisitos-tecnicos.md) y [esquema y migración](../hu2-requisitos-tecnicos-esquema.md).
- [HU10 — Guía de QA](../hu10-visualizar-vacantes-afinidad-qa.md).
- [README del módulo](../../apps/api/src/modules/job-postings/README.md).
- Peticiones Bruno de HU2: `bruno/Vacantes/002-get-technical-requirements.bru` y `bruno/Vacantes/003-save-technical-requirements.bru`.
