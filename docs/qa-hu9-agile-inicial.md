# HU-9 CA-05: investigación del "Agile inicial"

Conclusión (a): el aporte de Agile proviene de `perfil_area.id = 99000000-0000-4000-8000-000000000106`, campo `descripcion_profesional`, texto "Metodologías ágiles y gestión del alcance, tiempo y costo."; un único `agile` con peso 4 produce 4 puntos = 10 % en Gestión TI. En la rama revisada ese aporte ya no se sirve porque la regla de descripción vigente (T9.4, ya incluida en la rama padre) selecciona la fila `...105`.

## Contexto

- Fecha de revisión: 2026-11-11.
- Commit base revisado: `7738bb5b` (`feat/G3-HU9-afinidadReal`). Rama de trabajo: `feat/G3-HU9-t95investigarAgileInicial`.
- Entorno: PostgreSQL de Supabase configurado en `apps/api/.env`; Node 24.21.0; pnpm 10. Las consultas se ejecutaron en una transacción PostgreSQL `READ ONLY`.
- Cuenta revisada: "titulado A", UUID `99000000-0000-4000-8000-000000000013`. No se imprimen nombre ni correo. Es la única cuenta con un cálculo persistido que contiene `agile` en `palabras_clave_top`.
- Diccionario: `palabra_clave.id = 8655f3ac-5461-40d3-bc98-8c576b784003`, término normalizado `agile`, alias `agil`, `agiles`, `metodologias agiles`; área `Gestión TI` (`60000000-0000-4000-8000-000000000010`) con peso 4. Por fórmula, `4 / 40 * 100 = 10 %`.

## Evidencia

Consultas de solo lectura ejecutadas (sin credenciales):

- `select ... from palabra_clave pc join alias_palabra_clave ... join palabra_clave_area ... where pc.termino_normalizado = 'agile'`.
- Búsqueda con `unaccent` sobre `perfil_area.descripcion_profesional`, `formacion_academica.titulo/institucion`, `experiencia_laboral.cargo/empresa` y `certificacion.nombre/entidad_emisora` para el titulado A.
- Lectura de todas las filas de `perfil_area` y del último `calculo_radar` con sus `afinidad_radar`.
- Reproducción con `KeywordExtractorService` y `calculateAreaAffinity` productivos y los pesos leídos de `palabra_clave_area`.

Coincidencias encontradas:

| Tabla | id de fila | Campo | Fragmento | Coincidencia |
| --- | --- | --- | --- | --- |
| `perfil_area` | `...0106` | `descripcion_profesional` | Metodologías ágiles y gestión del alcance, tiempo y costo. | `agile` x 1 |
| `perfil_area` | `...0105` | `descripcion_profesional` | ingeniero en sistemas | ninguna |

No hay coincidencias en formación, experiencia ni certificaciones del titulado A: esas tablas tienen cero filas para esa cuenta.

Comparación cálculo reproducido vs. cálculo servido (tolerancia 0,01):

| Escenario | Gestión TI | Hash de entrada | Coincide con lo servido |
| --- | --- | --- | --- |
| Todas las filas de `perfil_area` | 4 puntos / 10,00 % | `680e04a0...` | No |
| Solo fila vigente `...0105` | 0 puntos / 0,00 % | `5f26a18d...` | Sí |
| Último cálculo servido `132b0216-b950-4ae0-a193-9806e40b919a` | 0 puntos / 0,00 % | `5f26a18d...` | Referencia |

El último cálculo servido es `VACIO`, con las seis áreas en cero y el mismo hash que la fila vigente. El cálculo histórico `57b4649c-ccf3-4598-abf3-3d9388fef648` (2026-11-11T14:12:32Z) sí contiene `agile` con 4 puntos / 10 % dentro de Gestión TI (19 puntos / 47,50 %), junto con `gestion de ti`, `itil` y `pmp`. Su hash `fe021ade...` no coincide con los textos actuales, por lo que el cálculo histórico completo no es reproducible: la cuenta tenía otros campos que ya no existen. El componente Agile sí se reproduce exactamente al incluir la fila `...0106`.

## Hipótesis de múltiples filas de `perfil_area`

Confirmada como mecanismo del 10 % histórico. El titulado A tiene dos filas:

