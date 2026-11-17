# HU-15 · T15.2: Conjunto de perfiles de referencia y procedimiento de comparación antes y después

Base verificada: `b5460cfc` (`epic3`).
Criterios cubiertos: `CA-HU15-02`, `CA-HU15-03` y `CA-HU15-04`.

## 1. Conjunto de perfiles de referencia (`P1` a `P13`)

Los 13 perfiles de referencia se ejecutan con las implementaciones productivas de `KeywordExtractorService` (`apps/api/src/modules/nlp/application/services/keyword-extractor.service.ts`) y `calculateAreaAffinity` (`apps/api/src/modules/radar/domain/affinity-calculator.ts`):

| ID | Nombre del perfil | Texto de entrada | Resultado esperado (`score` línea base) |
| :--- | :--- | :--- | :--- |
| **P1** | Alias corto JS | `JS` | `software-development: 5` |
| **P2** | Canónica JavaScript | `JavaScript` | `software-development: 5` |
| **P3** | Keyword canónica de varias palabras | `desarrollo de software` | `software-development: 5` |
| **P4** | Alias de varias palabras | `rest api` | `software-development: 4` |
| **P5** | Alias ML | `ML` | `data-ai: 5` |
| **P6** | Frecuencia limitada a tres | `javascript javascript javascript javascript javascript` | `software-development: 15` |
| **P7** | Saturación del puntaje a cien | Triple bloque de 18 términos de software | `software-development: 100`, `cloud-devops: 6`, `data-ai: 33` |
| **P8** | Perfil sin keywords | `""` | Todos los ejes en `0` |
| **P9** | Node.js no se confunde con JavaScript | `Node.js` | `software-development: 5` |
| **P10** | Node.js y JavaScript independientes | `Node.js JavaScript` | `software-development: 10` |
| **P11** | Python aporta con su peso a cada área | `Python` | `software-development: 3`, `data-ai: 4` |
| **P12** | Git aporta de manera independiente a dos áreas | `Git` | `software-development: 2`, `cloud-devops: 2` |
| **P13** | Lista top ordenada y limitada a cinco keywords | `javascript typescript node.js react angular java` | `software-development: 28` |

Adicionalmente se define el perfil de control de candidato **`PC-01`**:
- **Texto:** `OpenTelemetry y otel en Kubernetes`
- **Propósito:** contrastar el reconocimiento de un término candidato aprobado y sus alias frente al diccionario vigente.

---

## 2. Formato de evaluación de término candidato (`CA-HU15-02`)

Antes de incorporar cualquier término proveniente de la consulta agregada de no reconocidos (`T15.1`), se registra su ficha técnica:

| Campo | Ejemplo de referencia (`OpenTelemetry`) |
| :--- | :--- |
| **Término canónico** | `opentelemetry` |
| **Significado** | Estándar y conjunto de herramientas de observabilidad para trazas, métricas y logs en sistemas distribuidos y nativos de la nube. |
| **Ambigüedades evaluadas** | Baja ambigüedad: es un nombre técnico específico y no colisiona con términos del lenguaje común ni con otros ejes. |
| **Alias propuestos** | `otel` |
| **Áreas y pesos propuestos** | `cloud-devops`: peso `3` |
| **Decisión** | Aprobado para prueba de impacto antes/después |

---

## 3. Procedimiento de comparación antes y después (`CA-HU15-03` y `CA-HU15-04`)

1. **Ejecución sobre el diccionario vigente (Antes):** cargar `RADAR_DICTIONARY` en `KeywordExtractorService` y evaluar `P1` a `P13` y `PC-01` con `calculateAreaAffinity`, registrando `score`, `percentage`, `weighting`, `topKeywords` y `unmapped`.
2. **Ejecución sobre el diccionario candidato (Después):** incorporar únicamente los términos y pesos aprobados y reejecutar `P1` a `P13` y `PC-01` con las mismas funciones productivas.
3. **Verificación de invariancia y registro de cambios:**
   - **Perfiles sin los términos nuevos:** los trece fixtures P1–P13 conservan puntaje y porcentaje en los seis ejes con tolerancia de 0,01. El radar usa un denominador fijo de 40 puntos.
   - **Perfil PC-01:** antes, OpenTelemetry y otel quedan sin mapear y Kubernetes aporta 5 puntos (12,50 %). Después, las dos menciones del término canónico aportan 6 puntos. Cloud/DevOps sube a 11 puntos (27,50 %), una diferencia de 15 puntos porcentuales.
   - **Comando de verificación:** `pnpm --filter api test -- affinity-profiles.spec.ts`
