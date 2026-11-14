# HU2: Gestión de requisitos técnicos por vacante

## 1. Identificación

| Dato         | Descripción                                                                         |
| ------------ | ----------------------------------------------------------------------------------- |
| Historia     | HU2 — Gestión de requisitos técnicos                                                |
| Área         | Empresas / Publicación y administración de vacantes                                 |
| Estado       | Implementada; migración incluida en el repositorio y aplicada a la base configurada |
| Frontend     | Next.js, ruta de requisitos técnicos de una vacante                                 |
| Backend      | NestJS, módulo `job-postings`                                                       |
| Persistencia | PostgreSQL, mediante la tabla `public.vacante_requisito_tecnico`                    |

El diseño y la interfaz toman como referencia la HU y los mockups de `HU2.pdf`. La funcionalidad permite definir, consultar y mantener la lista de competencias técnicas de cada vacante sin mezclarla con las de otras vacantes.

## 2. Historia y objetivo

**Como empresa que administra una vacante, quiero registrar las competencias técnicas requeridas y el nivel esperado para que las personas postulantes conozcan qué conocimientos se necesitan para el puesto.**

La información se guarda asociada a una vacante específica. Cada requisito puede clasificarse como obligatorio o deseable e incluir una descripción aclaratoria.

## 3. Alcance funcional

Incluye:

- Consultar los requisitos de una vacante.
- Agregar varias competencias a una lista de trabajo.
- Editar el nombre, nivel, clasificación y descripción de una competencia.
- Quitar una competencia de la lista de trabajo.
- Guardar la lista completa de forma atómica.
- Rechazar competencias duplicadas dentro de la misma vacante, incluso cuando varían las mayúsculas, los espacios o los diacríticos.
- Aislar los requisitos por vacante y controlar el acceso según el alcance de empresa de la sesión.
- Conservar la lista actual si una petición de reemplazo contiene duplicados y es rechazada.

No incluye búsqueda de vacantes, un catálogo central de competencias, gestión de requisitos por separado, ni mostrar los requisitos en la vista pública para personas postulantes. El endpoint de guardado reemplaza la colección completa; no es una operación individual de alta/edición/borrado en el servidor.

## 4. Criterios de aceptación cubiertos

1. Una empresa autorizada puede asociar múltiples competencias técnicas a una vacante.
2. Cada competencia guarda nivel esperado, tipo y descripción opcional.
3. La consulta de una vacante devuelve únicamente sus propios requisitos.
4. No se puede guardar dos veces la misma competencia normalizada en una vacante.
5. Se puede agregar, editar y quitar requisitos antes de confirmar los cambios.
6. La confirmación persiste toda la lista; una lista vacía quita todos los requisitos de esa vacante.
7. El acceso requiere sesión, permiso de publicación de vacantes y alcance sobre la empresa propietaria.
8. Una actualización fallida no debe dejar una lista parcialmente reemplazada.

## 5. Navegación y uso de la pantalla

### Acceso

Se puede abrir la gestión de requisitos de estas maneras:

1. **Después de publicar:** al publicar una vacante correctamente, el formulario redirige directamente a la gestión de requisitos de esa nueva vacante.
2. **Desde una vacante existente:** entrar a **Mis vacantes**, abrir el detalle de una vacante y seleccionar **Requisitos técnicos**.

La ruta interna es:

```text
/empresa/mis-vacantes/:id/requisitos-tecnicos
```

La página de Next.js está en [`page.tsx`](../apps/web/src/app/%28dashboard%29/empresa/mis-vacantes/%5Bid%5D/requisitos-tecnicos/page.tsx). El formulario de publicación que realiza la redirección es [`publish-vacancy-form.tsx`](../apps/web/src/shared/components/publish-vacancy-form.tsx); el acceso desde el detalle está en [`[id]/page.tsx`](../apps/web/src/app/%28dashboard%29/empresa/mis-vacantes/%5Bid%5D/page.tsx).

### Agregar

1. Completar **Competencia técnica**.
2. Elegir **Nivel esperado**.
3. Seleccionar **Tipo**: obligatorio o deseable. El valor inicial es obligatorio.
4. Opcionalmente completar **Descripción**.
5. Pulsar **Agregar requisito**.
6. Repetir para cada competencia.
7. Pulsar **Guardar requisitos** para persistir la lista.

Agregar o editar un requisito actualiza primero el borrador local. Los cambios no llegan al servidor hasta confirmar con **Guardar requisitos**.

