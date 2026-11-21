# HU-10: Servicio de matching en backend (Épica 5)

Este documento describe la especificación técnica, reglas de negocio, contratos, endpoint por lote y consideraciones de integración del servicio de afinidad y matching laboral entre titulados y vacantes de empleo (HU-10).

---

## 1. Resumen y Propósito

El servicio de matching calcula la afinidad técnica entre el perfil profesional de un titulado y los requisitos técnicos estructurados de una vacante laboral (`vacante_requisito_tecnico`). Reemplaza el antiguo cálculo ejecutado en el navegador por un cálculo confiable y centralizado en el backend NestJS reutilizando el módulo `nlp`.

---

## 2. Reglas de Cálculo y Estados

### 2.1. Fórmula de Afinidad
- **Normalización de requisitos:** Se eliminan tildes, mayúsculas, espacios superfluos y caracteres irrelevantes para comparar en forma canónica (`normalizeTechnicalRequirementName`).
- **Coincidencias únicas:** Cada requisito técnico de la vacante se evalúa como máximo una vez; las repeticiones de una habilidad en distintas secciones del perfil no suman puntos extra.
- **Fórmula de porcentaje:**
  $$\text{porcentaje} = \text{round}\left(\frac{\text{requisitos cumplidos}}{\text{total de requisitos estructurados}} \times 100\right)$$
- **Redondeo:** Entero entre `0` y `100` (`Math.round`).
- **Separación estricta de lenguajes/tecnologías:** `Java` **NO** cumple `JavaScript` ni viceversa. `SQL` **NO** cumple `NoSQL`. `C` **NO** cumple `C++`.

### 2.2. Estados del Cálculo
| Estado | Condición | `percentage` | `calculatedAt` | `comparison` |
| :--- | :--- | :---: | :---: | :---: |
| `ready` | Perfil completo evaluado contra requisitos técnicos | Entero `0` a `100` | ISO 8601 del servidor | Detalle de cada requisito |
| `ready` (0 %) | Perfil completo sin ninguna coincidencia | `0` | ISO 8601 del servidor | Requisitos con `not-found` |
| `profile-incomplete` | Perfil que no cumple las 5 secciones requeridas | `null` | `null` | `[]` |
| `no-requirements` | Vacante sin requisitos técnicos estructurados | `null` | `null` | `[]` |

> **Prioridad:** Si una vacante no tiene requisitos técnicos estructurados, se responde inmediatamente `no-requirements` sin requerir la evaluación de completitud del perfil ni invocar el motor NLP.

### 2.3. Estructura de `comparison[]`
Cada elemento de la comparación técnica contiene:
- `requirement`: Nombre original del requisito en la vacante.
- `matchedSkill`: Habilidad coincidente encontrada en el perfil del titulado, o `null` si no hubo coincidencia.
- `result`: Tipo de coincidencia: `'exact'` | `'similar'` | `'not-found'`. En HU-10 se generan únicamente `'exact'` y `'not-found'` (HU-11 introducirá sinónimos y similares).

---

## 3. Completitud del Perfil Profesional

### 3.1. Regla Vigente (Provisional)
Para ser considerado completo para el cálculo de afinidad, el titulado debe contar con:
1. Al menos un registro en **formación académica** (`formacion_academica_registros`).
2. Al menos un registro en **experiencia laboral** (`experiencia_laboral_registros`).
3. Al menos un registro en **certificaciones** (`certificacion_registros`).
4. Al menos un registro en **proyectos** (`proyecto_registros`).
5. Al menos una **descripción profesional** no vacía en su perfil principal (`perfil_area_registros`).

> [!IMPORTANT]
> **ESTADO DE DISEÑO: PENDIENTE DEL PO.**
> Esta regla mantiene la misma condición requerida para la postulación tradicional. La posibilidad de flexibilizarla (por ejemplo, permitir perfiles sin certificaciones) está pendiente de confirmación con el Product Owner para historias posteriores.

---

## 4. Endpoint de Afinidad por Lote

- **Método y Ruta:** `POST /api/v1/affinity/batch`
- **Límites:** Mínimo `1`, máximo `50` elementos por solicitud. Solicitudes con más de 50 elementos o UUIDs duplicados responden `400 Bad Request`.
- **Naturaleza de la operación:** Solo lectura. No escribe en la base de datos ni modifica porcentajes de postulaciones.

### 4.1. Modo Titulado (`vacancies`)
- **Permisos requeridos:** Rol `titulado` y permiso `perfil:self:read`.
- El perfil evaluado es estrictamente el del usuario autenticado; el body no permite especificar identificadores de usuario externos.
- Todas las vacantes del lote deben ser públicas y vigentes.
```json
{
  "mode": "vacancies",
  "vacancyIds": [
    "44500000-0000-4000-8000-000000000001",
    "44500000-0000-4000-8000-000000000002"
  ]
}
```

