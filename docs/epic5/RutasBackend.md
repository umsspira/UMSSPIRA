# HU-001 · Rutas backend

## Contrato y arquitectura

La API Nest usa el prefijo global `/api/v1`. El proxy de Next reenvía las mismas rutas desde `/api/v1/...` del frontend y ya permite el módulo `job-postings`. Los dos endpoints se añadieron al módulo hexagonal existente `apps/api/src/modules/job-postings`; no se creó otro módulo ni se alteró el caso de uso de publicación.

Las peticiones pasan por los guards globales de sesión. El detalle valida el UUID con Zod y el `ZodValidationPipe`. Los controllers llaman casos de uso; los casos de uso consultan el puerto `JobPostingRepository`; Prisma es el adaptador; los presenters seleccionan el contrato HTTP.

## Regla única de disponibilidad

`Vacante.estado` en Prisma es `String?`, no un enum. El caso de uso de publicación de `job-postings` escribe `PUBLICADO`; la entidad de ese módulo contempla `PUBLICADO` y `CERRADO`. La migración de Épica 4 indica que `PUBLICADO` es el valor actual y `PUBLICADA` se conserva por compatibilidad. El cierre legado escribe `CERRADA`.

La política única está en [`job-posting-availability.policy.ts`](../../apps/api/src/modules/job-postings/domain/policies/job-posting-availability.policy.ts):

- Estados publicados admitidos exactamente: `PUBLICADO` y `PUBLICADA`.
- También debe cumplirse `fecha_cierre IS NULL OR fecha_cierre > now`.
- `CERRADO`, `CERRADA`, `ACTIVA`, `DISPONIBLE` y cualquier otro valor no publicado no están disponibles.
- La misma función se usa en listado y detalle. Una vacante que existe pero no satisface la regla del detalle se responde como 404.

El repositorio limita inicialmente la consulta del listado a los dos valores publicados mediante la constante de dominio. El caso de uso evalúa después la fecha de cierre con la misma función que usa el detalle.

## `GET /api/v1/job-postings`

**Proxy web:** `GET /api/v1/job-postings`  
**Controller:** `ListAvailableJobPostingsController`  
**Caso de uso:** `ListAvailableJobPostingsUseCase`  
**Schema Zod:** no hay parámetros de entrada.  
**Parámetros:** ninguno.  
**Tablas:** `vacante`, `empresa`.

Selecciona una fila por vacante, filtra por estados de publicación, ordena por `fecha_publicacion` descendente con nulos al final y usa `created_at` descendente como desempate. El caso de uso excluye cierres pasados. La consulta no une requisitos, por lo que no multiplica vacantes por cantidad de requisitos.

### Ejemplo de respuesta 200

```json
{
  "data": [
    {
      "id": "44500000-0000-4000-8000-000000000001",
      "titulo": "Desarrollador Backend",
      "empresa": "Empresa registrada",
      "fechaPublicacion": "2026-11-16T10:00:00.000Z"
    }
  ]
}
```

Sin resultados devuelve `200` con `{ "data": [] }`. Fallos de conexión de Prisma se traducen por el filtro global a `503 DATABASE_UNAVAILABLE`; errores no traducidos responden `500 INTERNAL_ERROR`. El frontend muestra el estado de error y permite repetir la consulta.

## `GET /api/v1/job-postings/:id`

**Proxy web:** `GET /api/v1/job-postings/{id}`  
**Controller:** `GetAvailableJobPostingController`  
**Caso de uso:** `GetAvailableJobPostingUseCase`  
**Schema Zod:** `jobPostingIdSchema = z.uuid()` en `job-postings.schemas.ts`.  
**Parámetro de ruta:** `id`, UUID de la vacante.  
**Tablas:** `vacante`, `empresa`, `vacante_requisito_tecnico`.

El repositorio consulta `Vacante` por `id` y selecciona sus propias filas de `requisito_tecnico_registros`; no consulta ni incluye requisitos de otra vacante. El caso de uso aplica la política de disponibilidad antes de devolver el resultado.

### Ejemplo de respuesta 200

```json
{
  "data": {
    "id": "44500000-0000-4000-8000-000000000001",
    "titulo": "Desarrollador Backend",
    "empresa": "Empresa registrada",
    "fechaPublicacion": "2026-11-16T10:00:00.000Z",
    "descripcionTecnica": "Descripción registrada por la empresa.",
    "modalidad": "REMOTO",
    "nivelExperiencia": "JUNIOR",
    "requisitos": [
      {
        "id": "55000000-0000-4000-8000-000000000001",
        "nombre": "Python"
      }
    ]
  }
}
```

`empresa`, `fechaPublicacion`, `descripcionTecnica`, `modalidad` y `nivelExperiencia` conservan `null` si así están registrados. `requisitos` siempre es un array. Si está vacío, el frontend presenta el texto CA-09.

El presenter deduplica también en lectura usando `normalizeTechnicalRequirementName`: normalización Unicode NFD, retiro de marcas diacríticas, trim, colapso de espacios y minúsculas. Por eso `Python`, `python` y `pythón` comparten clave; se conserva el primer nombre original.