### Editar o quitar

- **Editar** abre un formulario para cambiar los datos del elemento. **Guardar cambios** confirma el cambio en el borrador, no en la base de datos.
- **Quitar** retira el elemento del borrador.
- Tras quitar todos los elementos, se puede pulsar **Guardar requisitos** para guardar una lista vacía y borrar la lista anterior.
- **Mis vacantes** y **Atrás** regresan al listado de vacantes.

### Presentación y estados

La página muestra el nombre de la vacante, el formulario de alta y la lista existente. Contempla carga, lista vacía, avisos de éxito y errores. Los controles de lista se adaptan a pantallas pequeñas. La tipografía base del frontend es Inter, definida localmente en el layout de la aplicación.

El componente de pantalla está en [`technical-requirements-manager.tsx`](../apps/web/src/modules/job-postings/frontend/components/technical-requirements-manager.tsx).

## 6. Datos y reglas de negocio

| Campo                | Obligatorio | Regla                                                                            | Ejemplo                    |
| -------------------- | ----------: | -------------------------------------------------------------------------------- | -------------------------- |
| `competenciaTecnica` |          Sí | Texto no vacío después de quitar espacios en los extremos; máximo 120 caracteres | `SQL`                      |
| `nivelEsperado`      |          Sí | `BASICO`, `INTERMEDIO` o `AVANZADO`                                              | `AVANZADO`                 |
| `tipo`               |          Sí | `OBLIGATORIO` o `DESEABLE`                                                       | `OBLIGATORIO`              |
| `descripcion`        |          No | Máximo 500 caracteres; se acepta ausente o vacío                                 | `Consultas y optimización` |

Límites de colección:

- Máximo 50 requisitos por vacante.
- Cero requisitos es válido y significa dejar la lista vacía.
- No se permiten propiedades adicionales en el body de guardado.

### Detección de duplicados

Antes de comparar, se normaliza el nombre de la competencia: Unicode NFD, eliminación de marcas diacríticas, recorte de espacios en los extremos, compactación de espacios consecutivos y conversión a minúsculas con configuración regional española. Por eso `Tecnología`, `tecnologia` y `TECNOLOGIA` se consideran la misma competencia.

La interfaz ayuda a evitar duplicados al agregarlos o editarlos. La API vuelve a validar la lista y la restricción única compuesta de PostgreSQL constituye una protección adicional al persistir.

## 7. API

Los endpoints usan el prefijo global `/api/v1`. Ambos requieren el permiso `vacantes:create` y verifican que la vacante esté asociada a una empresa incluida en `actor.scopes.companyIds`.

### Consultar requisitos

```http
GET /api/v1/job-postings/{vacancyId}/technical-requirements
Authorization: Bearer <accessToken>
```

`vacancyId` debe ser un UUID. Respuesta `200`:

