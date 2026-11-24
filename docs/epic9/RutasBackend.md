# Épica 9 · Rutas del backend

Portal Admin UMSS, Encuestas & Analytics (Grupo 5). Endpoints de `apps/api` que trabajó la épica 9 en los tres sprints, más los de la deuda técnica de la épica 5 que se le asignó. Todas las rutas llevan el prefijo `/api/v1` y necesitan sesión iniciada.

## Reglas comunes

| Rol | Regla |
|---|---|
| Administrador | Rol `administrador` y permiso `reportes:read`. Solo ve datos de las carreras que tiene asignadas (`reportScope`, en `apps/api/src/modules/reports/application/services/report-scope.ts`); si pide otra carrera, responde 403 |
| Titulado | Rol `titulado`. Solo ve, envía y corrige su propia encuesta, y sube su propio CV |
| Empresa | Permiso `empresas:self:read`. Solo ve los postulantes de sus vacantes |

- Las exportaciones (PDF, CSV y Excel) tienen un límite de 5 descargas por minuto por usuario (`ReportExportGuard`); si se pasa, responde 429 `RATE_LIMITED`.
- Las entradas se validan con Zod (`http/schemas/`) y los datos se leen con Prisma. Los parámetros que no están en el esquema se rechazan con 400.
- Errores de negocio: `invalid` → 400, `forbidden` → 403, `missing` → 404 y `conflict` → 409 (`shared/http/filters/error-handler.filter.ts`).
- Colecciones de prueba: `postman/UMSSPIRA.json` (carpeta «Reportes»), `postman/Encuestas.json`, `bruno/Reportes/`, `bruno/Encuestas/`, `bruno/Perfil/` y `bruno/Vacantes/`. La columna «Colección» del resumen indica qué endpoints tienen una petición de prueba.

## Resumen de endpoints

| Método | Ruta | Rol | Sprint | HU | Colección |
|---|---|---|---|---|---|
| GET | `/reports/metrics` | Administrador | 1 | US-1.9.1 | Postman y Bruno |
| GET | `/reports/graduates` | Administrador | 1 | US-1.9.1 a US-1.9.3 | Postman y Bruno |
| GET | `/reports/graduates/report` | Administrador | 1 | US-1.9.3 | Postman y Bruno |
| GET | `/reports/graduates/pdf` | Administrador | 1 | US-1.9.4 | Postman y Bruno |
| GET | `/reports/graduates/csv` | Administrador | 1 | US-1.9.5 | Postman y Bruno |
| GET | `/surveys/status` | Titulado | 2 (cambio en el 3) | HU-003 · HU-005 | Postman y Bruno |
| GET | `/surveys/me` | Titulado | 2 | HU-003 | Postman y Bruno |
| POST | `/surveys` | Titulado | 2 | HU-003 | Postman y Bruno |
| GET | `/reports/surveys` | Administrador | 2 (cambio en el 3) | HU-004 · mejora 1.4 | Postman y Bruno |
| GET | `/reports/accreditation` | Administrador | 3 | HU-001 y HU-003 | Falta |
| GET | `/reports/accreditation/heatmap` | Administrador | 3 | HU-002 | Falta |
| GET | `/reports/accreditation/pdf` | Administrador | 3 | HU-004 | Postman y Bruno |
| GET | `/reports/accreditation/xlsx` | Administrador | 3 | HU-004 | Falta |
| GET | `/surveys/admin` | Administrador | 3 | HU-005 | Falta |
| POST | `/surveys/admin` | Administrador | 3 | HU-005 | Falta |
| PATCH | `/surveys/admin/:id` | Administrador | 3 | HU-005 | Falta |
| POST | `/surveys/admin/:id/publish` | Administrador | 3 | HU-005 | Falta |
| POST | `/surveys/admin/:id/unpublish` | Administrador | 3 | HU-005 | Falta |
| PATCH | `/surveys/me` | Titulado | 3 | HU-006 | Falta |
| PUT | `/perfil/cv` | Titulado | Deuda de la épica 5 | HU-16 | Bruno |
| GET | `/perfil/cv` | Titulado | Deuda de la épica 5 | HU-16 | Bruno |
| GET | `/vacantes/:idVacante/postulantes/:idPostulacion/cv` | Empresa | Deuda de la épica 5 | HU-16 | Bruno |

