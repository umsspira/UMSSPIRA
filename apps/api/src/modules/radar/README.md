# Módulo Radar

Calcula, actualiza y expone el vector de afinidad profesional del titulado en seis áreas técnicas normalizadas a partir de los textos de su perfil (titulación, experiencia, formación académica y certificaciones).

## Áreas del Radar

Las seis áreas técnicas del catálogo son:

- `software-development`: Desarrollo de Software
- `cloud-devops`: Cloud y DevOps
- `data-ai`: Datos e Inteligencia Artificial
- `cybersecurity`: Ciberseguridad
- `mobile-development`: Desarrollo Móvil
- `quality-assurance`: Control de Calidad (QA)

El orden de estas áreas es canónico y determina la secuencia devuelta en el vector de respuesta.

## Desacoplamiento de NLP y Bounded Context

Tras la refactorización arquitectónica (HU-10), las responsabilidades quedan estrictamente separadas:

1. **NLP es un puerto externo para Radar**: Radar interactúa con NLP únicamente a través de su puerto `KeywordExtractorPort` (`application/ports/keyword-extractor.port.ts`), implementado por el adaptador `NlpKeywordExtractorAdapter`. Radar envía textos crudos y recibe exclusivamente `{ keywords: [{ term, count }], unmapped: [{ term, count }] }`.
2. **Radar es el dueño exclusivo del negocio de afinidad**:
   - **Lectura de pesos (`palabra_clave_area`)**: `AreaWeightReaderPort` (`application/ports/area-weight-reader.port.ts`) e implementación `PrismaAreaWeightReaderAdapter` leen las asociaciones de pesos directamente de PostgreSQL.
   - **Mapeo a áreas**: `domain/policies/keyword-area-mapper.ts` (`mapKeywordsToRadarAreas`) vincula cada palabra canónica con el área correspondiente y su peso (1 a 5).
   - **Cálculo matemático**: `domain/policies/affinity-calculator.ts` (`calculateAreaAffinity`) computa el puntaje, porcentaje saturado, ponderación máxima y las top keywords por área.
   - **Persistencia transaccional**: guarda `calculo_radar`, `afinidad_radar` y `palabra_clave_no_mapeada` en una única transacción atómica.

## Reglas del Algoritmo de Afinidad

El cálculo en `domain/policies/affinity-calculator.ts` obedece a las siguientes reglas de dominio:

- **Saturación independiente**: cada área calcula su afinidad de manera aislada. Añadir o acumular keywords en un área no reduce ni altera el puntaje de las otras.
- **Tope de frecuencia (`TOP_FREQUENCY = 3`)**: cada palabra clave aporta como máximo 3 veces su peso: $\text{puntos} = \text{peso} \times \min(\text{frecuencia}, 3)$.
- **Escala porcentual saturada**: el porcentaje del área se calcula sobre $MAX\_POSSIBLE\_SCORE = 40$ (equivalente a 8 keywords de peso 5 con frecuencia 1):
  $$\text{porcentaje} = \min\left(100, \max\left(0, \frac{\text{puntaje} \times 100}{40}\right)\right)$$
  Se publica redondeado a dos decimales (`AFFINITY_PERCENTAGE_DECIMALS = 2`).
- **Ponderación máxima (`ponderacion`)**: refleja el mayor peso individual (1 a 5) detectado en el área; si no hay coincidencias, devuelve `null`.
- **Top 5 palabras clave más influyentes (`palabrasClaveTop`)**:
  - Máximo 5 términos ordenados descendentemente por su aporte en puntos ($\text{peso} \times \min(\text{frecuencia}, 3)$).
  - Desempate alfabético determinista por código de carácter Unicode.
  - Cada elemento incluye `keyword`, `weight`, `frequency`, `points` y `percentage`.
- **Detección de cambios e idempotencia**: `calculateInputHash(texts)` calcula un hash SHA-256 de los textos de entrada junto a la versión del algoritmo (`ALGORITHM_VERSION = '1.0.0/2026-10-22.1'`). Si el hash no cambia respecto al último cálculo vigente, no se crean filas redundantes y se reutiliza el cálculo anterior (CA-HU8-11).
- **Control de concurrencia**: `radarRepository.executeWithAdvisoryLock(tituladoId, ...)` aplica un bloqueo asesor a nivel de transacción PostgreSQL (`pg_advisory_xact_lock`) sobre el ID del titulado para garantizar que clics simultáneos o peticiones concurrentes generen un único cálculo atómico.

## Endpoints HTTP

Prefijo global: `/api/v1/radar`

### 1. `GET /api/v1/radar`
Consulta el vector de afinidad del titulado autenticado.
- **Carga perezosa (Lazy GET)**: Si el egresado nunca tuvo un cálculo previo, se ejecuta el cálculo en ese instante y se persiste en estado `COMPLETADO` (o `VACIO` si no hay coincidencias). El resultado no expone el indicador `recalculated`.
- **Detección de perfil desactualizado**: Si ya existe un cálculo, compara el hash guardado con el hash de los textos vigentes de su perfil para informar `hasPendingChanges: true | false`.
- **Afinidad previa**: Devuelve `previousAffinity` a partir del cálculo inmediatamente anterior en el histórico.