```json
{
  "data": {
    "vacanteId": "00000000-0000-4000-8000-000000000001",
    "vacanteTitulo": "Desarrollador de software",
    "requisitos": [
      {
        "id": "00000000-0000-4000-8000-000000000002",
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

Si la vacante todavía no tiene requisitos, `requisitos` es `[]`. La consulta no devuelve requisitos pertenecientes a otra vacante.

### Reemplazar la lista

```http
PUT /api/v1/job-postings/{vacancyId}/technical-requirements
Authorization: Bearer <accessToken>
Content-Type: application/json
```

Body:

```json
{
  "requisitos": [
    {
      "competenciaTecnica": "SQL",
      "nivelEsperado": "AVANZADO",
      "tipo": "OBLIGATORIO",
      "descripcion": "Consultas y optimización"
    },
    {
      "competenciaTecnica": "Power BI",
      "nivelEsperado": "INTERMEDIO",
      "tipo": "DESEABLE",
      "descripcion": ""
    }
  ]
}
```

La respuesta `200` devuelve el objeto de vacante y la lista confirmada en la misma forma que el `GET`. Si `descripcion` se omite, la API la normaliza a una cadena vacía en la respuesta.

El reemplazo es total: para quitar todos los requisitos se envía:

```json
{ "requisitos": [] }
```

Para clientes autenticados mediante cookies, el `PUT` debe incluir el token CSRF requerido por la protección global de la API. El cliente web utiliza el mecanismo autenticado compartido del proyecto.

### Errores relevantes

|  HTTP | Código / situación                                            | Significado                                                                              |
| ----: | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `400` | UUID o body no válido                                         | Falla la validación del identificador o del esquema de entrada.                          |
| `401` | Sesión ausente, inválida o vencida                            | Iniciar sesión nuevamente.                                                               |
| `403` | Falta `vacantes:create`, o falla CSRF en solicitud con cookie | La sesión no puede ejecutar la operación o no cumple la protección CSRF.                 |
| `404` | `JOB_POSTING_NOT_FOUND`                                       | Vacante inexistente o fuera del alcance de empresa del actor.                            |
| `409` | `DUPLICATE_TECHNICAL_REQUIREMENT`                             | Hay competencias duplicadas tras normalizarlas; la colección anterior permanece intacta. |
| `503` | `TECHNICAL_REQUIREMENTS_UNAVAILABLE`                          | El esquema no se encuentra aplicado en el entorno al que apunta la API.                  |

## 8. Persistencia y modelo de datos

La entidad se guarda en `public.vacante_requisito_tecnico` y se relaciona con `public.vacante` mediante `id_vacante`.

| Columna                   | Tipo / regla                               | Uso                                                           |
| ------------------------- | ------------------------------------------ | ------------------------------------------------------------- |
| `id`                      | UUID, PK, generado con `gen_random_uuid()` | Identificador del requisito.                                  |
| `id_vacante`              | UUID, FK no nula a `vacante.id`            | Asociación con una vacante. La FK aplica `ON DELETE CASCADE`. |
| `competencia_tecnica`     | `varchar(120)`, no nula                    | Texto visible ingresado por la empresa.                       |
| `competencia_normalizada` | `varchar(120)`, no nula                    | Clave de comparación normalizada calculada por la aplicación. |
| `nivel_esperado`          | `varchar(20)`, no nula, `CHECK`            | Nivel técnico admitido.                                       |
| `tipo`                    | `varchar(20)`, no nula, `CHECK`            | `OBLIGATORIO` o `DESEABLE`.                                   |
| `descripcion`             | `varchar(500)`, nullable                   | Contexto opcional.                                            |
| `creado_en`               | `timestamptz(6)`, default `now()`          | Fecha de creación del registro.                               |
| `actualizado_en`          | `timestamptz(6)`, default `now()`          | Fecha inicial de actualización del registro.                  |

La unicidad `(id_vacante, competencia_normalizada)` evita duplicados para una vacante y permite consultar por `id_vacante` sin un índice adicional. Las restricciones `CHECK` de la base validan el conjunto permitido para nivel y tipo y rechazan nombres normalizados vacíos.

`PUT` se ejecuta en una transacción: primero bloquea la fila de la vacante incluida en el alcance del actor, luego elimina sus requisitos previos e inserta la lista nueva. Si falla una inserción, la transacción revierte también el borrado. Cada guardado exitoso reemplaza los registros y genera nuevos UUID y fechas de creación.

El modelo Prisma, la relación inversa y el SQL están versionados en [`schema.prisma`](../apps/api/prisma/schema.prisma) y [`migration.sql`](../apps/api/prisma/migrations/20261110183000_hu2_requisitos_tecnicos/migration.sql). El detalle con el SQL completo también está en [HU2: esquema y migración de requisitos técnicos](./hu2-requisitos-tecnicos-esquema.md).

## 9. Arquitectura y archivos principales

### Frontend

- Página de ruta: [`page.tsx`](<../apps/web/src/app/(dashboard)/empresa/mis-vacantes/%5Bid%5D/requisitos-tecnicos/page.tsx>).
- Formulario, borrador y acciones: [`technical-requirements-manager.tsx`](../apps/web/src/modules/job-postings/frontend/components/technical-requirements-manager.tsx).
- Cliente de los endpoints: [`technical-requirements.service.ts`](../apps/web/src/modules/job-postings/frontend/services/technical-requirements.service.ts).
- Tipos y normalización compartidos: [`job-posting.ts`](../packages/shared-types/src/job-posting.ts).

### API

- Controladores de lectura y guardado: [`get-technical-requirements.controller.ts`](../apps/api/src/modules/job-postings/http/controllers/get-technical-requirements.controller.ts) y [`save-technical-requirements.controller.ts`](../apps/api/src/modules/job-postings/http/controllers/save-technical-requirements.controller.ts).
- Esquema de validación: [`technical-requirements.schemas.ts`](../apps/api/src/modules/job-postings/http/schemas/technical-requirements.schemas.ts).
- Casos de uso: [`get-technical-requirements.use-case.ts`](../apps/api/src/modules/job-postings/application/use-cases/get-technical-requirements.use-case.ts) y [`save-technical-requirements.use-case.ts`](../apps/api/src/modules/job-postings/application/use-cases/save-technical-requirements.use-case.ts).
- Puerto de persistencia: [`technical-requirements-repository.port.ts`](../apps/api/src/modules/job-postings/application/ports/technical-requirements-repository.port.ts).
- Adaptador PostgreSQL/Prisma: [`prisma-technical-requirements.repository.ts`](../apps/api/src/modules/job-postings/infrastructure/repositories/prisma-technical-requirements.repository.ts).
- Traducción del contrato HTTP: [`technical-requirements.presenter.ts`](../apps/api/src/modules/job-postings/http/presenters/technical-requirements.presenter.ts).

## 10. Seguridad y autorización

- No se confía en un identificador de empresa enviado por el cliente para escoger el dueño del requisito: el servidor verifica el alcance de la vacante contra las empresas de la sesión.
- Los dos endpoints requieren sesión válida y permiso `vacantes:create`.
- Las solicitudes mediante cookie están sujetas a la protección CSRF global; las pruebas cubren rechazo sin token y aceptación con token válido.
- El acceso a una vacante ajena se presenta como `404`, evitando revelar recursos fuera del alcance del actor.
- Los datos del body se validan en servidor; la validación del navegador es solo una ayuda de experiencia de usuario.

## 11. Pruebas y verificación

Las pruebas existentes verifican asociación de varias competencias, aislamiento entre dos vacantes, normalización de duplicados, preservación de la colección al rechazar duplicados, guardado de una lista vacía, autorización/sesión, CSRF y rechazo de valores de nivel no admitidos. La prueba de interfaz cubre carga, agregado, duplicado, edición, eliminación y guardado de lista vacía.

Desde la raíz del monorepo, ejecutar:

```powershell
pnpm --filter api exec jest --runInBand --runTestsByPath test/companies-job-postings.e2e.spec.ts
pnpm --filter web exec jest --runInBand --runTestsByPath src/modules/job-postings/frontend/components/technical-requirements-manager.test.tsx
pnpm --filter api typecheck
pnpm --filter web exec tsc --noEmit
```

La migración se validó con Prisma y se comprobó una inserción/lectura dentro de una transacción revertida para no dejar registros de prueba. Las solicitudes guardadas de forma normal se verifican adicionalmente recorriendo la interfaz y consultando el detalle de la vacante.

Las peticiones Bruno de lectura y guardado están en [`002-get-technical-requirements.bru`](../bruno/Vacantes/002-get-technical-requirements.bru) y [`003-save-technical-requirements.bru`](../bruno/Vacantes/003-save-technical-requirements.bru). Requieren configurar `baseUrl`, `accessToken` y `vacancyId` en el entorno local de Bruno.

## 12. Migración y despliegue

La migración del repositorio es:

```text
apps/api/prisma/migrations/20261110183000_hu2_requisitos_tecnicos/migration.sql
```

Se aplicó al datasource configurado en el entorno de trabajo y Prisma informó que las migraciones estaban al día. Para aplicar cambios pendientes en otro entorno, primero confirmar que sus variables de conexión apunten a la base correcta y luego ejecutar desde la raíz:

```powershell
pnpm --filter api exec prisma migrate deploy
```

`migrate deploy` aplica todas las migraciones pendientes del repositorio en ese datasource, no solo HU2. No usarlo contra una base no prevista. Después, comprobar el estado y generar el cliente Prisma:

```powershell
pnpm --filter api exec prisma migrate status
pnpm --filter api exec prisma generate
```

No se deben copiar secretos ni URLs de conexión a esta documentación o a Bruno versionado.

## 13. Limitaciones y consideraciones

- La gestión está dirigida a miembros de empresa con el permiso configurado `vacantes:create`; no existe un permiso separado para administrar requisitos.
- El contrato de `PUT` reemplaza la colección completa. Cualquier otro cliente que lo consuma debe enviar la lista final, no solo el elemento modificado.
- Se admiten hasta 50 elementos por solicitud y vacante.
- Si un despliegue de API se conecta a una base que aún no tiene la migración, la API devuelve un error explícito `503`; debe desplegarse el esquema antes de habilitar este flujo en ese entorno.
- El diseño no crea ni rellena registros en las tablas antiguas `requerimiento_laboral` o `requerimiento_habilidad`, pues estas representan conceptos y relaciones distintas.
