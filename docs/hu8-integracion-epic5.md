# HU8: consultar requisitos técnicos sobre epic5

Revisión local: 12 de noviembre de 2026.
Rama: `feat/G2-HU8-consultar-requisitos-tecnicos`.
Referencia: `RESPALDO-HU8/docs/hu8-integracion-epic5.md` y archivos individuales
del respaldo. No se incorporaron directorios completos.

**Estado actual: lector canónico preparado, sin activar en producción.**
El esquema y el cliente Prisma actuales todavía no contienen
`VacanteRequisitoTecnico`. Se añadió un lector independiente del contrato
`vacante_requisito_tecnico`, probado con una fuente simulada que solo expone
`findMany`. No se editó Prisma ni se modificaron los providers compartidos:
la ruta productiva conserva su servicio HU2 anterior. Las dos fuentes no se
mezclan ni se seleccionan automáticamente. La conexión canónica real queda
pendiente de la integración coordinada de HU2/HU3.

## Integración y contrato

El detalle oficial conserva vacante, empresa, habilidades y afinidad de HU12.
Una vez cargado, monta `TechnicalRequirements`, con estado y reintento propios.
Las habilidades existentes se identifican como «Habilidades para el cálculo de
afinidad»; los registros HU2 se muestran en «Requisitos técnicos de la vacante».
No se modificó el cálculo, la tarjeta ni el porcentaje de afinidad.

La consulta utiliza `GET /api/v1/job-postings/:id/requisitos`. La respuesta es
`{ idVacante, requisitos }`, sin envoltorio `data`. Cada requisito conserva
`id`, `idVacante`, `competencia`, `nivel`, `tipo`, descripción y fecha de HU2.
El frontend reutiliza los tipos y enumeraciones de `lib/vacancies/contracts.ts`.

`JobPostingsModule` importa `VacantesModule` y la fábrica HU8 recibe el repositorio
oficial y el `RequisitosTecnicosService` exportado por HU2. Primero se consulta
`findPublishedById(id, now)`; solo si existe una vacante disponible se ejecuta
`obtenerRequisitos(posting.id)`. HU2 mantiene su repositorio Prisma y sus rutas
administrativas, con sus controles de propietario, sin cambios.

HU8 hereda la disponibilidad de HU12: estados `PUBLICADO`, `PUBLICADA`, `ACTIVA`,
`ACTIVO`, `ACTIVE`, `PUBLISHED`, con cierre nulo o estrictamente posterior al
instante consultado. No se agregó otra política de disponibilidad.

## Revisión de compatibilidad

- El prefijo oficial es `api/v1`. La ruta nueva no colisiona con `GET :id` ni con
  las rutas administrativas `vacantes/:id/requisitos`.
- HU8 utiliza los guards globales `AuthenticationGuard` y `PermissionsGuard`,
  como la lectura HU12. No declara acceso público ni agrega permisos nuevos.
  El guard acepta bearer o cookie oficial y conserva los rechazos 401/403.
- `ParseUUIDPipe` rechaza identificadores inválidos con 400. La indisponibilidad
  oficial produce 404 antes de leer HU2; la ausencia confirmada de requisitos
  produce 200 con `requisitos: []`. Los fallos se propagan al filtro existente.
- El servicio web utiliza la función `apiClient` con `authenticated: true`;
  `apiFetch` no sirve para esta respuesta porque extrae `data`. No se modificó
  ningún cliente compartido ni la autenticación global.
- El proxy existente admite `job-postings`, reenvía sesión y errores, no usa
  caché y tiene tiempo límite. No requirió cambios.
- El servicio HU8 valida contrato, UUID, asociación con la vacante, enumeraciones
  e identificadores duplicados. Distingue errores HTTP, de conexión y de contrato.
- El componente distingue carga, resultado vacío y error; permite reintentar
  fallos temporales y cancela/descarta respuestas al cambiar de vacante o desmontar.

Las seis suites HU8 aprobaron con persistencia/transporte simulados. TypeScript
global conserva errores ajenos a HU8, detallados abajo. La comprobación con el
backend y la base de datos reales sigue pendiente.

## Inventario completo de cambios locales

Los seis archivos recuperados inicialmente se compararon con el respaldo. En la
etapa canónica se actualizó únicamente el tipo de dependencia del caso de uso HU8;
los otros cinco archivos se conservaron:

