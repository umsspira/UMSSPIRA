# HU8: consultar requisitos técnicos sobre epic5

Revisión original: 12 de noviembre de 2026.
Rama original: `feat/G2-HU8-consultar-requisitos-tecnicos`.
Actualización de integración: 14 de noviembre de 2026, rama `integracion/G2-HU8`,
base `f65bf064` con HU2 nueva incorporada.
Referencia: `RESPALDO-HU8/docs/hu8-integracion-epic5.md` y archivos individuales
del respaldo. No se incorporaron directorios completos.

**Estado actual: lector canónico registrado en los providers de HU8; validación
con base de datos real pendiente.** El esquema integrado de HU2 ya contiene
`VacanteRequisitoTecnico`, asociado a `vacante_requisito_tecnico`. La fábrica del
lector recibe `PrismaService` y expone únicamente una función que delega en
`prisma.vacanteRequisitoTecnico.findMany`. El caso HU8 utiliza ese lector en lugar
de `RequisitosTecnicosService`. No hay mezcla de tablas ni lectura alternativa de
la fuente anterior. Este cambio no aplica migraciones ni copia datos históricos.

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

`JobPostingsModule` conserva sus importaciones y controladores. La fábrica HU8
recibe el repositorio oficial y `CanonicalTechnicalRequirementsReader`, registrado
mediante el `PrismaService` que ya exporta `PrismaModule`. Primero se consulta
`findPublishedById(id, now)`; solo si existe una vacante disponible se ejecuta
`obtenerRequisitos(posting.id)`. HU2 mantiene su repositorio Prisma y sus rutas
administrativas, con sus controles de propietario, sin cambios.

HU8 hereda la disponibilidad de HU12: estados `PUBLICADO`, `PUBLICADA`, `ACTIVA`,
`ACTIVO`, `ACTIVE`, `PUBLISHED`, con cierre nulo o estrictamente posterior al
instante consultado. No se agregó otra política de disponibilidad.

## Separación de los casos de uso HU8 y HU2/HU3

HU8 utiliza `GetPublishedJobPostingTechnicalRequirementsUseCase`, ubicado en
`apps/api/src/modules/job-postings/application/use-cases/get-published-job-posting-technical-requirements.use-case.ts`.
Su contrato sigue siendo `execute(id)`: comprueba la disponibilidad de la vacante
y devuelve `{ idVacante, requisitos }` mediante el puerto de lectura existente.

El caso administrativo de HU2/HU3 utiliza `GetTechnicalRequirementsUseCase` y
`execute(actor, vacancyId)`, con alcance de empresa. Separar el nombre de clase
y archivo permite que ambos casos coexistan sin compartir contrato ni token de
inyección. No se conserva un archivo de compatibilidad con el nombre anterior.

El refactor histórico actualizó únicamente el caso de uso y su prueba unitaria, las
referencias HU8 del controlador y provider, la composición canónica de prueba y
esta documentación. Mantiene `GET /api/v1/job-postings/:id/requisitos`, respuesta,
validaciones, errores, autenticación, disponibilidad y afinidad HU12. La activación
actual sustituye solo la dependencia de lectura HU8 por el lector canónico y
conserva los providers administrativos de HU2. No cambia el módulo. La integración
adicional con HU3 queda fuera de esta etapa.

## Revisión de compatibilidad

- El prefijo oficial es `api/v1`. La ruta HU8 no colisiona con `GET :id`, con las
  rutas HU2 `GET/PUT job-postings/:id/technical-requirements` ni con las rutas
  administrativas anteriores `vacantes/:id/requisitos`.
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

Las secciones históricas de este documento registran suites HU8 aprobadas con
persistencia/transporte simulados y errores globales de TypeScript de esas
revisiones. No acreditan el resultado de la activación actual. La comprobación
con el backend y la base de datos reales sigue pendiente.

## Inventario completo de cambios locales

Los seis archivos recuperados inicialmente se compararon con el respaldo. En la
etapa canónica se actualizó únicamente el tipo de dependencia del caso de uso HU8;
los otros cinco archivos se conservaron:

| Archivo | Función |
| --- | --- |
| `apps/api/src/modules/job-postings/application/use-cases/get-published-job-posting-technical-requirements.use-case.ts` | Disponibilidad HU12 y puerto de lectura HU8 compatible con el servicio anterior y el lector canónico. |
| `apps/api/src/modules/job-postings/http/controllers/technical-requirements.controller.ts` | Ruta HU8 y UUID. |
| `apps/api/src/modules/job-postings/job-postings.module.ts` | Importación HU2 y registro del controlador. |
| `apps/api/src/modules/job-postings/infrastructure/providers/job-postings.providers.ts` | Fábrica del caso de uso. |
| `apps/web/src/shared/services/technical-requirements.ts` | Transporte autenticado y validación de contrato. |
| `apps/web/src/app/(dashboard)/job-postings/[id]/technical-requirements.tsx` | Sección y estados HU8. |

