# Auditoría de mocks y datos simulados — UMSSPIRA

Fecha: 2026-11-14
Rama auditada: `epic3`
Commit base: `b675ab2ffe533a8fa38b2b0f5cca3b7e9ff651114`
`origin/dev`: `c3857e5cab54d2f8d5ca67d6846bfdffb5a6535b` (la rama `epic3` está 99 commits adelante)

## 1. Objetivo y método

Se inventariaron los datos simulados alcanzables desde el frontend web, se contrastaron con los contratos reales de la API y con el respaldo oficial de DevOps, y se eliminaron los fallbacks de producción en los flujos operativos.

Método:

1. Búsqueda de importaciones de `shared/mocks`, objetos hardcodeados, banderas `NEXT_PUBLIC_*`, respuestas de ejemplo, simulaciones y fallbacks silenciosos.
2. Lectura de controladores, permisos y middleware de la API y del frontend.
3. Contraste con el respaldo `umsspira-esquema-y-datos.sql`, inspeccionado solo localmente. No se copiaron filas, datos personales, credenciales ni tokens al repositorio.
4. Pruebas automatizadas focalizadas por flujo.

Conteos relevantes del respaldo, usados solo como evidencia de cobertura:

| Tabla | Filas |
|---|---:|
| `calculo_radar` | 0 |
| `afinidad_radar` | 0 |
| `perfil_area` | 1 |
| `postulacion` | 0 |
| `titulado` | 40 |
| `vacante` | 1 |
| `area` | 10 |
| `palabra_clave` | 66 |
| `palabra_clave_area` | 70 |
| `alias_palabra_clave` | 89 |
| `requerimiento_habilidad` | 1 |

El respaldo no contiene cálculos de Radar ni postulaciones, por lo que no permite validar valores reales de afinidad ni un flujo completo de candidatos. La verificación se apoyó en los contratos y en pruebas.

## 2. Inventario priorizado

| Prioridad | Flujo / ruta | Componente o servicio | Origen del dato simulado | ¿Dato real disponible? | Épica / commit | Estado tras la auditoría | Acción pendiente |
|---|---|---|---|---|---|---|---|
| P0 | `/afinidad/egresado` — Mi afinidad del titulado | `shared/services/affinity-service.ts`, `graduate-affinity-view.tsx` | `affinity-vector-mock.json`, `affinity-snapshots-mock.json`, `affinity-config-mock.json`; bandera `NEXT_PUBLIC_USE_AFFINITY_MOCK` | Sí: `GET /api/v1/radar`, `POST /api/v1/radar/recalculate`, `GET /api/v1/radar/certifications/:area` | Épica 3 / `b675ab2f` | **Corregido.** El mock exige `NODE_ENV=test`; desarrollo y producción siempre usan la API. | Ninguna para el fallback. Validar con sesión real y datos de producción. |
| P0 | Controles de simulación de afinidad | `graduate-affinity-view.tsx`; `NEXT_PUBLIC_ENABLE_SIMULATION_CONTROLS` | Controles "Simular Actualización" y "Simular Timeout" | No aplica: son utilidades de demo | Épica 3 / `b675ab2f` | **Corregido.** Se ignoran en builds de producción; la prop explícita `enableSimulationControls` sigue sirviendo para demos. | Ninguna. |
| P0 | Aviso de demostración de afinidad | `graduate-affinity-view.tsx` | Aviso inferido de la bandera de mock | No aplica | Épica 3 / `b675ab2f` | **Corregido.** Solo aparece con `showDemoNotice` explícito. | Ninguna. |
| P1 | `/afinidad/reclutador` — comparación de candidatos | `recruiter-candidates-view.tsx`, `nlp-search.tsx`, `candidates-mock.json` | Fixture de 8 candidatos con áreas, evidencia y afinidad | **No.** No existe endpoint de candidatos con afinidad para empresa; el rol `empresa` no tiene `radar:self:read` ni `nlp:extract`. | Épica 4 en coordinación con Épica 3 / `b675ab2f` | **Corregido en presentación.** Por defecto muestra un estado de dependencia; la demo solo se abre con "Ver demostración con datos de ejemplo" y lleva aviso ámbar. `NlpSearch` ya no importa mocks: recibe `searchCandidates` desde la pantalla. | Definir y construir el contrato de candidatos de Épica 4; decidir si la ruta se mueve de módulo. |
| P1 | `/radar-preview` | `app/radar-preview/page.tsx` | Importación directa de `affinity-vector-mock.json` | No aplica: es una demo visual | Épica 3 / `b675ab2f` | **Demo explícita.** Tiene aviso de datos de ejemplo, pero sigue siendo pública. | Producto/DevOps deben confirmar si permanece en el despliegue operativo o se restringe a desarrollo. |
| P2 | Listado/detalle de postulantes de empresa | `shared/services/applicants.ts`; bandera `NEXT_PUBLIC_USE_MOCK` (activa por defecto) | Fixtures internos con escenarios `ok`, `empty`, `error` | **Fuera de alcance.** Ya se trabaja en el contrato #763. | Empresa / Épica 5 según comentario del archivo | **Excluido por instrucción.** No se modificó. | Seguir el trabajo existente del contrato #763. |
| P2 | Fixture muerto de postulación | `modules/applications/frontend/components/application-detail.tsx` | `MOCK_APPLICATION` con datos personales ficticios | Sí, el componente opera con datos recibidos por props | Módulo de aplicaciones (equipo no confirmado) | **Eliminado.** No tenía consumidores. | Ninguna. |
| P2 | Fixture muerto de titulados para reportes | `modules/reports/data/graduates.mock.ts` | `MOCK_GRADUATES_LIST` con 90 registros ficticios | Sí: `reports.service.ts` usa `GET /api/v1/reports/graduates` | Módulo de reportes (equipo no confirmado) | **Eliminado.** El archivo conserva solo los tipos `Graduate` y `GraduateStatus`. | Renombrar el archivo a `graduates.types.ts` en un cambio aparte. |
| Informativo | `NEXT_PUBLIC_DEMO_MODE` | `shared/services/api-client.ts`, `company-dropdown.tsx` | Cambia el envío de token cuando no hay sesión válida | No aplica | Transversal | **No es un mock de datos.** No se modificó. | Documentar su uso si se mantiene. |

