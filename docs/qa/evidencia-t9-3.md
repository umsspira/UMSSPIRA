# Evidencia de QA - T9.3: revalidación de /auth/me, GET /radar y POST /radar/recalculate

## Identificación

| Campo | Valor |
| --- | --- |
| Tarea | T9.3 (QA, Épica 3, HU-9) |
| Ejecutor | Nayra |
| Fecha y hora | 2026-11-14 09:28 -04 |
| Rama de trabajo | `feat/G3-HU9-t93-revalidacion-auth-radar` (creada desde `epic3` en `22d6b6e4`) |
| URL base probada | `https://umsspira-api-py5b.onrender.com` |
| SHA desplegado | [POR CONFIRMAR: DevOps / T9.1] |
| SHA de `origin/dev` solo como referencia | `c3857e5cab54d2f8d5ca67d6846bfdffb5a6535b` (no es el SHA desplegado) |
| Entorno | Candidato designado por el equipo. Render despliega `dev` con `APP_ENV=dev` y datos ficticios de integración. No consta como el entorno de QA registrado por T9.1: [POR CONFIRMAR: DevOps] |

## Condiciones de ejecución

1. `GET /health` respondió `200` con `{"status":"ok","database":"ok"}`.
2. Las tres cuentas de demostración iniciaron sesión con `200`. Las credenciales se pasaron como variables de entorno del proceso; no se escribieron en archivos, commits, logs ni en este documento.
3. La configuración observada corresponde a integración (`APP_ENV=dev` en `render.yaml`) y las cuentas usadas son ficticias del seed. No se observaron indicios de datos reales de producción.

La ejecución se hizo en una sola pasada secuencial. No se repitieron peticiones ni se hicieron pruebas de carga. Solo se registraron códigos HTTP y nombres de permisos; nunca tokens ni claves.

## Matriz de las nueve comprobaciones

| # | Comprobación | Cuenta | Esperado | Obtenido | Resultado | CA citado |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `GET /api/v1/auth/me` | titulado | `200` e incluye `nlp:extract`, `radar:self:read`, `radar:self:write` | `200`; los tres permisos presentes; rol `titulado` | Aprobado | CA-HU9-02 |
| 2 | `GET /api/v1/auth/me` | empresa | `200` y carece de los tres permisos | `200`; los tres permisos ausentes; rol `empresa` | Aprobado | CA-HU9-02 |
| 3 | `GET /api/v1/auth/me` | administrador | [POR CONFIRMAR: PO/BE]; ningún CA lo define | `200`; `nlp:extract` presente; `radar:self:read` y `radar:self:write` ausentes; rol `administrador` | Registrado, no se califica | [POR CONFIRMAR] |
| 4 | `GET /api/v1/radar` | titulado | `200` | `200` | Aprobado | CA-HU9-03 |
| 5 | `GET /api/v1/radar` | empresa (sin `radar:self:read`) | `403` | `403` | Aprobado | CA-HU9-03 |
| 6 | `GET /api/v1/radar` | sin token | `401` | `401` | Aprobado | CA-HU9-03 |
| 7 | `POST /api/v1/radar/recalculate` | titulado | `200` | `200` | Aprobado | CA-HU9-04 |
| 8 | `POST /api/v1/radar/recalculate` | empresa (sin `radar:self:write`) | `403` | `403` | Aprobado | CA-HU9-04 |
| 9 | `POST /api/v1/radar/recalculate` | sin token | `401` | `401` | Aprobado | CA-HU9-04 |

Ninguna de las nueve respuestas fue `404`. El caso 7 persistió un cálculo de radar en la cuenta ficticia del titulado, como estaba previsto.

## CA-HU9-05: recálculo sin diccionario

No se ejecutó contra el despliegue para no alterar la disponibilidad del diccionario. Queda cubierto por la prueba automatizada local `apps/api/test/hu9-t9-3-revalidation.e2e.spec.ts:138`, que fuerza un diccionario no disponible y verifica `503`, código `NLP_DICTIONARY_UNAVAILABLE` y cero cálculos persistidos. Este CA es relacionado y no forma parte de la exigencia de T9.3.

