# Épica 9 · Rutas del backend

Portal Admin UMSS (Grupo 5). Endpoints de `apps/api` que trabajó la épica 9. Primero los del Sprint 3 (US-3.3 «Tablero de acreditación») y al final los del Sprint 1. Todas las rutas llevan el prefijo `/api/v1` y necesitan sesión iniciada.

- **Administrador:** rol `administrador` y permiso `reportes:read`. Solo ve datos de las carreras que tiene asignadas (`reportScope`); si pide otra carrera, responde 403.
- **Titulado:** rol `titulado`. Solo ve y envía su propia encuesta.

Las colecciones de prueba están en `postman/UMSSPIRA.json` (carpeta «Reportes», petición del PDF ejecutivo), `postman/Encuestas.json`, `bruno/Reportes/` y `bruno/Encuestas/`.

## Tablero de acreditación (HU-001 a HU-004) · módulo `reports`

| Método | Ruta | Rol | Parámetros | Respuesta |
|---|---|---|---|---|
| GET | `/reports/accreditation` | Administrador | `careerId`, `cohorte`, `semestre` | Total de respuestas, % de titulados empleados, tiempo promedio de inserción, cantidad por rango de salario, empleabilidad por cohorte, y años y semestres disponibles para los filtros |
| GET | `/reports/accreditation/heatmap` | Administrador | `careerId`, `cohorte` | Mapa de calor: % por cohorte y área (6 áreas), con `status` `ok`, `insufficient` (1 a 4 titulados, sin cantidad) o `no-data`, y `updatedAt` |
| GET | `/reports/accreditation/pdf` | Administrador | `careerId`, `cohorte`, `semestre` | Reporte ejecutivo en PDF (A4). Si el periodo no tiene respuestas: 404 con `error.code = ACCREDITATION_EMPTY_PERIOD` |

- `cohorte`: año de 4 dígitos, por ejemplo `2023`.
- `semestre`: `1-2026` o `2-2026`. El semestre 1 va de enero a junio y el 2 de julio a diciembre, en hora de Bolivia.
- Las cohortes y celdas con 1 a 4 respuestas se devuelven sin cantidad ni porcentaje.
- Los indicadores se guardan en caché de Redis por 5 minutos (por carrera y filtro). La caché de la carrera se borra cuando un titulado envía su encuesta.

## Encuestas de empleabilidad (Sprint 2, con los cambios del Sprint 3) · módulo `surveys`

### Titulado

| Método | Ruta | Rol | Cuerpo | Respuesta |
|---|---|---|---|---|
| GET | `/surveys/status` | Titulado | — | `submitted`, `hasActiveSurvey` y `surveyId` de la encuesta publicada y vigente de su carrera (desde el Sprint 3) |
| GET | `/surveys/me` | Titulado | — | Respuestas que guardó en la encuesta vigente |
| POST | `/surveys` | Titulado | `condicion_laboral` y, si trabaja: `cargo`, `empresa`, `area`, `modalidad`, `salario_mensual`, `tiempo_insercion` | 201 con el id. 409 si ya la envió |

### Administrador

| Método | Ruta | Rol | Parámetros o cuerpo | Respuesta |
|---|---|---|---|---|
| GET | `/reports/surveys` | Administrador | `careerId`, `page`, `limit` | Totales (trabajan, no trabajan, por modalidad, salario e inserción) y detalle paginado |
| GET | `/surveys/admin` | Administrador | — | Encuestas de su carrera |
| POST | `/surveys/admin` | Administrador | `title`, `startDate`, `endDate` | Crea la encuesta en `BORRADOR` |
| PATCH | `/surveys/admin/:id` | Administrador | `title`, `startDate`, `endDate` | Edita una encuesta en `BORRADOR` (409 si está publicada) |
| POST | `/surveys/admin/:id/publish` | Administrador | — | La pasa a `PUBLICADA`. 409 `SURVEY_ALREADY_PUBLISHED` si ya hay otra publicada y vigente |
| POST | `/surveys/admin/:id/unpublish` | Administrador | — | La vuelve a `BORRADOR` |

## Sprint 1 · Reportes de titulados · módulo `reports`

| Método | Ruta | Rol | Parámetros | Respuesta |
|---|---|---|---|---|
| GET | `/reports/metrics` | Administrador | `careerId` | Solicitudes de registro, aprobadas, observadas y mentores activos de la carrera |
| GET | `/reports/graduates` | Administrador | `careerId`, `status`, `search`, `page`, `limit` | Lista paginada de titulados |
| GET | `/reports/graduates/report` | Administrador | `careerId`, `status`, `search` | Datos del reporte de titulados |
| GET | `/reports/graduates/csv` | Administrador | `careerId`, `status`, `search` | Archivo CSV en UTF-8, con las fórmulas neutralizadas |
| GET | `/reports/graduates/pdf` | Administrador | `careerId`, `status`, `search` | Archivo PDF institucional (A4) |

- `status` acepta `PENDIENTE`, `APROBADA`, `OBSERVADA` o `RECHAZADA`.
- Las exportaciones tienen un máximo de 10 000 filas y un límite de 5 descargas por minuto por usuario.

## Módulos del backend

| Carpeta | Contenido |
|---|---|
| `apps/api/src/modules/reports/` | Reportes de titulados (Sprint 1), tablero de acreditación, mapa de calor, filtros, PDF ejecutivo y caché de indicadores (`infrastructure/cache/`) |
| `apps/api/src/modules/surveys/` | Envío y consulta de la encuesta, reporte de encuestas y gestión de encuestas |
| `apps/api/scripts/seed/epic-9.ts` y `qa-second-career.ts` | Datos de prueba: titulados, respuestas y radar de Ingeniería de Sistemas, y una segunda carrera (Ingeniería Informática) con su propio administrador |
