# Publicación de vacantes

El módulo migra la publicación de vacantes existente en el backend anterior. Su contrato está en [endpoints](../../../docs/endpoints/epic5/HU001-publicacion-vacantes.md). No incorpora todavía Elasticsearch, búsqueda ni administración posterior de vacantes.

La estructura sigue el mismo reparto que empresas: `domain/entities`, `domain/policies` y `domain/errors`; `application/contracts`, `application/ports` y `application/use-cases`; `http/controllers`, `http/presenters` y `http/schemas`; `infrastructure/providers`, `infrastructure/repositories` y `infrastructure/translators`.

El controlador declara POST y su permiso, valida el body con `job-postings.schemas.ts`, obtiene el actor verificado y llama al caso de uso. Este comprueba el scope y fija la fecha. El adaptador guarda el estado inicial PUBLICADO; el cliente no puede elegirlo ni declarar un propietario.

El repositorio utiliza la relación Prisma con una selección por empresa y usuario propietario. Eso conserva la frontera frente al esquema físico: no se presupone que usuario y empresa comparten UUID. El presenter expone solamente el resultado público.

Los campos de publicación ya existen en `schema.prisma`. Las entidades del dominio representan el resultado de la operación y el translator detecta registros incompletos; no se duplican modelos de base de datos dentro del módulo.

## Motor de afinidad laboral — HU-10

`CalculateJobPostingAffinity` es una operación interna, sin ruta HTTP ni escrituras.
Recibe un perfil y las vacantes ya autorizadas, y devuelve `{ vacancyId, result }[]`
en el mismo orden. Agrupar todas las vacantes de un perfil en una ejecución permite
extraer sus habilidades una sola vez. No hay caché global de habilidades.

`JOB_POSTING_AFFINITY_DATA` ofrece `readProfiles(userIds)` y
`readRequirements(vacancyIds)` con consultas agrupadas. El consumidor debe validar
permisos y alcance antes de solicitar esos IDs; este puerto interno no es una API
de acceso público. Los IDs de usuario y titulado se mantienen separados.

El perfil usa descripción vigente, formación, experiencia, certificaciones y
proyectos, incluidas tecnologías. Los campos se separan con saltos de línea al
invocar el NLP existente para evitar n-gramas entre campos. No depende de mentorías.

La completitud conserva provisionalmente la regla de postulación: un registro de
cada sección y descripción no vacía. Su flexibilización queda pendiente del PO.
La ausencia de habilidades reconocidas en un perfil completo produce 0 %.

La política base compara términos exactos normalizados, cuenta cada requisito
único una vez y redondea `cumplidos / total * 100` al entero más próximo.
`ready` incluye porcentaje, fecha ISO del servidor y comparación; `profile-incomplete`
y `no-requirements` tienen porcentaje y fecha nulos y comparación vacía.
Sin requisitos se devuelve `no-requirements` antes de evaluar el perfil o cargar NLP.
Un fallo del diccionario se propaga como `NLP_DICTIONARY_UNAVAILABLE`, reconocible
por el filtro global como dependencia no disponible (503), sin resultados ficticios.

Los contratos públicos y el límite de lote de 50 están en `packages/shared-types`.
Su validación HTTP, permisos por modo y errores individuales corresponden al futuro
endpoint de T10.5; persistir porcentaje/fecha corresponde a T10.4.

HU-11 puede sustituir la política de comparación. La base no equipara Java con
JavaScript; frente al cálculo web anterior algunos porcentajes pueden bajar.
Ese cambio debe explicarse al PO y al equipo de HU-11 antes de conectar las pantallas.

## Endpoint de afinidad por lote — T10.5

`POST /api/v1/affinity/batch` valida el request con Zod (1–50 UUIDs, únicos) y responde HTTP 200 con `{ data: [...] }` en el orden de entrada. El endpoint es de solo lectura: no persiste cálculos ni modifica porcentajes/fechas; esas escrituras permanecen en T10.4.