| Archivo | Función |
| --- | --- |
| `apps/api/src/modules/job-postings/application/use-cases/get-technical-requirements.use-case.ts` | Disponibilidad HU12 y puerto de lectura HU8 compatible con el servicio anterior y el lector canónico. |
| `apps/api/src/modules/job-postings/http/controllers/technical-requirements.controller.ts` | Ruta HU8 y UUID. |
| `apps/api/src/modules/job-postings/job-postings.module.ts` | Importación HU2 y registro del controlador. |
| `apps/api/src/modules/job-postings/infrastructure/providers/job-postings.providers.ts` | Fábrica del caso de uso. |
| `apps/web/src/shared/services/technical-requirements.ts` | Transporte autenticado y validación de contrato. |
| `apps/web/src/app/(dashboard)/job-postings/[id]/technical-requirements.tsx` | Sección y estados HU8. |

Archivos modificados o agregados durante esta revisión:

| Archivo | Cambio |
| --- | --- |
| `apps/web/src/app/(dashboard)/job-postings/[id]/vacancy-detail-client.tsx` | Importar/montar HU8 y distinguir las habilidades HU12 mediante título y mensaje vacío. |
| `apps/api/src/modules/job-postings/application/use-cases/get-technical-requirements.use-case.spec.ts` | Cinco casos unitarios recuperados, adaptados al puerto de lectura HU8. |
| `apps/api/test/job-postings-technical-requirements.e2e.spec.ts` | Recuperar y adaptar la integración HTTP: módulo y servicio HU2 reales, guards/filtro oficiales, autenticador y persistencia simulados, sin indexación externa. |
| `apps/web/src/shared/services/technical-requirements.test.ts` | Recuperar pruebas de contrato, transporte, errores y cancelación; ampliar con 429 e integración del cliente/sesión oficiales usando `fetch` simulado. |
| `apps/web/src/app/(dashboard)/job-postings/[id]/technical-requirements.test.tsx` | Recuperar pruebas de componente y detalle; ampliar separación HU2/HU12 sin habilidades y visibilidad según el usuario. |
| `apps/api/src/modules/job-postings/application/ports/published-technical-requirements-reader.port.ts` | Puerto y formato de lectura HU8, independientes de los modelos de persistencia HU2. |
| `apps/api/src/modules/job-postings/infrastructure/readers/canonical-technical-requirements.reader.ts` | Lectura del contrato canónico y conversión al formato del frontend existente; sin registro productivo mientras falta el modelo. |
| `apps/api/src/modules/job-postings/infrastructure/readers/canonical-technical-requirements.reader.spec.ts` | 22 pruebas independientes de conversión, asociación, consulta y errores. |
| `apps/api/test/job-postings-canonical-technical-requirements.e2e.spec.ts` | 14 pruebas HTTP de la composición canónica con controlador, caso de uso, lector, guards y filtro existentes; fuente y autenticador simulados. |
| `docs/hu8-integracion-epic5.md` | Registrar decisiones, inventario, bloqueos y pasos pendientes. |

El respaldo contiene `job-postings-technical-requirements.e2e-spec.ts`, aunque su
guía cita `e2e.spec.ts`. Se recuperó con este último nombre para coincidir con el
`testMatch: ['**/*.spec.ts']` actual, sin cambiar la configuración compartida.
La integración HTTP verifica también que la lectura no invoque métodos de escritura.
Las pruebas históricas de otras HU permanecen intactas.

## Validación inicial del entorno

La primera revisión quedó bloqueada por dependencias ausentes y permisos de la
caché. Con la autorización posterior para preparar el entorno, se completó:

- Rama confirmada: `feat/G2-HU8-consultar-requisitos-tecnicos`.
- Node.js `24.16.0`, pnpm `12.8.1`; cumplen los mínimos declarados del proyecto
  y de Prisma. Instalados: Prisma/client `7.10.1`, Nest `10.4.22`, TypeScript
  `5.9.3`, Next `14.2.3`, React `18.3.1`, Jest API `29.7.0`, Jest web `30.5.2`.
- Instalación filtrada a API, web y dependencias workspace, mediante
  `--frozen-lockfile --ignore-scripts --prefer-offline`. pnpm reutilizó 1.330
  paquetes de la caché, sin descargas. También enlazó las herramientas de
  desarrollo de la raíz. No se ejecutaron scripts de instalación ni `prepare`.
  El lockfile y los manifiestos se conservaron, comprobados por SHA-256.
- `prisma generate --generator client --no-hints` terminó con código 0 y generó
  el cliente en `apps/api/src/generated/prisma`, ignorado por Git. Se utilizaron
  URLs ficticias de BD solo en el proceso, sin editar `.env`; la generación no
  requirió BD, migraciones ni seeds. La CLI necesitó acceso autorizado a su caché
  de motores fuera del proyecto; después la generación funcionó en el sandbox.
- Se invocaron Jest y TypeScript directamente con Node, evitando los scripts
  API que generan Prisma automáticamente y el wrapper `.cmd` con paréntesis.