# Sprint 1 · Reportería base institucional (US-1.9) · módulo `reports`

| Método | Ruta | Parámetros | Respuesta |
|---|---|---|---|
| GET | `/reports/metrics` | `careerId` | Solicitudes de registro, aprobadas, observadas y mentores activos de la carrera: son las tarjetas «Titulados registrados», «Titulados verificados», «Titulados observados» y «Mentores activos» |
| GET | `/reports/graduates` | `careerId`, `status`, `search`, `page`, `limit` | Lista paginada de titulados con número de registro, nombre, código SIS, teléfono, correo, fechas de ingreso, titulación y revisión, duración y observación |
| GET | `/reports/graduates/report` | `careerId`, `status`, `search` | Datos del reporte consolidado de titulados |
| GET | `/reports/graduates/pdf` | `careerId`, `status`, `search` | PDF institucional A4 horizontal (pdfmake): escudo y «Universidad Mayor de San Simón», «Registro de titulados» con la carrera, «Estado» y «Total», fecha de generación y tabla con el encabezado repetido en cada hoja y «Página N de M» |
| GET | `/reports/graduates/csv` | `careerId`, `status`, `search` | CSV en UTF-8 que se abre bien en Excel. Neutraliza los valores que empiezan con `=`, `+`, `-` o `@` para que no se ejecuten como fórmulas |