- `...0105`, "ingeniero en sistemas", `fecha_creacion` 2026-11-04, `fecha_actualizacion` 2026-11-11. Es la fila vigente con el orden actual (`fecha_creacion asc`, `id asc`).
- `...0106`, "Metodologías ágiles y gestión del alcance, tiempo y costo.", `fecha_creacion` 2026-11-04, `fecha_actualizacion` 2026-11-04. No es la vigente.

Leer todas las filas suma `agile` y produce 10 %; leer solo la vigente produce 0 %. La rama padre ya incluye la regla de descripción vigente de T9.4 en `8809d1fe` (`fix(api): leer solo la descripción vigente en radar`), por eso el cálculo actual ya no reproduce el 10 %. Esta tarea no modificó esa regla.

## Hallazgos secundarios y recomendaciones

- La certificación "ICAgile Certified Professional" de otra cuenta no genera un falso positivo: el normalizador produce el token `icagile`, que no coincide con `agile`. Verificado con el extractor productivo.
- Ambas filas de `perfil_area` comparten `fecha_creacion` con precisión de día; el desempate por `id` decide la vigente. Conviene que T9.4 revise si el criterio debe usar `fecha_actualizacion` o un timestamp, pero no se implementa aquí.
- El desajuste de hash del cálculo histórico indica cambios de perfil posteriores al cálculo, no un defecto del código actual.
- Recomendación operativa: revisar y depurar filas duplicadas de `perfil_area` del titulado A con autorización de BD; no se ejecutó ninguna escritura.

## Revalidación por QA (HU-9 CA-05)

1. `git checkout feat/G3-HU9-t95investigarAgileInicial`.
2. Ejecutar el rastreador de solo lectura:
   `TITULADO_ID=99000000-0000-4000-8000-000000000013 KEYWORD=agile pnpm --filter api exec tsx scripts/trace-keyword-origin.ts`.
   Debe listar la fila `...0106` y el campo `descripcion_profesional`; con todas las filas debe dar 10 % y con la vigente 0 %.
3. Ejecutar `pnpm --filter api exec jest test/agile-initial-characterization.spec.ts --runInBand`.
4. Contrato HTTP: `radar-top-keywords.e2e.spec.ts` cubre 200 para titulado autorizado, 401 sin token y 403 sin permiso; nunca 404. No se ejecutaron las colecciones Postman/Bruno porque requieren una API levantada y una sesión, lo que implicaría escrituras de autenticación.

## Pruebas y resultados

- Pruebas nuevas: 8 de 8 pasan en `apps/api/test/agile-initial-characterization.spec.ts` (Agile por fuente, perfil sin Agile, dos filas de `perfil_area`, lector productivo y certificación AWS con Cloud 35 %).
- Suite API completa: 114 suites y 978 pruebas, todas pasan.
- Suite web completa: 15 fallos y 1356 pruebas correctas en 4 suites. En la rama padre se reprodujeron 17 fallos y 1354 correctas en 6 suites; los fallos son preexistentes y variables por orden/concurrencia (`detail.test.tsx` y `registration-form.test.tsx` fallan en ambas). No los introduce esta tarea.
- Lint: API sin errores; web sin errores (una advertencia preexistente de `exhaustive-deps`).
- Build: API y web compilan.
- E2E: API 12 suites / 190 pruebas; web 2 suites / 8 pruebas. No se localizó en el repositorio un conjunto rotulado como "21 pruebas E2E"; se ejecutaron todas las suites E2E disponibles.

## Perfiles de referencia P1 a P13

No se encontraron P1 a P13 en el repositorio ni en el historial de las ramas revisadas. El único conjunto de 13 perfiles sintéticos es el de `apps/api/test/affinity-profiles.spec.ts`, pero valida el calculador histórico, no el productivo, por lo que no se usó como regresión. La referencia indicada para P13 se cubrió parcialmente con la prueba de la certificación AWS (Cloud/DevOps 35 % y resto en cero). Si P1 a P13 existen en otro documento o rama, se necesitan esos datos para completar la regresión.

## Alcance respetado

No se modificó la fórmula, `TOP_FREQUENCY`, `MAX_POSSIBLE_SCORE`, los pesos ni el diccionario. No se implementó T9.4 ni cambios de HU-10, HU-11 o HU-13. No se agregaron endpoints ni se modificaron colecciones Postman/Bruno.