| Comprobación | Resultado real |
| --- | --- |
| Caso de uso HU8 API | 5 pruebas aprobadas. |
| Integración HTTP HU8 API | 9 pruebas aprobadas, con módulo/servicio HU2 y guards/filtro oficiales; persistencia y autenticador simulados. |
| Servicio HU8 web | 24 pruebas aprobadas, incluido transporte oficial con `fetch` simulado. |
| Componente e integración HU8 web | 15 pruebas aprobadas. |
| Total Jest HU8 | 4 suites, 53 pruebas aprobadas, código 0. |
| TypeScript API completo, `tsconfig.check.json` | Código 1: 6 diagnósticos existentes ajenos a HU8. |
| TypeScript web completo, `tsconfig.json` | Código 1: 46 diagnósticos existentes ajenos a HU8. |

Los errores globales se dejaron intactos:

- API: `EventPassDto` y `EventPassStatus` no se exportan desde `shared-types`;
  el controlador antiguo `src/modules/job-postings/job-postings.controller.ts`
  importa `job-postings.service` y `dto/create-job-posting.dto`, que no existen;
  `test/jest.setup.ts` no resuelve `@jest/globals`. Ese controlador antiguo ya
  existe en HEAD y no está registrado en el `JobPostingsModule` actual.
- Web: exportaciones ausentes de `shared-types` para eventos, mentorías,
  autenticación, postulaciones y empresas, con errores de tipos derivados.
  Ejemplos: `EventPassDto`, `MentorDirectoryResponse`, `UserRole`,
  `ObservedApplicationDetail`, `CompanyRegistryPage`. El índice compartido tiene
  las mismas exportaciones en HEAD; no se modificó para esta HU8.
- Una comprobación adicional con la API de TypeScript, usando las opciones
  existentes y solo las raíces HU8 y sus dependencias, produjo 0 diagnósticos en
  API. En web produjo 1 diagnóstico heredado: falta `UserRole` en
  `src/modules/auth/frontend/services/auth.service.ts`, alcanzado por los servicios
  existentes del detalle. No se editaron configuraciones para estas comprobaciones.

No se encontraron errores HU8 que requirieran correcciones en esa validación.
Durante la preparación inicial del entorno solo se actualizó este documento;
la etapa canónica posterior se detalla abajo.
No se ejecutaron builds, migraciones, `db push`, seeds, escrituras en BD ni
consultas a servicios de aplicación reales. No se editaron `.env`, credenciales,
schema, migraciones, lockfiles, configuración compartida ni archivos de otras HU.
No hubo cambios de rama, pull, commit, push ni PR.

## Comandos de validación ejecutados

Las rutas con `[id]` se pasan como argumentos literales; para leer/copiar archivos
en PowerShell, usar siempre `-LiteralPath`.

Desde `apps/api`:

```powershell
node 'node_modules/jest/bin/jest.js' --runInBand --runTestsByPath src/modules/job-postings/application/use-cases/get-technical-requirements.use-case.spec.ts test/job-postings-technical-requirements.e2e.spec.ts
node 'node_modules/typescript/bin/tsc' --noEmit --incremental false -p tsconfig.check.json
```

Desde `apps/web`:

```powershell
node 'node_modules/jest/bin/jest.js' --runInBand --runTestsByPath src/shared/services/technical-requirements.test.ts 'src/app/(dashboard)/job-postings/[id]/technical-requirements.test.tsx'
node 'node_modules/typescript/bin/tsc' --noEmit --incremental false -p tsconfig.json
```

## Preparación y validación del lector canónico

Referencias locales consultadas: HU2 `13f148c9` y HU3 `c03508de`. HU3 sigue el
contrato HU2: modelo `VacanteRequisitoTecnico`, tabla
`public.vacante_requisito_tecnico` y relación por `id_vacante` con `vacante.id`.
No se consultaron referencias remotas nuevas ni servicios reales.

`CanonicalTechnicalRequirementsReader.obtenerRequisitos(uuid)` solicita una
proyección de lectura por ese UUID, ordenada por `competencia_normalizada`.
Su fuente solo expone `findMany`; no incluye métodos de escritura ni depende
del cliente Prisma generado actualmente. La futura vinculación al delegado
`prisma.vacanteRequisitoTecnico` todavía debe comprobarse con el cliente canónico.

| Campo canónico | Respuesta HU8 conservada |
| --- | --- |
| `id`, `id_vacante` | `id`, `idVacante` |
| `competencia_tecnica` | `competencia` |
| `nivel_esperado` | `BASICO` → `Básico`, `INTERMEDIO` → `Intermedio`, `AVANZADO` → `Avanzado` |
| `tipo` | `OBLIGATORIO` → `Obligatorio`, `DESEABLE` → `Deseable` |
| `descripcion` | Texto o propiedad omitida si es nula |
| `creado_en` | `fechaCreacion` en ISO |