### 4.2. Modo Empresa (`applicants`)
- **Permisos requeridos:** Rol `empresa` y permiso `empresas:self:read`.
- La empresa debe ser propietaria de la vacante (`vacancyId`).
- Todas las postulaciones (`applicationIds`) deben pertenecer a esa vacante. Si alguna postulación es ajena, se responde `403 Forbidden` al lote completo antes de procesar el cálculo.
```json
{
  "mode": "applicants",
  "vacancyId": "44500000-0000-4000-8000-000000000001",
  "applicationIds": [
    "44800000-0000-4000-8000-000000000001",
    "44800000-0000-4000-8000-000000000002"
  ]
}
```

### 4.3. Respuestas y Manejo de Errores

#### Respuesta Exitosa (HTTP 200)
Conserva estrictamente el orden de entrada y añade `applicationId` en modo empresa:
```json
{
  "data": [
    {
      "vacancyId": "44500000-0000-4000-8000-000000000001",
      "result": {
        "status": "ready",
        "percentage": 100,
        "calculatedAt": "2026-11-20T12:00:00.000Z",
        "comparison": [
          {
            "requirement": "Java",
            "matchedSkill": "java",
            "result": "exact"
          }
        ]
      },
      "error": null
    }
  ]
}
```

#### Aislamiento de Fallos Individuales
Si un ítem individual falla técnicamente, su resultado es `null` y reporta error con bandera `retryable: true`, sin bloquear a los demás elementos del lote:
```json
{
  "data": [
    {
      "vacancyId": "44500000-0000-4000-8000-000000000002",
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

#### Caída Global del Diccionario NLP (HTTP 503)
Si el diccionario de extracción NLP no está cargado o no se encuentra disponible, se aborta con error 503 global, sin respuestas parciales ni escrituras en la base de datos:
```json
{
  "error": {
    "code": "NLP_DICTIONARY_UNAVAILABLE",
    "message": "El diccionario de habilidades tecnicas no esta disponible actualmente. Por favor, reintente la operacion mas tarde."
  }
}
```

---

## 5. Persistencia en Postulación (T10.4)

Cuando un titulado formaliza su postulación a una vacante (`VacantesService.postular`):
1. Se calcula la afinidad técnica entre el perfil y los requisitos de la vacante.
2. Si el cálculo es exitoso, se persisten `porcentaje_match` (entero 0–100) y `fecha_match` (timestamp UTC) en la tabla `postulacion`.
3. **Restricción de Integridad:** Se aplica el constraint en base de datos `CHECK (("porcentaje_match" IS NULL) = ("fecha_match" IS NULL))`.
4. **Resiliencia e Idempotencia:**
   - Si la postulación ya existía previamente, la operación es idempotente y no recalcula ni sobreescribe datos.
   - Si el motor de afinidad o NLP experimenta una falla transitoria durante la postulación, la postulación se crea con `porcentaje_match: null` y `fecha_match: null`, garantizando que el postulante no pierda la oportunidad de registrar su interés.

---

## 6. Cliente Frontend y Consumo (T10.6)

El frontend (`apps/web`) consume exclusivamente el endpoint backend por lote a través de `apps/web/src/shared/services/job-posting-affinity.ts`:
- **Partición en bloques:** Divide automáticamente conjuntos de más de 50 vacantes en bloques secuenciales de tamaño máximo 50 (`JOB_POSTING_AFFINITY_BATCH_LIMIT`).
- **Eliminación de lógica local:** Se eliminó el archivo legacy de cálculo client-side y las dependencias de intereses de mentoría.
- **Visualización en UI:**
  - `0 %`: Se muestra como porcentaje real (barra vacía con texto "0%"), diferenciado explícitamente de perfil incompleto o vacante sin requisitos.
  - `profile-incomplete`: Muestra badge de perfil incompleto invitando a completarlo.
  - `no-requirements`: Muestra badge de sin requisitos técnicos.
  - Errores individuales: Botón de reintento para errores con `retryable: true` y para el error global 503.

---

## 7. Pruebas y Validación (T10.7)

### 7.1. Comandos de Verificación
```bash
# Pruebas unitarias de políticas de afinidad
pnpm --filter api exec jest src/modules/job-postings/domain/policies/

# Pruebas de casos de uso (single y batch)
pnpm --filter api exec jest src/modules/job-postings/application/use-cases/

# Pruebas de esquemas y controladores HTTP
pnpm --filter api exec jest src/modules/job-postings/http/