### Ejemplos de error

UUID mal formado — `400`:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Los datos enviados no son válidos",
    "fields": {
      "_root": ["Invalid UUID"]
    }
  }
}
```

No existe o no está disponible — `404`:

```json
{
  "error": {
    "code": "JOB_POSTING_NOT_FOUND",
    "message": "Vacante no encontrada"
  }
}
```

Base no disponible — `503`:

```json
{
  "error": {
    "code": "DATABASE_UNAVAILABLE",
    "message": "La base de datos no está disponible"
  }
}
```

Fallo interno no traducido — `500`:

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Ocurrió un error inesperado"
  }
}
```

## Modelo y migración

La tabla nueva es `public.vacante_requisito_tecnico`, hija de `vacante`. Contiene `id`, `id_vacante`, `nombre`, `nombre_normalizado`, `created_at` y `updated_at`; la unicidad por vacante es `(id_vacante, nombre_normalizado)`. El `nombre_normalizado` se prepara en el futuro flujo de escritura; no depende de la extensión PostgreSQL `unaccent`.

El modelo Prisma es `VacanteRequisitoTecnico`, relacionado desde `Vacante`. La migración [`20261116190000_epic5_hu001_requisitos_tecnicos/migration.sql`](../../apps/api/prisma/migrations/20261116190000_epic5_hu001_requisitos_tecnicos/migration.sql) usa `CREATE TABLE IF NOT EXISTS` y `CREATE UNIQUE INDEX IF NOT EXISTS`; no altera tablas existentes. La comprobación previa en la DB local y en la DB de pruebas del equipo confirmó que el nombre aún no existía.

**Solo lectura en HU-001:** no hay endpoints ni UI de escritura para esta tabla y no hay backfill ni parsing de `descripcion_tecnica`. Otra HU/equipo debe definir y proporcionar la escritura de requisitos. Mientras no existan filas, el detalle responde `requisitos: []`. No hay cálculo de afinidad.

La migración se creó, pero su aplicación está pendiente de que Node 22 esté activo, según la instrucción del equipo. No se aplicó a la DB de pruebas del equipo.

## Bruno

- `GET {{baseUrl}}/api/v1/job-postings`: `bruno/Vacantes/002-list-available-job-postings.bru`.
- `GET {{baseUrl}}/api/v1/job-postings/{{jobPostingId}}`: `bruno/Vacantes/003-get-available-job-posting.bru`.
- Ambas peticiones usan `accessToken`; la variable manual del detalle se obtiene de la respuesta del listado.

## Pruebas y criterios de aceptación

| Criterio | Cobertura |
|---|---|
| CA-01 | Caso de uso y e2e de listado ordenado, empresa y resultados únicos por vacante. |
| CA-02 | Política de fecha/estado y e2e donde una fecha de cierre pasada desaparece en la siguiente petición. |
| CA-03–CA-05 | Estados de carga, vacío, error y retry en los tests de componentes frontend. |
| CA-06 | E2E del detalle y navegación «Ver oferta». |
| CA-07 | Test unitario del presenter con `Python`/`python`/`pythón`; no se duplican filas reales por el índice único. |
| CA-08 | Test e2e con requisitos distintos por vacante y test del selector del repositorio. |
| CA-09 | Presenter devuelve array vacío y test frontend verifica el mensaje. |
| CA-10 | E2E de UUID inexistente/cerrado con 404 y test frontend del estado 404. |
| CA-11 | E2E de fallo de repositorio y test frontend de error de detalle/reintento. |

Los tests usan `InMemoryJobPostingRepository` y fixtures exclusivos de test; la API de producción no recibe datos mock.

## Archivos previstos/añadidos por capa

- **DB:** modificado `apps/api/prisma/schema.prisma`; añadido `apps/api/prisma/migrations/20261116190000_epic5_hu001_requisitos_tecnicos/migration.sql`.
- **Backend:** nuevo contrato de lectura, política de disponibilidad y normalización, error 404, casos de uso de listado/detalle, traductor, controllers y presenter; extendidos puerto, repositorio Prisma, providers, schema Zod y módulo `job-postings`.
- **Shared types:** añadido `packages/shared-types/src/available-job-posting.ts`; `packages/shared-types/src/index.ts` solo incorpora el export nuevo.
- **Frontend:** servicio, listado, detalle, página dinámica y tests; se integra el listado en la sección de empleos y se amplía el matcher del middleware. El proxy no cambia porque `job-postings` ya estaba permitido.
- **Tests API:** policy, casos de uso, presenter, repositorio y e2e con adaptador en memoria.
- **Bruno:** dos requests nuevos y una variable manual `jobPostingId`; actualizada la cantidad de rutas de Vacantes en su README.
- **Documentación:** este archivo y `RutasFrontend.md`; no se añade otro archivo a `docs/epic5`.

La implementación extiende el módulo existente y mantiene el cambio aditivo. No requiere cambio de `AppModule`, `package.json` raíz, CI, lockfile, `render.yaml` ni build step de shared-types. No se creó commit.
