# HU-11 · Similitud avanzada del motor de afinidad

> Estado: **integrada con la HU-10.** La regla vive en `apps/api/src/modules/job-postings/domain/policies/requirement-similarity.ts` y la usa `calculateJobPostingAffinity` (motor de `POST /api/v1/affinity/batch`). Esta HU no agrega endpoints ni migraciones.

## Problema

El cálculo actual (`apps/web/src/shared/services/job-posting-affinity.ts`) compara substrings normalizados. Eso da falsos positivos y falsos negativos:

- «Java» coincide con «JavaScript» porque una cadena contiene a la otra.
- «JS» no coincide con «JavaScript».
- «Bases de datos relacionales» no coincide con «base de datos relacional».

Además, los requisitos de la vacante no pasan por el diccionario del módulo `nlp`. Por eso los alias del perfil (tabla `alias_palabra_clave`) no sirven del lado de la vacante.

## Qué hace el motor

Cada requisito pasa por el mismo procesamiento que el perfil:

1. Normalización: `normalizeText`.
2. Diccionario y alias: `KeywordExtractorService`.
3. Raíz de cada palabra: `stemToken`, en `nlp/domain/policies/light-stemmer.ts`.

Cada campo del perfil se extrae por separado, para no formar n-gramas entre campos distintos.

| Caso | Resultado | Peso | Ejemplo |
|---|---|---|---|
| Todas las canónicas del requisito están en el perfil y al requisito no le sobran palabras desconocidas | `exact` | 100 % | «JS» ↔ «JavaScript», «Postgres» ↔ «PostgreSQL», «Kubernetes» ↔ «k8s» |
| Requisito fuera del diccionario cuya frase aparece, por raíces, en un mismo texto del perfil | `exact` | 100 % | «Bases de datos relacionales» ↔ «base de datos relacional» |
| Parte de las canónicas está en el perfil, o el requisito trae palabras de más | `similar` | 50 % | «React Native» ↔ «React», «Docker Compose» ↔ «Docker» |
| Una canónica contiene a la otra | `similar` | 50 % | «Spring Boot» ↔ «Spring» |
| Requisito fuera del diccionario con al menos la mitad de sus palabras (2 o más) en un mismo texto del perfil | `similar` | 50 % | «Pruebas unitarias automatizadas» ↔ «pruebas automatizadas con Cypress». No aplica a términos del diccionario: «Machine» solo no cumple «Machine Learning» |
| Ninguna de las anteriores | `not-found` | 0 % | «Java» ↔ «JavaScript» |

Porcentaje: suma de pesos ÷ número de requisitos × 100, redondeado a 2 decimales. Los requisitos vacíos se ignoran. Si no queda ninguno, el resultado es `percentage: 0` con `comparison: []`, y la HU-10 decide el estado (`insufficient-requirements`); el motor no inventa porcentajes.

`comparison[]` trae `requirement`, `matchedSkill`, `result` (`exact`, `similar` o `not-found`, los mismos valores que ya usa la UI) y `weight`.

### Por qué la coincidencia parcial vale 50 %

Una coincidencia parcial muestra conocimiento relacionado, pero no confirma el requisito. Con 50 %, dos parciales equivalen a una exacta. Con 50 %, un perfil que solo tiene coincidencias parciales nunca supera el 50 %, así que no puede quedar por encima de uno que cumple todo. El valor está en `MATCH_WEIGHTS` y se puede ajustar con el PO. Si se cambia, hay que subir la versión del algoritmo.

## Medida de similitud elegida: stemming liviano + diccionario

Se eligió **stemming liviano para español e inglés** en vez de TF-IDF con coseno:

- **Es explicable al PO, regla por regla:** «redes» y «red» comparten raíz. Con TF-IDF, el porcentaje depende de la frecuencia de cada palabra en todo el catálogo y es difícil justificarlo para un caso concreto.
- **Es determinista y no necesita corpus:** el catálogo tiene menos de 100 términos, muy poco para que los pesos IDF sean estables.
- **No rompe la extracción actual:** el diccionario y sus alias resuelven primero los sinónimos (JS, k8s, IA). El stemming solo actúa sobre lo que el diccionario no conoce.

Reglas del stemmer, en orden:

1. Quita la `s` final del plural, salvo en `ss`.
2. Quita `-ing` y `-ed` en inglés.
3. Quita la vocal final de género (`a`, `e` u `o`).

No toca tokens de menos de 4 letras ni tokens con símbolos (`sql`, `aws`, `c++`, `c#`, `node.js`), para no juntar tecnologías distintas: «java» y «javascript» siguen siendo distintas.

## Regresión del anexo B

Siguen funcionando las palabras compuestas («desarrollo de software», «api rest»), los alias en ambos lados y la regla de que Node.js no es JavaScript. Hay casos en el conjunto de calidad.

## Conjunto de calidad y métrica mínima

`apps/api/test/job-posting-similarity-quality.spec.ts` usa el diccionario real del seed, el mismo de los perfiles P1-P13 de `test/affinity-profiles.spec.ts`. Trae 13 casos (Q1-Q13), con 25 requisitos y su resultado esperado.

**Métrica mínima declarada: el 90 % de los requisitos debe clasificarse bien** (`MIN_QUALITY_ACCURACY`). Hoy acierta el 100 %.

## Versionado

`ALGORITHM_VERSION = 'job-affinity-hu11-v1'`. Cambiar reglas, pesos o el stemmer obliga a subirla. La HU-10 debe guardarla junto al porcentaje (por ejemplo, combinada con la versión del diccionario, como `radar/domain/policies/input-hash.ts`) para recalcular los porcentajes hechos con versiones viejas.

## Integración con la HU-10 (hecha)

- `JobPostingAffinityExtractorPort.loadExtractor()` entrega el `KeywordExtractorService` ya cargado; el adaptador traduce un diccionario caído a `NLP_DICTIONARY_UNAVAILABLE` (503).
- `CalculateJobPostingAffinity` arma el perfil una vez (`buildProfileIndex`, campo por campo) y lo compara con cada vacante con `compareRequirementsWithProfile`.
- El contrato de `packages/shared-types` no cambia: `comparison[]` ya admitía `exact`, `similar` y `not-found`, y el porcentaje sigue siendo entero.

## Pendiente para otras HU

- **HU-12 (recálculo):** guardar `ALGORITHM_VERSION` junto a `porcentaje_match` para recalcular lo calculado con versiones viejas.
- **HU-15 (comparación postulante-vacante):** usar `comparison[]` tal cual; `similar` ya trae `matchedSkill`.