# Pruebas de integración de postulación (idempotencia y match)
pnpm --filter api exec jest src/modules/vacantes/vacantes.postulacion.spec.ts

# Pruebas de frontend (servicio y componentes)
pnpm --filter web exec jest src/shared/services/job-posting-affinity.test.ts src/app/\\(dashboard\\)/job-postings/ src/app/portal/empleos/

# Prueba de integración con PostgreSQL real (opt-in con TEST_DATABASE_URL)
TEST_DATABASE_URL=postgresql://usuario:clave@localhost:5432/postgres pnpm --filter api exec jest test/job-posting-affinity.integration.spec.ts
```

---

## 8. Solicitudes Bruno (`bruno/Afinidad/`)

Colección oficial de pruebas de endpoint:
1. `001-batch-graduate.bru`: Cálculo en lote para titulado (`mode: 'vacancies'`). Valida HTTP 200 y array de resultados.
2. `002-batch-company-applicants.bru`: Cálculo en lote para empresa (`mode: 'applicants'`). Valida HTTP 200 y presencia de `applicationId`.
3. `003-negativo-empresa-modo-titulado.bru`: Intento de rol empresa en modo titulado. Valida HTTP 403.
4. `004-negativo-titulado-modo-empresa.bru`: Intento de rol titulado en modo empresa. Valida HTTP 403.
5. `005-negativo-postulacion-ajena.bru`: Intento de empresa solicitando postulaciones de otra vacante ajena. Valida HTTP 403 global.

---

## 9. Propuesta de Descripción para Pull Request

```markdown
### [HU10] Servicio de matching de afinidad laboral en backend

#### Resumen
Implementación completa del motor de afinidad laboral en backend (HU-10) correspondiente a las tareas T10.1 a T10.8 de la Épica 5. Centraliza el cálculo de afinidad técnica en el backend mediante extracción NLP, provee endpoint por lote seguro y resiliente (`POST /api/v1/affinity/batch`), conecta las interfaces de usuario en el frontend retirando el cálculo legacy en cliente, y garantiza la persistencia atómica en postulaciones.

#### Cambios Principales
1. **Dominio y Políticas (`apps/api`):**
   - Política `calculateJobPostingAffinity`: cálculo normalizado entero 0–100, aislamiento Java vs JavaScript, distinción entre 0%, perfil incompleto y vacante sin requisitos.
   - Política `isAffinityProfileComplete`: verificación estricta de las 5 secciones profesionales requeridas (provisional, registrada como PENDIENTE DEL PO).
2. **Casos de Uso y Controladores (`apps/api`):**
   - `CalculateJobPostingAffinity`: extracción de habilidades agrupada para N vacantes.
   - `CalculateJobPostingAffinityBatch`: soporte para modos `vacancies` (titulado) y `applicants` (empresa), límite de 50 ítems, aislamiento de errores individuales (`retryable: true`) y propagación 503 ante caída del diccionario NLP.
   - `JobPostingAffinityBatchController`: endpoint `POST /api/v1/affinity/batch` validado con Zod y protegido con `AuthenticationGuard` y `PermissionsGuard`.
3. **Persistencia e Integración (`apps/api`):**
   - Migración de base de datos con constraint `CHECK (("porcentaje_match" IS NULL) = ("fecha_match" IS NULL))`.
   - Idempotencia y resiliencia en `VacantesService.postular`.
   - Prueba de integración opt-in con PostgreSQL real (`test/job-posting-affinity.integration.spec.ts`).
4. **Frontend (`apps/web`):**
   - Cliente `job-posting-affinity.ts` conectado a `POST /api/v1/affinity/batch` con partición en bloques de 50.
   - Eliminado cálculo legacy en cliente y dependencias de intereses de mentoría.
   - Listado y detalle de vacantes adaptados a estados `ready` (incluyendo 0%), `profile-incomplete`, `no-requirements` y estados de error con botón de reintento.
5. **Documentación y Pruebas:**
   - Colección Bruno en `bruno/Afinidad/` (solicitudes 001 a 005 con assertions).
   - Documentación técnica completa en `apps/api/docs/endpoints/epic5/HU10-servicio-matching.md` y `apps/api/src/modules/job-postings/README.md`.
   - Nota técnica para el PO y HU-11 explicando el impacto de retirar la equivalencia Java/JavaScript.

#### Verificación
- CI gate: `pnpm lint`, `pnpm test`, `pnpm build` pasando al 100%.
- Pruebas unitarias, e2e de límites (1, 50, 51 rechazado, UUID inválido, duplicados) y casos negativos de autorización validados.
```