## 3. Contraste con los contratos reales

### Afinidad del titulado

- `GET /api/v1/radar` exige `radar:self:read` y scope de titulado. Devuelve seis áreas en orden fijo, `previousAffinity` numérico o `null`, `weighting` de 1 a 5 o `null`, `topKeywords` como arreglo y `hasPendingChanges`.
- `POST /api/v1/radar/recalculate` exige `radar:self:write` y agrega `recalculated`.
- `GET /api/v1/radar/certifications/:area` exige `radar:self:read` y valida el área contra `AFFINITY_AREAS`.
- `ROLE_PERMISSIONS` de la API asigna `radar:self:read`, `radar:self:write` y `nlp:extract` solo a `titulado`.
- `administrador` tiene `nlp:extract`, pero no permisos de Radar.
- `empresa` no tiene `nlp:extract` ni permisos de Radar.

El servicio de afinidad ya consumía estos endpoints. El problema era que la bandera pública podía sustituirlos por JSON en desarrollo. La corrección mantiene el mock únicamente para pruebas automatizadas.

### Candidatos del reclutador

- No existe un endpoint de candidatos con afinidad en la API.
- No existe un endpoint de candidatos para reclutador.
- El proxy permite los módulos `radar` y `nlp`, pero no `affinity`.
- `/afinidad/reclutador` es accesible para `empresa` y `administrador` por middleware, aunque la API no puede servir el dato principal. Esa inconsistencia es la razón del estado de dependencia.
- `POST /api/v1/nlp/extract` existe, pero no hay contrato de candidatos que justifique conectarlo desde `NlpSearch`.

### Endpoint eliminado

`saveAffinityConfig` y `AFFINITY_CONFIG_ENDPOINT` se eliminaron porque:

- `POST /affinity/config` no existe en la API.
- El proxy no incluye el módulo `affinity`.
- La función no se invocaba desde la interfaz.

## 4. Cambios aplicados

| Archivo | Cambio |
|---|---|
| `apps/web/src/shared/services/affinity-service.ts` | Mock limitado a `NODE_ENV=test`; eliminados `saveAffinityConfig`, `AFFINITY_CONFIG_ENDPOINT` y el import sin uso de `apiClient`. |
| `apps/web/src/shared/components/graduate-affinity-view.tsx` | Controles de simulación ignorados en producción; aviso de demo solo por prop explícita. |
| `apps/web/src/shared/components/recruiter-candidates-view.tsx` | Estado de dependencia por defecto; demo explícita; aviso de datos de ejemplo; búsqueda inyectada. |
| `apps/web/src/shared/components/nlp-search.tsx` | Sin importación de mocks; recibe `searchCandidates`. |
| `apps/web/src/modules/applications/frontend/components/application-detail.tsx` | Eliminado `MOCK_APPLICATION` sin consumidores. |
| `apps/web/src/modules/reports/data/graduates.mock.ts` | Eliminado `MOCK_GRADUATES_LIST`; quedan solo los tipos. |
| `apps/web/.env.example` | Documentado que el mock es solo para pruebas y que la simulación se ignora en producción. |
| `apps/web/src/shared/services/affinity-service.test.ts` | Prueba de producción sin mock; retiradas las pruebas de configuración inexistente. |
| `apps/web/src/shared/components/graduate-affinity-view.test.tsx` | Prueba de controles de simulación ignorados en producción. |
| `apps/web/src/shared/components/nlp-search.test.tsx` | Pruebas de búsqueda delegada y de ausencia de búsqueda sin callback. |
| `apps/web/src/shared/components/recruiter-candidates-view.test.tsx` | Nuevo: estado de dependencia, demo explícita, aviso y ordenamiento. |
| `docs/epic3/RutasFrontend.md` | Actualizado al estado posterior a la auditoría. |