Se rechazan niveles/tipos desconocidos, asociaciones con otra vacante,
identificadores de requisito inválidos, competencias vacías y fechas inválidas.
`EXPERTO` no se convierte en otro nivel. El tipo de vista conserva `Experto`
únicamente para seguir siendo compatible con el servicio anterior aún activo.
Un UUID inválido no consulta la fuente. Un fallo de la fuente se propaga; no
produce un arreglo vacío ni consulta la tabla antigua como alternativa.

El caso de uso conserva primero `findPublishedById(id, now)` y después llama al
puerto de lectura. La composición canónica HTTP se prueba con el controlador de
producción, pero se registra exclusivamente dentro de su suite aislada. No cambia
la ruta productiva, autenticación, permisos, disponibilidad, frontend ni afinidad.
La composición anterior con `JobPostingsModule` también continúa aprobando.

Resultados de esta etapa:

| Comprobación | Resultado real |
| --- | --- |
| Caso de uso HU8 | 5 pruebas aprobadas. |
| Integración HTTP anterior, módulo y servicio HU2 actuales | 9 pruebas aprobadas. |
| Lector canónico con fuente simulada | 22 pruebas aprobadas. |
| Composición HTTP canónica con fuente simulada | 14 pruebas aprobadas. |
| Servicio y componente web sin cambios | 39 pruebas aprobadas. |
| Total | 6 suites, 89 pruebas aprobadas; las 53 anteriores se conservan. |
| TypeScript limitado a raíces HU8 y sus dependencias | 0 diagnósticos, código 0. |
| TypeScript global API | Mismos 6 errores ajenos a HU8, código 1. |
| TypeScript global web | No repetido en esta etapa; permanece el resultado previo de 46 errores ajenos a HU8. |
| Delegado Prisma canónico y BD real | No probados: modelo ausente y sin conexión a BD. |

Para repetir las cuatro suites API desde `apps/api`:

```powershell
node 'node_modules/jest/bin/jest.js' --runInBand --runTestsByPath src/modules/job-postings/application/use-cases/get-technical-requirements.use-case.spec.ts src/modules/job-postings/infrastructure/readers/canonical-technical-requirements.reader.spec.ts test/job-postings-technical-requirements.e2e.spec.ts test/job-postings-canonical-technical-requirements.e2e.spec.ts
```

En esta etapa se modificaron solo el caso de uso HU8, sus tipos de prueba y este
documento, y se añadieron el puerto, lector y sus dos suites canónicas. No se
eliminó código funcional ni se modificaron providers, módulos, frontend, servicios
HU2, modelos, migraciones, lockfiles o configuraciones compartidas. No se usaron
consultas SQL como sustituto del modelo faltante ni conversiones de tipo para
aparentar la existencia del delegado Prisma canónico.

## Pasos pendientes

1. Integrar de forma coordinada el modelo y la migración existentes de HU2,
   conciliando los consumidores del esquema anterior. HU8 no agrega otra tabla.
   Generar el cliente canónico y comprobar que su delegado satisface el puerto
   `CanonicalTechnicalRequirementsSource`.
2. Cuando se autoricen los cambios compartidos, registrar explícitamente ese
   delegado como fuente del lector y sustituir la inyección anterior de HU8.
   Resolver la colisión del caso de uso homónimo de HU2 y la ruta administrativa
   HU3 `GET /job-postings/:id`, que coincide con el detalle HU12. Mantener los
   métodos y controladores actuales de listado, disponibilidad y afinidad.
3. Resolver los errores globales de TypeScript en un trabajo separado y autorizado
   sobre las historias/contratos correspondientes; repetir ambas comprobaciones
   completas. Las pruebas HU8 aprobadas no implican que todo el monorepo compile.
4. Ejecutar las regresiones aisladas existentes de disponibilidad, detalle,
   afinidad, listado, servicios HU2 y transporte. Revisar cualquier suite que
   importe `AppModule` antes de ejecutarla: debe reemplazar todas las dependencias
   externas. No habilitar las integraciones opt-in con BD real.
5. En un entorno autorizado, verificar con datos existentes la ruta del proxy,
   backend desplegado y coincidencia de requisitos HU2 para una vacante vigente.
   Comprobar resultado vacío, 400/401/403/404 y errores temporales, sin alterar
   estados ni datos. Confirmar empresa, afinidad y navegación en la interfaz.
6. Revisar este inventario y los resultados antes de cualquier commit. La conexión
   con la BD real, la presencia de tablas/datos y el funcionamiento desplegado no
   están verificados por esta revisión ni por las pruebas con dobles.