### 2. `POST /api/v1/radar/recalculate`
Fuerza la ejecución del recálculo a partir de los textos actuales del perfil.
- Si el perfil no ha cambiado, devuelve el cálculo vigente sin insertar registros nuevos.
- Devuelve `recalculated: true` en el payload de respuesta.
- Calcula y persiste `palabras_clave_no_mapeada` en lote para auditoría y mejora continua del diccionario.

### 3. `GET /api/v1/radar/certifications/:area`
Lista las certificaciones del perfil del titulado que respaldan el área solicitada.
- Lee las certificaciones guardadas mediante `RadarCertificationReaderPort`.
- Evalúa el título y emisor de cada certificación con `KeywordExtractorPort` y los pesos del área elegida.
- Devuelve únicamente aquellas certificaciones que aporten puntaje $> 0$ en dicha área técnica.

### Seguridad y Permisos
- Requiere autenticación Bearer JWT.
- Exige los permisos `radar:self:read` para consultas y `radar:self:write` para recálculo (asignados al rol `titulado`).
- Peticiones sin token responden `401`; llamadas con roles no autorizados (como `empresa`) responden `403`.

## Pruebas y Regresión

- `affinity-calculator.spec.ts`: reglas puras del cálculo matemático, saturación y ordenamiento top 5.
- `keyword-area-mapper.spec.ts`: mapeo y preservación de pesos desde el catálogo de áreas.
- `prisma-area-weight-reader.adapter.spec.ts`: lectura y estructuración de pesos por área desde BD.
- `recalculate-radar.use-case.spec.ts`: ciclo de vida de recálculo, cálculo vacío, idempotencia y afinidad previa.
- `get-radar.use-case.spec.ts`: carga perezosa y detección de cambios pendientes.
- `get-area-certifications.use-case.spec.ts`: filtrado y ponderación de respaldos por certificación.
- `test/affinity-profiles.spec.ts`: regresión de los perfiles canónicos P1 a P13 con tolerancia $\le 0.01$.
- `test/radar-top-keywords.e2e.spec.ts`: contrato HTTP completo del radar con Nest y Supertest (10 pruebas E2E).
- `test/integration/radar.integration.spec.ts`: integración transaccional real contra PostgreSQL y advisory locks.

El módulo calcula y consulta la afinidad del titulado con las seis áreas del radar. La lectura de textos vive en `infrastructure/adapters/prisma-profile-text-reader.adapter.ts`; la regla de afinidad y la persistencia no cambian en esta entrega.

## Descripción profesional vigente

El radar usa una sola descripción de `perfil_area`: la fila más antigua del titulado. La consulta es `findFirst` con el orden `fecha_creacion asc, id asc`. Si dos filas comparten fecha, el id menor define la fila vigente. Las demás filas no se concatenan ni se suman al texto de entrada.

La regla es la misma que aplica Perfil para mostrar y guardar la descripción (`prisma-profile.repository.ts`: `descriptionOrder`, `findDescription` y `saveDescription`). Perfil actualiza la fila vigente dentro de una transacción que bloquea el titulado; Radar solo lee esa fila. Una fila nueva agregada por otro proceso no reemplaza la vigente.

`PerfilArea` no tiene una restricción unique sobre `id_titulado`. La aplicación no crea duplicados desde la interfaz, pero datos legacy, seeds manuales o escrituras externas pueden dejar varias filas. Por eso el radar debe ordenar y limitar la lectura.

Con una sola fila, el hash de entrada del radar conserva el mismo valor que antes de este cambio. Con varias filas, el hash cambia una vez porque la entrada deja de incluir textos que no pertenecen a la descripción vigente.

Los guardados concurrentes de Perfil se serializan con el bloqueo de la fila del titulado y reutilizan la misma fila. El recálculo del radar usa `pg_advisory_xact_lock` para evitar cálculos duplicados; no modifica `perfil_area`.

## Pruebas

- Unitarias: `src/modules/radar/infrastructure/adapters/prisma-profile-text-reader.adapter.spec.ts`.
- Integración: `test/integration/profile-description-radar.integration.spec.ts`. Es opt-in; usa `TEST_DATABASE_URL` solo como servidor PostgreSQL local, crea una base temporal, aplica migraciones y la borra al terminar. No apuntar esa variable a una base de QA o producción.

## Criterios CA-9 A/B

No se encontró en el repositorio una prueba backend etiquetada CA-9 A/B. La cobertura existente de afinidad está en `test/affinity-profiles.spec.ts`; la lectura de la descripción vigente y la concurrencia se cubren en las pruebas nuevas de este módulo. No se agregó un vector A/B porque la historia no incluye sus valores esperados.

Comando de integración:

```bash
TEST_DATABASE_URL="postgres://postgres:umsspira_local@127.0.0.1:5432/postgres" \
pnpm --filter api test:integration -- --runTestsByPath test/integration/profile-description-radar.integration.spec.ts
```