Archivos modificados o agregados durante esta revisión:

| Archivo | Cambio |
| --- | --- |
| `apps/web/src/app/(dashboard)/job-postings/[id]/vacancy-detail-client.tsx` | Importar/montar HU8 y distinguir las habilidades HU12 mediante título y mensaje vacío. |
| `apps/api/src/modules/job-postings/application/use-cases/get-published-job-posting-technical-requirements.use-case.spec.ts` | Cinco casos unitarios recuperados, adaptados al puerto de lectura HU8. |
| `apps/api/test/job-postings-technical-requirements.e2e.spec.ts` | Integración HTTP con módulo, providers y lector canónico reales; guards/filtro oficiales, autenticador y delegado Prisma simulados. La fuente anterior se mantiene como centinela que no debe consultarse. |
| `apps/web/src/shared/services/technical-requirements.test.ts` | Recuperar pruebas de contrato, transporte, errores y cancelación; ampliar con 429 e integración del cliente/sesión oficiales usando `fetch` simulado. |
| `apps/web/src/app/(dashboard)/job-postings/[id]/technical-requirements.test.tsx` | Recuperar pruebas de componente y detalle; ampliar separación HU2/HU12 sin habilidades y visibilidad según el usuario. |
| `apps/api/src/modules/job-postings/application/ports/published-technical-requirements-reader.port.ts` | Puerto y formato de lectura HU8, independientes de los modelos de persistencia HU2. |
| `apps/api/src/modules/job-postings/infrastructure/readers/canonical-technical-requirements.reader.ts` | Lectura del contrato canónico y conversión al formato del frontend existente; registrado por la fábrica HU8 sobre el delegado Prisma nuevo. |
| `apps/api/src/modules/job-postings/infrastructure/readers/canonical-technical-requirements.reader.spec.ts` | 22 pruebas independientes de conversión, asociación, consulta y errores. |
| `apps/api/test/job-postings-canonical-technical-requirements.e2e.spec.ts` | 14 pruebas HTTP de la composición canónica con controlador, caso de uso, lector, guards y filtro existentes; fuente y autenticador simulados. |
| `docs/hu8-integracion-epic5.md` | Registrar decisiones, inventario, bloqueos y pasos pendientes. |

El respaldo contiene `job-postings-technical-requirements.e2e-spec.ts`, aunque su
guía cita `e2e.spec.ts`. Se recuperó con este último nombre para coincidir con el
`testMatch: ['**/*.spec.ts']` actual, sin cambiar la configuración compartida.
La integración HTTP verifica también que la lectura no invoque métodos de escritura.
Las pruebas históricas de otras HU permanecen intactas.

## Validación inicial del entorno (histórica)

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
node 'node_modules/jest/bin/jest.js' --runInBand --runTestsByPath src/modules/job-postings/application/use-cases/get-published-job-posting-technical-requirements.use-case.spec.ts test/job-postings-technical-requirements.e2e.spec.ts
node 'node_modules/typescript/bin/tsc' --noEmit --incremental false -p tsconfig.check.json
```

Desde `apps/web`:

```powershell
node 'node_modules/jest/bin/jest.js' --runInBand --runTestsByPath src/shared/services/technical-requirements.test.ts 'src/app/(dashboard)/job-postings/[id]/technical-requirements.test.tsx'
node 'node_modules/typescript/bin/tsc' --noEmit --incremental false -p tsconfig.json
```

## Preparación y validación del lector canónico (histórica)

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
node 'node_modules/jest/bin/jest.js' --runInBand --runTestsByPath src/modules/job-postings/application/use-cases/get-published-job-posting-technical-requirements.use-case.spec.ts src/modules/job-postings/infrastructure/readers/canonical-technical-requirements.reader.spec.ts test/job-postings-technical-requirements.e2e.spec.ts test/job-postings-canonical-technical-requirements.e2e.spec.ts
```

En esta etapa se modificaron solo el caso de uso HU8, sus tipos de prueba y este
documento, y se añadieron el puerto, lector y sus dos suites canónicas. No se
eliminó código funcional ni se modificaron providers, módulos, frontend, servicios
HU2, modelos, migraciones, lockfiles o configuraciones compartidas. No se usaron
consultas SQL como sustituto del modelo faltante ni conversiones de tipo para
aparentar la existencia del delegado Prisma canónico.

## Validación del refactor de nombres (histórica)

Refactor local sobre `7cd3aa97`, correspondiente al PR #687 en Draft; todavía
sin commit de estos cambios. Se renombraron el caso de uso y su prueba y se
actualizaron únicamente sus referencias HU8 y esta documentación.