- `status` acepta `PENDIENTE`, `APROBADA`, `OBSERVADA` o `RECHAZADA`. En la pantalla, «Verificados» es `APROBADA` y «Observados» es `OBSERVADA`.
- `search` admite hasta 100 caracteres (la pantalla limita a 60). `page` empieza en 1 y `limit` va de 1 a 1000 (10 por defecto).
- Las exportaciones tienen un máximo de 10 000 filas; si el filtro da más, responde 400 `REPORT_TOO_LARGE` («Reduce los filtros: cada exportación admite hasta 10000 registros»).
- **Historia:** en el Sprint 1 el PDF salió como `GET /graduates-report/pdf?status=verified|observed` (PR #28). Con la migración a la arquitectura hexagonal de DevOps (PR #381, 20/10/2026), la reportería quedó en el módulo `reports` con `/reports/graduates/pdf` y `/reports/graduates/csv`, que usan los mismos filtros de la lista.

Archivos: `controllers/get-report-metrics`, `list-report-graduates`, `get-graduate-report`, `export-report-pdf` y `export-report-csv` (en `http/controllers/`), `infrastructure/exporters/pdf-report.writer.ts` y `csv-report.writer.ts`, `infrastructure/repositories/prisma-report.repository.ts` y `http/guards/report-export.guard.ts`.

# Sprint 2 · Encuesta de empleabilidad (US-2.6) · módulo `surveys`

## Titulado

| Método | Ruta | Cuerpo | Respuesta |
|---|---|---|---|
| GET | `/surveys/status` | — | `submitted` (si ya la envió), `hasActiveSurvey` y `surveyId` de la encuesta vigente |
| GET | `/surveys/me` | — | `responded` y `response` con las respuestas que guardó, incluido `edicion_usada` (desde el Sprint 3). 404 si no hay una encuesta vigente |
| POST | `/surveys` | `condicion_laboral`, `id_encuesta` (opcional) y, si trabaja: `cargo`, `empresa`, `area`, `modalidad`, `salario_mensual`, `tiempo_insercion` | 201 con el id. 400 «Datos de encuesta invalidos» con el detalle por campo, 404 si no hay encuesta vigente y 409 «La encuesta ya fue enviada» |

Validación del envío (`http/schemas/surveys.schemas.ts`, Zod):
- `condicion_laboral` es booleano. Si es `false`, los datos laborales no se aceptan («No corresponde si no trabaja»).
- `cargo` (hasta 150 caracteres), `empresa` (hasta 200) y `area` (hasta 150): obligatorios si trabaja y con al menos 2 letras. La pantalla los limita a 100.
- `modalidad`: `Presencial`, `Remoto` o `Híbrido`.
- `salario_mensual`: `0–2.999`, `3.000–5.000`, `5.001–8.000`, `8.001–12.000` o `12.001–21.000`.
- `tiempo_insercion`: solo dígitos, en meses («El tiempo de inserción debe ser un número entero de meses»).
- Se guarda en `respuesta_encuesta` (una sola fila por titulado y encuesta, con clave única) dentro de una transacción, con la fecha y hora de envío.

## Administrador

| Método | Ruta | Parámetros | Respuesta |
|---|---|---|---|
| GET | `/reports/surveys` | `careerId`, `page`, `limit` | Totales (trabajan, no trabajan, por modalidad, salario e inserción) y detalle de respuestas. Desde el Sprint 3, solo de la carrera del administrador, con los totales calculados en la base de datos y el detalle paginado |

# Sprint 3 · Tablero de acreditación (US-3.3)

## Tablero (HU-001 a HU-004) · módulo `reports`

| Método | Ruta | Parámetros | Respuesta |
|---|---|---|---|
| GET | `/reports/accreditation` | `careerId`, `cohorte`, `semestre` | Total de respuestas, % de titulados empleados, tiempo promedio de inserción, cantidad por rango de salario, empleabilidad por cohorte, y cohortes y semestres disponibles para los filtros |
| GET | `/reports/accreditation/heatmap` | `careerId`, `cohorte` | Mapa de calor: % por cohorte y área (6 áreas), con `status` `ok`, `insufficient` (1 a 4 titulados, sin cantidad) o `no-data`, y `updatedAt` |
| GET | `/reports/accreditation/pdf` | `careerId`, `cohorte`, `semestre` | Reporte ejecutivo en PDF A4 (pdfmake), archivo `acreditacion-<carrera>-<aaaa-mm-dd>.pdf`. Si el periodo no tiene respuestas: 404 `ACCREDITATION_EMPTY_PERIOD` |
| GET | `/reports/accreditation/xlsx` | `careerId`, `cohorte`, `semestre` | Excel (exceljs) con tres hojas: «Indicadores», «Empleabilidad por cohorte» y «Mapa de calor». Mismo nombre de archivo que el PDF, con `.xlsx` |

- `cohorte`: año de 4 dígitos, por ejemplo `2023`.
- `semestre`: `1-2026` o `2-2026`. El semestre 1 va de enero a junio y el 2 de julio a diciembre, en hora de Bolivia.
- Las cohortes y celdas con 1 a 4 respuestas se devuelven sin cantidad ni porcentaje (`MIN_RESPONSES_PER_GROUP = 5`).
- Los indicadores se guardan en caché de Redis por 5 minutos (por carrera y filtro). La caché de la carrera se borra cuando un titulado envía o corrige su encuesta. Si Redis no responde, el tablero se calcula sin caché.
- Se usa la encuesta más reciente de cada carrera que ya tenga respuestas; la cohorte es el año de egreso del titulado. El mapa de calor toma el último cálculo del radar de cada titulado.

## Gestión de encuestas (HU-005) · módulo `surveys`

| Método | Ruta | Cuerpo | Respuesta |
|---|---|---|---|
| GET | `/surveys/admin` | — | Encuestas de su carrera |
| POST | `/surveys/admin` | `title` (hasta 200 caracteres), `startDate`, `endDate` y `format` (opcional) | Crea la encuesta en `BORRADOR` |
| PATCH | `/surveys/admin/:id` | Los mismos campos, todos opcionales | Edita una encuesta en `BORRADOR` |
| POST | `/surveys/admin/:id/publish` | — | La pasa a `PUBLICADA` |
| POST | `/surveys/admin/:id/unpublish` | — | La vuelve a `BORRADOR` |

Errores:

| Código | Cuándo |
|---|---|
| 403 `SURVEY_CAREER_FORBIDDEN` | El administrador no tiene una carrera asignada y activa |
| 404 `SURVEY_NOT_FOUND` | La encuesta no existe o es de otra carrera |
| 400 `SURVEY_INVALID_DATES` | La fecha de fin es anterior a la de inicio |
| 400 `SURVEY_DATES_REQUIRED` | Se intenta publicar sin fechas |
| 409 `SURVEY_NOT_EDITABLE` | Se intenta editar una encuesta publicada |
| 409 `SURVEY_ALREADY_PUBLISHED` | Ya hay otra encuesta publicada en la carrera que está vigente o cuyas fechas se cruzan («Ya existe una encuesta publicada y vigente para esta carrera») |

Cambio en `/surveys/status`, `/surveys/me` y `POST /surveys`: el titulado solo puede usar la encuesta `PUBLICADA` de su carrera y dentro de sus fechas (`findActiveSurveyForGraduate`).

## Corrección única (HU-006) · módulo `surveys`

| Método | Ruta | Cuerpo | Respuesta |
|---|---|---|---|
| PATCH | `/surveys/me` | Los mismos campos de `POST /surveys` | Corrige la respuesta una sola vez y marca `edicion_usada = true` y `fecha_actualizacion` |

Errores:

| Código | Cuándo |
|---|---|
| 404 `SURVEY_NOT_ACTIVE` | No hay una encuesta vigente |
| 404 `SURVEY_RESPONSE_NOT_FOUND` | Todavía no envió la encuesta («Primero debes enviar la encuesta») |
| 409 `SURVEY_EDIT_ALREADY_USED` | Ya usó su única edición («Ya utilizaste tu única edición») |
| 409 `SURVEY_EDIT_UNAVAILABLE` | La encuesta dejó de estar publicada o vigente mientras editaba |

# Deuda técnica de la épica 5 (asignada a la épica 9)

## HU-16 · Privacidad del titulado y CV · módulos `profile` y `vacantes`

| Método | Ruta | Rol | Cuerpo | Respuesta |
|---|---|---|---|---|
| PUT | `/perfil/cv` | Titulado (`perfil:self:write`) | Formulario con el archivo en `archivo` | Sube o reemplaza su CV. Solo PDF (se revisan la extensión y la firma `%PDF-`) de hasta 5 MB en `epic9` (4 MB en `dev`, ver la nota). Errores: `CV_REQUIRED`, `INVALID_CV_TYPE` y `CV_TOO_LARGE` |
| GET | `/perfil/cv` | Titulado (`perfil:self:read`) | — | Descarga su propio CV |
| GET | `/vacantes/:idVacante/postulantes/:idPostulacion/cv` | Empresa (`empresas:self:read`) | — | Descarga el CV del postulante de una de sus vacantes, sin caché |

- La política de la T16.1 (`docs/epic5/politica-datos-postulante.md`) define qué datos del postulante ve la empresa. Se aplica con una sola proyección en `GET /vacantes/:idVacante/postulantes` y `GET /vacantes/:idVacante/postulantes/:idPostulacion`.
- El CV se guarda con la migración `20261120000000_epic5_hu16_cv_postulante`. Detalle del endpoint: `apps/api/docs/endpoints/epic5/HU16-cv-postulante.md`.
- **En el despliegue**, el proxy de la web (función de Vercel) corta los cuerpos de más de unos 4,5 MB con 413 antes de llegar a la API. Por eso, el 23/11 otro grupo bajó en `dev` `MAX_CV_BYTES` de 5 a 4 MB (commit `ba5ee8b1`, PR #977 a `epic2`, que llegó a `dev` con el PR #978). `epic9` recibirá el cambio en la próxima integración de `dev`.

La HU-20 (ayuda y explicación de la afinidad) es solo de frontend: no agrega endpoints.

# Módulos del backend

| Carpeta | Sprint | Contenido |
|---|---|---|
| `apps/api/src/modules/reports/` | 1 y 3 | Reportes de titulados (métricas, lista, PDF y CSV), tablero de acreditación, mapa de calor, filtros, PDF y Excel ejecutivos y caché de indicadores (`infrastructure/cache/`) |
| `apps/api/src/modules/surveys/` | 2 y 3 | Envío, consulta y corrección única de la encuesta, reporte de respuestas y gestión de encuestas |
| `apps/api/src/modules/profile/` (CV) y `apps/api/src/modules/vacantes/` | Deuda de la épica 5 | Subida y descarga del CV, y política de datos del postulante |
| `apps/api/scripts/seed/epic-9.ts` y `qa-second-career.ts` | 2 y 3 | Datos de prueba: titulados, respuestas y radar de Ingeniería de Sistemas, y una segunda carrera (Ingeniería Informática) con su propio administrador |