- **`mode: vacancies`**: requiere rol `titulado` y `perfil:self:read`. Se usa exclusivamente el usuario de la sesión. Vacantes deben estar publicadas y no vencidas; una vacante no visible dentro del lote invalida el lote con 403.
- **`mode: applicants`**: requiere rol `empresa` y `empresas:self:read`. La vacante debe ser propiedad del actor o de una empresa con membresía activa del actor; todas las postulaciones enviadas deben pertenecer a esa vacante. Un recurso fuera de alcance devuelve 403 al lote completo antes del matching.
- Fallos técnicos no relacionados con el diccionario se aíslan por elemento/perfil y devuelven `result: null`, `error: { code, message, retryable }`. La caída del diccionario se propaga a la respuesta global 503. Como el batch no escribe, nunca deja persistencia parcial.
- Vacante sin requisitos técnicos devuelve `no-requirements`, con percentage/calculatedAt null. Perfil incompleto se distingue de un perfil completo con `ready` y 0 %.

Los requests y negativos para ambos modos se encuentran en `bruno/Afinidad`.

### Ejemplos de request y response

Titulado:
```json
{
  "mode": "vacancies",
  "vacancyIds": ["00000000-0000-4000-8000-000000000001"]
}
```

Empresa:
```json
{
  "mode": "applicants",
  "vacancyId": "00000000-0000-4000-8000-000000000001",
  "applicationIds": ["00000000-0000-4000-8000-000000000002"]
}
```

Resultado exitoso (el modo empresa agrega `applicationId`):
```json
{
  "data": [
    {
      "vacancyId": "00000000-0000-4000-8000-000000000001",
      "applicationId": "00000000-0000-4000-8000-000000000002",
      "result": {
        "status": "ready",
        "percentage": 75,
        "calculatedAt": "2026-11-20T12:00:00.000Z",
        "comparison": []
      },
      "error": null
    }
  ]
}
```

Fallo individual (el elemento mantiene su identidad y el resto del batch puede devolver resultados):
```json
{
  "data": [
    {
      "vacancyId": "00000000-0000-4000-8000-000000000001",
      "result": null,
      "error": {
        "code": "AFFINITY_CALCULATION_FAILED",
        "message": "No se pudo calcular la afinidad de este recurso. Inténtalo nuevamente.",
        "retryable": true
      }
    }
  ]
}
```

Request inválido responde 400, falta autenticación 401, rol/permiso o recurso fuera de alcance 403 y diccionario NLP no disponible 503. Los errores globales no llevan `data` parcial.

### Comandos de pruebas

```bash
# Pruebas unitarias de políticas de afinidad
pnpm --filter api exec jest src/modules/job-postings/domain/policies/

# Pruebas unitarias de casos de uso (CalculateJobPostingAffinity y Batch)
pnpm --filter api exec jest src/modules/job-postings/application/use-cases/

# Pruebas del endpoint y esquemas HTTP
pnpm --filter api exec jest src/modules/job-postings/http/

# Pruebas de integración de postulación (idempotencia y persistencia de match)
pnpm --filter api exec jest src/modules/vacantes/vacantes.postulacion.spec.ts

# Pruebas del cliente y UI web
pnpm --filter web exec jest src/shared/services/job-posting-affinity.test.ts src/app/\\(dashboard\\)/job-postings/ src/app/portal/empleos/

# Prueba de integración con PostgreSQL real (opt-in; requiere TEST_DATABASE_URL)
TEST_DATABASE_URL=postgresql://usuario:clave@localhost:5432/postgres pnpm --filter api exec jest test/job-posting-affinity.integration.spec.ts
```

## Recálculo persistente HU-12

`RefreshJobPostingAffinity` reutiliza el caso de uso de HU-10 y persiste
únicamente postulaciones cuyo hash SHA-256 difiere de las entradas actuales.
Las consultas autorizadas de postulaciones y candidatos activan el recálculo
lazy; el batch HTTP de HU-10 sigue siendo de solo lectura. La arquitectura,
concurrencia, migración y límites están en
`apps/api/docs/endpoints/epic5/HU12-recalculo-automatico.md`.