## 5. Verificación ejecutada

Comandos:

```text
pnpm --filter web test -- --runTestsByPath \
  src/shared/services/affinity-service.test.ts \
  src/shared/components/graduate-affinity-view.test.tsx \
  src/shared/components/affinity-customizer.test.tsx \
  src/shared/components/recruiter-candidates-view.test.tsx \
  src/shared/components/nlp-search.test.tsx

pnpm --filter web exec tsc --noEmit
pnpm --filter web lint
```

Resultados:

- 5 suites focalizadas, 76 pruebas aprobadas.
- Suite web completa: 198 suites aprobadas y 1 suite con fallos preexistentes (`events/catalog/[id]/detail.test.tsx`, 11 pruebas). Esa suite no fue tocada por estos cambios y falla por el estado de inscripción del evento, no por mocks.
- TypeScript sin errores.
- ESLint sin errores; solo el warning preexistente `react-hooks/exhaustive-deps` en `survey-container.tsx`.

Casos cubiertos:

- Bandera de mock ausente: se consulta el endpoint real.
- Bandera de mock activa con `NODE_ENV=production`: se ignora y se consulta la API.
- Fallo de la API: se propaga un error; no se devuelve el mock silenciosamente.
- Controles de simulación activos en producción: no se renderizan.
- `/afinidad/reclutador` sin demo: no muestra candidatos ni el aviso de demo.
- Demo explícita: muestra aviso y datos de ejemplo.
- Alcance por rol: verificado en `ROLE_PERMISSIONS` y en las pruebas de acceso a rutas.

## 6. Dependencias pendientes y responsables

| Dependencia | Impacto | Responsable | Estado |
|---|---|---|---|
| Contrato de candidatos con afinidad para empresa | Bloquea el flujo operativo de `/afinidad/reclutador` | Épica 4, en coordinación con Épica 3 | Pendiente de definición |
| Decisión sobre `/radar-preview` en producción | Puede exponer una demo pública en el despliegue operativo | Producto y DevOps | Pendiente de confirmación |
| Modo administrativo de afinidad | El middleware permite entrar, pero la API responde 403 por permisos y scope | Épica 3, DevOps/BD | Pendiente de decisión |
| Datos reales de Radar en el respaldo | El respaldo tiene 0 filas en `calculo_radar` y `afinidad_radar`; no permite validar valores | DevOps/BD | Pendiente de datos o entorno de prueba |
| Publicación de PRs | No hay `gh` CLI ni flujo autenticado de GitHub disponible | Equipo de desarrollo | Bloqueado en este entorno |

## 7. Plan de entrega en cambios pequeños

Los cambios quedaron separados por flujo para facilitar PRs independientes:

1. **Afinidad segura:** `affinity-service`, `graduate-affinity-view`, pruebas y `.env.example`.
2. **Reclutador sin mock operativo:** `recruiter-candidates-view`, `nlp-search` y pruebas.
3. **Limpieza de fixtures muertos:** `application-detail` y `graduates.mock`.
4. **Documentación:** `RutasFrontend.md` y este informe.

Cada cambio debe publicarse contra `epic3` (o contra `dev` si el equipo decide integrar directamente), con los comandos de la sección 5 como evidencia. Las URLs de PR quedan pendientes porque este entorno no tiene autenticación de GitHub.

Casos que deben validarse en despliegue:

- Titulado real en `/afinidad/egresado` sin `NEXT_PUBLIC_USE_AFFINITY_MOCK`.
- Fallo controlado de la API de Radar sin datos de ejemplo visibles.
- Empresa y administrador en `/afinidad/reclutador` viendo el estado de dependencia.
- Confirmación de que `/radar-preview` no aparece en el menú operativo ni se indexa si Producto decide retirarlo.