| Comprobación repetida después del refactor | Resultado real |
| --- | --- |
| Cuatro suites API HU8 | 50 pruebas aprobadas. |
| Dos suites web HU8 | 39 pruebas aprobadas. |
| Cinco suites de regresión API de HU12 y HU2 anterior | 21 pruebas aprobadas. |
| Tres suites web de detalle HU12, listado y servicio de vacantes | 10 pruebas aprobadas. |
| Total Jest | 14 suites, 120 pruebas aprobadas; se conservan las 89 de HU8. |
| ESLint de los cinco archivos TypeScript afectados | Código 0, sin correcciones automáticas. |
| TypeScript global API | Código 1: mismos 6 diagnósticos heredados, ninguno nuevo. |
| TypeScript global web | Código 1: mismos 46 diagnósticos heredados, ninguno nuevo. |

Los cinco archivos TypeScript se compararon con `7cd3aa97`, normalizando los
finales de línea: su contenido coincide exactamente al sustituir solamente los
nombres de archivo y clase. No quedan imports HU8 ni archivos de compatibilidad
con el nombre anterior. El cambio comprende seis archivos lógicos, incluidos
los dos renombres; los otros cuatro son controlador, providers, composición
canónica de prueba y documentación.

Jest se ejecutó directamente con Node, `--runInBand --no-cache --runTestsByPath`;
TypeScript con `--noEmit --incremental false`. Las integraciones HTTP conservan
autenticador y persistencia simulados. No se generó Prisma, no se consultaron
servicios de aplicación reales ni se modificaron datos. La fuente productiva
sigue siendo el servicio anterior HU2 y la integración canónica real continúa
pendiente. Los errores globales heredados descritos arriba siguen impidiendo
aprobar las comprobaciones completas de tipos.

## Activación en integracion/G2-HU8

La activación modifica el registro del lector y la fábrica HU8 en
`job-postings.providers.ts`. No modifica `job-postings.module.ts`, controladores,
frontend, permisos, política de disponibilidad, modelos ni migraciones.

La prueba HTTP que importa `JobPostingsModule` conserva los providers reales y
sustituye `PrismaService` por un delegado canónico simulado. Comprueba la consulta
y conversión después de verificar disponibilidad, acceso con sesión de titulado
sin alcance de empresa, vacío confirmado, errores y ausencia de consultas a la
fuente anterior o de operaciones SQL alternativas. También cubre asociación con
otra vacante, tabla ausente y tiempo de espera de la fuente canónica.

La tabla ausente conserva el error genérico 500 del filtro existente; los tiempos
de espera Prisma P2024 conservan 503. No se agregan traducciones globales ni se
presentan esos fallos como una colección vacía. Los registros exclusivos de la
tabla anterior no aparecen en HU8; `EXPERTO` no es un nivel del contrato nuevo.

Al iniciar esta etapa faltaban las dependencias y el cliente Prisma. Se instalaron
953 paquetes desde la caché con `--offline --frozen-lockfile --ignore-scripts`,
sin descargas ni cambios en manifiestos o lockfile. Se compiló el paquete de tipos
compartidos y se generó Prisma Client 7.10.1 desde el esquema existente, usando
URLs ficticias solo en el proceso. Las salidas de preparación están ignoradas
por Git; no se aplicaron migraciones ni se consultaron datos reales.

| Verificación de esta activación | Resultado |
| --- | --- |
| Cinco suites HU8: caso de uso, lector, HTTP con módulo real, HTTP aislado y disponibilidad | 65 pruebas aprobadas. |
| Tres suites HU12: detalle publicado, política de afinidad y repositorio | 12 pruebas aprobadas. |
| Selección de regresión HU2 en `companies-job-postings.e2e.spec.ts` | 6 pruebas aprobadas; las otras 34 se excluyeron con `--testNamePattern`. |
| TypeScript completo API, `--noEmit --incremental false -p tsconfig.check.json` | Código 0. Comprueba también la fábrica contra el cliente Prisma generado. |
| ESLint de providers, lector y prueba HTTP modificados, sin `--fix` | Código 0. |
| `git diff --check` y revisión del alcance | Sin errores; solo cuatro archivos HU8 modificados. |

Jest se ejecutó directamente con Node, `--runInBand --no-cache --runTestsByPath`.
La selección HU2 cubrió publicación, CSRF, asociación y aislamiento de requisitos,
normalización de duplicados, sesión/permiso/alcance y validación estricta. Todas
las suites ejecutadas sustituyen la persistencia por dobles; no acreditan consultas
reales a PostgreSQL. No se repitieron pruebas ni compilación del frontend.

## Pasos pendientes

1. En un entorno autorizado, cotejar datos existentes de HU2 con el endpoint HU8
   y la interfaz, incluida una colección vacía, sin alterar estados ni registros.
2. Comprobar el recorrido real del proxy y frontend, conservando autenticación,
   disponibilidad y la separación de requisitos respecto a las habilidades HU12.
3. Conciliar una eventual integración de HU3 en otra etapa, preservando las rutas
   actuales de listado, detalle, requisitos y afinidad.
4. Revisar el diff y los resultados antes de cualquier commit. La presencia de
   tablas/datos y el funcionamiento desplegado siguen sin acreditarse con dobles.