## Comportamiento observado del administrador

El código asigna `nlp:extract` al administrador y no le asigna `radar:self:read` ni `radar:self:write` (`apps/api/src/modules/user/domain/policies/access.policy.ts:4-14`). El despliegue confirmó ese comportamiento. Ningún criterio de T9.3 define el resultado esperado para esta cuenta; queda [POR CONFIRMAR con PO/BE] y no se califica como aprobado ni como falla.

## Pruebas locales agregadas

`apps/api/test/hu9-t9-3-revalidation.e2e.spec.ts` cubre con adaptadores en memoria:

- `/auth/me` de titulado, empresa y administrador.
- `GET /radar` y `POST /radar/recalculate` con titulado (`200`), empresa y administrador (`403`) y sin token (`401`).
- La aserción explícita de que ninguna ruta responde `404`.
- `503` cuando el diccionario no carga, sin persistir cálculos.

La prueba usa el `NlpKeywordExtractorAdapter` real y el `KeywordDictionaryLoader` exportado por `NlpModule`, de modo que también cubre el cableado que produjo el `404` histórico de BLQ-HU8-01.

## Colecciones de API

- Bruno: carpeta `bruno/Revalidacion-T9.3/` con tres inicios de sesión que guardan los tokens en tiempo de ejecución y las nueve comprobaciones. Las credenciales y los tokens se declaran como secretos y no se guardan en el repositorio.
- Postman: carpeta `Revalidacion-T9.3` agregada a `postman/UMSSPIRA.json`, con la misma secuencia y variables de colección vacías.

## Verificaciones locales

| Comando | Resultado |
| --- | --- |
| `pnpm install --frozen-lockfile` | Correcto |
| `pnpm --filter api prisma:generate` | Correcto (sin descarga adicional) |
| `pnpm lint` | Correcto; solo una advertencia previa de `react-hooks/exhaustive-deps` en web |
| `pnpm --filter api typecheck` | Correcto |
| `pnpm --filter web exec tsc --noEmit` | Correcto |
| `pnpm --filter api test` | Correcto: 118 suites y 997 pruebas aprobadas |
| `pnpm build` | Correcto (API y web) |
| `pnpm test` (raíz) | API correcta. Web: 11 fallos previos en `apps/web/src/app/(dashboard)/events/catalog/[id]/detail.test.tsx`, suite no tocada por T9.3; se detalla en `docs/qa/t9-3-bloqueos.md` |

Para dejar el typecheck y la suite de API en verde fue necesario adaptar dos archivos previos de la rama `epic3` que importaban módulos de la arquitectura de `dev`: `apps/api/scripts/trace-keyword-origin.ts` y `apps/api/test/agile-initial-characterization.spec.ts`. El cambio conserva su intención y se registra en un commit separado.

## Conclusión por criterio

| Criterio | Conclusión | Sustento |
| --- | --- | --- |
| CA-HU9-02 | Cumplido por observación en el despliegue candidato | Comprobaciones 1 y 2 |
| CA-HU9-03 | Cumplido por observación en el despliegue candidato | Comprobaciones 4, 5 y 6; ninguna respuesta `404` |
| CA-HU9-04 | Cumplido por observación en el despliegue candidato | Comprobaciones 7, 8 y 9; ninguna respuesta `404` |
| CA-HU9-05 | Cumplido por prueba automatizada local; no ejecutado en el despliegue | Prueba de `503` |
| Cuenta administrador | [POR CONFIRMAR con PO/BE] | Comportamiento observado, sin criterio definido |
| T9.1 / T9.2 | Trazabilidad formal pendiente | Ver `docs/qa/t9-3-bloqueos.md` |

Las comprobaciones ejecutadas no fallaron. La reserva principal es formal: no se pudo registrar el SHA desplegado ni confirmar que este entorno sea el QA de T9.1, y la vía autorizada de T9.2 sigue sin definirse aunque los permisos ya estén presentes en la base observada.
