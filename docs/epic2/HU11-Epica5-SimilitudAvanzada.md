# HU-11 de la Épica 5 · Similitud avanzada del motor de afinidad

Historia heredada por el Equipo 7 (Épica 2). El grupo de la Épica 5 se disolvió el 17 de noviembre de 2026 y sus historias se repartieron a otros equipos. En el plan de la Épica 5 (`docs/epic5/historias-epica-5.md`) esta historia figura como HU-11, de 5 puntos, asignada a la Épica 2 y dependiente de la HU-10.

Corte: rama `epic2` al 24/11/2026, comparada contra `dev`. Ya está fusionada en `dev`.

## 1. Estado

| Dato | Valor |
|---|---|
| Historia | HU-11 · Similitud avanzada del motor |
| Puntos | 5 |
| Responsable | Eddy Andrewzzyx Morales |
| Depende de | HU-10 (servicio de matching en el backend) |
| Estado en `dev` | Fusionada |
| PR | Sin PR propio: su rama se integró en otra y esa rama hizo el PR de integración |
| Endpoints o migraciones nuevos | Ninguno. El motor es el mismo de `POST /api/v1/affinity/batch` |

## 2. Qué se pedía

Requisitos de la vacante procesados con el mismo NLP que el perfil, pesos para la coincidencia exacta y la parcial, una medida de similitud documentada, un conjunto de pruebas con métrica mínima y versionado del algoritmo.

## 3. Qué se implementó

Cada requisito de la vacante pasa por el mismo procesamiento que el perfil: normalización del texto, diccionario con alias y la raíz de cada palabra (stemmer liviano en español e inglés). Así «JS» cuenta como JavaScript, «Postgres» como PostgreSQL y «Bases de datos relacionales» coincide con «base de datos relacional».

| Resultado | Peso | Cuándo | Ejemplo |
|---|---|---|---|
| Exacta | 100 % | Todas las palabras clave del requisito están en el perfil | «JS» y «JavaScript» |
| Similar | 50 % | Solo una parte coincide o una contiene a la otra | «React Native» con «React», «Spring Boot» con «Spring» |
| No encontrada | 0 % | Ninguna de las anteriores | «Java» con «JavaScript» |

- **Porcentaje.** Suma de pesos entre el número de requisitos, por 100. El motor lo calcula con 2 decimales y el contrato lo entrega redondeado a entero.
- **Palabras genéricas.** «Experiencia», «conocimientos», «manejo», «dominio», «desarrollo», «programación», «nivel», «años» y otras similares no cuentan como tecnología. Sirven para no inflar el porcentaje.
- **Java no es JavaScript.** Son tecnologías distintas, y Node.js tampoco es JavaScript. El stemmer no toca palabras de menos de 4 letras ni las que llevan símbolos (`sql`, `aws`, `c++`, `c#`, `node.js`).
- **Vacante sin requisitos.** El motor no inventa un porcentaje: responde el estado `no-requirements`, sin porcentaje.

### Por qué la coincidencia parcial vale 50 %

Una coincidencia parcial muestra conocimiento relacionado, pero no confirma el requisito. Con 50 %, dos parciales equivalen a una exacta, y un perfil que solo tiene parciales nunca pasa del 50 %, así que no queda por encima de uno que cumple todo. El valor está en `MATCH_WEIGHTS` y se puede ajustar con el PO. Si se cambia, hay que subir la versión del algoritmo.

### Por qué stemmer y no TF-IDF

- Se explica regla por regla: «redes» y «red» comparten raíz.
- Es determinista y no necesita un corpus: el catálogo tiene menos de 100 términos, muy poco para pesos estables.
- No rompe la extracción actual: el diccionario y sus alias resuelven primero los sinónimos y el stemmer solo actúa sobre lo que el diccionario no conoce.

## 4. Calidad y versionado

- **Conjunto de calidad:** `apps/api/test/job-posting-similarity-quality.spec.ts`. Usa el diccionario real del seed y trae 13 casos con 25 requisitos y su resultado esperado.
- **Métrica mínima declarada:** el 90 % de los requisitos debe clasificarse bien (`MIN_QUALITY_ACCURACY`). Con el conjunto actual acierta el 100 %. Es un conjunto propio, no vacantes reales.
- **Versión del algoritmo:** `job-affinity-hu11-v2`. Cambiar reglas, pesos o el stemmer obliga a subirla, para recalcular los porcentajes hechos con versiones viejas.

## 5. Dónde está en el código

| Archivo | Contenido |
|---|---|
| `apps/api/src/modules/job-postings/domain/policies/requirement-similarity.ts` | Reglas de similitud, pesos, palabras genéricas y versión del algoritmo |
| `apps/api/src/modules/nlp/domain/policies/light-stemmer.ts` | Stemmer liviano en español e inglés |
| `apps/api/test/job-posting-similarity-quality.spec.ts` | Conjunto de calidad con la métrica mínima |
| `apps/api/docs/endpoints/epic5/HU11-similitud-avanzada.md` | Explicación técnica completa de la historia |
| `apps/api/docs/endpoints/epic5/nota-hu11-po-equivalencias.md` | Nota para el PO sobre el retiro de la equivalencia provisional Java/JavaScript (20/11/2026) |

## 6. Dónde se ve en la web

| Ruta | Qué muestra |
|---|---|
| `/ayuda/bolsa-de-trabajo?tab=afinidad` | Ayuda «Cómo funciona la afinidad» |
| `/job-postings` y `/job-postings/[id]` | Porcentaje y detalle de cada requisito de la vacante |
| `/my-applications/oferta/[id]` | Afinidad en la postulación del titulado |
| `/empresa/mis-vacantes/[id]/candidatos/[applicantId]` | Desglose para la empresa, con la ventana «Cómo se calcula» |

En pantalla los resultados se llaman igual en todas partes: **Exacta**, **Similar** y **No encontrada**.

## 7. Lo que no se esperaba

1. **La historia llegó por la disolución de otro grupo.** No estaba en el reparto inicial del Sprint 3 de la Épica 2; se asignó cuando el grupo de la Épica 5 se disolvió, el 17 de noviembre.
2. **Sin PR propio.** La rama se integró en otra y esa rama hizo el PR. Por eso no hay un número de PR de la historia.
3. **Los porcentajes bajaron en algunos perfiles.** Al retirar la regla provisional que daba «Java» por «JavaScript», los perfiles que tenían Java ven menos afinidad frente a vacantes de JavaScript. Está explicado en la nota para el PO.

## 8. Pendiente

- Guardar la versión del algoritmo junto al porcentaje para recalcular lo calculado con versiones viejas (queda para la HU-12 de la Épica 5).
- Usar `comparison[]` tal cual en la comparación postulante-vacante (HU-15 de la Épica 5).
- Actualizar la fila de la HU-11 en `docs/epic5/historias-epica-5.md`, que sigue diciendo «Sin PR».
