# Épica 9 · Reporte de la épica

Portal Admin UMSS · Grupo 5. Cómo funciona cada funcionalidad de la épica al cerrar el Sprint 3. La parte principal es el **Sprint 3** (US-3.3 «Tablero de acreditación»); al final hay un resumen de los Sprints 1 y 2, que el Sprint 3 reutiliza.

Las rutas están en [RutasFrontend.md](RutasFrontend.md) y [RutasBackend.md](RutasBackend.md).

# Sprint 3 · Tablero de acreditación (US-3.3)

## Reglas comunes

- **Carrera del administrador:** todas las consultas de reportes usan `reportScope` (`apps/api/src/modules/reports/application/services/report-scope.ts`). Toma las carreras asignadas al administrador (`actor.scopes.careerIds`); si pide otra carrera o no tiene ninguna, responde 403.
- **Grupos chicos:** una cohorte o una celda con 1 a 4 titulados no muestra porcentaje ni cantidad, solo «Sin datos suficientes» (`MIN_RESPONSES_PER_GROUP = 5`).
- **Arquitectura:** cada módulo del backend sigue `domain/application/http/infrastructure`, valida con Zod y usa Prisma.

## HU-001 · Tablero de empleabilidad

**Qué pidió la PO:** un tablero con el total de respuestas, el porcentaje de titulados empleados, el tiempo promedio de inserción, la cantidad por rango de salario y la empleabilidad por cohorte, solo de la carrera del administrador.

**Cómo funciona:**
1. La pantalla `/reports/acreditacion` pide `GET /reports/accreditation`.
2. El caso de uso `GetAccreditationDashboardUseCase` revisa la carrera con `reportScope` y busca primero en la **caché de Redis** (`reports/infrastructure/cache/accreditation-cache.ts`, 5 minutos, una clave por carrera y filtro).
3. Si no está en caché, `PrismaReportRepository.accreditationDashboard` toma la **encuesta más reciente de la carrera que tenga respuestas** (así una encuesta nueva en borrador no deja el tablero en 0) y calcula:
   - total de respuestas y % de los que trabajan (redondeado a entero);
   - promedio de meses de inserción, solo de los que trabajan (1 decimal);
   - cantidad por rango: 0–2.999, 3.000–5.000, 5.001–8.000, 8.001–12.000 y 12.001–21.000;
   - empleabilidad por cohorte (año de titulación), con «Sin datos suficientes» en cohortes de 1 a 4.
4. Cuando un titulado envía su encuesta, se borra la caché de su carrera (borrado por prefijo con `SCAN`), así el total se actualiza aunque haya caché.

**Integridad de los datos (mejora del Sprint 2):** `respuesta_encuesta` tiene claves foráneas hacia `encuesta` y `titulado`, `condicion_laboral` es booleano y hay un índice por `fecha_envio`. La encuesta se valida en el backend con las mismas reglas del formulario: texto válido, catálogos de modalidad y salario, meses enteros y los límites de la base de datos.

## HU-002 · Mapa de calor de competencias

**Qué pidió la PO:** un mapa por cohorte y por cada una de las 6 áreas técnicas, con color según el porcentaje, que use el último cálculo del radar de cada titulado.

**Cómo funciona:**
1. La pantalla pide `GET /reports/accreditation/heatmap`.
2. `PrismaReportRepository.competencyHeatmap` lee `calculo_radar` y toma **solo el último cálculo de cada titulado** (`distinct` por titulado, ordenado por `fecha_calculo`).
3. Promedia el porcentaje de `afinidad_radar` por cohorte y área. Las 6 áreas salen siempre, en orden fijo (`AFFINITY_AREAS` de `@umsspira/shared-types`).
4. Cada celda trae `status`: `ok` (con porcentaje y cantidad), `insufficient` (1 a 4 titulados, sin cantidad) o `no-data` (sin cálculos). También devuelve `updatedAt`, la fecha del cálculo más reciente.
5. En la pantalla, el color va en 5 tramos de 20 %, con leyenda; al pasar el puntero sale «Calculado sobre N titulados»; el botón «Actualizar» vuelve a pedir el mapa; en el celular se desplaza dentro de su recuadro.

## HU-003 · Filtros por cohorte y semestre

**Qué pidió la PO:** filtrar el tablero por cohorte y por semestre, y que el filtro se mantenga al recargar.

**Cómo funciona:**
1. Los selectores «Cohorte» y «Semestre» guardan el filtro en la URL (`?cohorte=2023&semestre=1-2026`) con `useAccreditationFilters`.
2. `GET /reports/accreditation` devuelve `availableCohorts` y `availableSemesters`, calculados **antes** de aplicar el filtro, para que las opciones no se achiquen.
3. **Cohorte:** filtra los indicadores, el gráfico y el mapa de calor (el mapa queda con una sola fila).
4. **Semestre:** se calcula con la fecha de envío de la encuesta, en hora de Bolivia (semestre 1 = enero a junio, 2 = julio a diciembre). Filtra los indicadores y el gráfico; **no cambia el mapa** y se muestra la nota «El filtro de semestre no se aplica al mapa de calor».
5. Si la combinación no tiene datos, sale «No hay información para el periodo seleccionado». «Limpiar filtros» vuelve a «Todas» y «Todos».

## HU-004 · Exportación del reporte ejecutivo

**Qué pidió la PO:** exportar el tablero en PDF y en Excel, con el filtro aplicado y solo la carrera del administrador.

**Cómo funciona el PDF:**
1. El botón «Exportar PDF» muestra «Generando…» y pide `GET /reports/accreditation/pdf` con los mismos filtros.
2. `AccreditationReportDataReader` arma el reporte con los **mismos datos del tablero** (indicadores y mapa de calor) y el nombre de la carrera.
3. `AccreditationPdfWriter` (pdfmake) arma una hoja A4 con la carrera, el periodo, la fecha de emisión, los indicadores, el salario, el gráfico por cohorte y el mapa de calor con su leyenda.
4. El archivo se descarga como `acreditacion-<carrera>-<aaaa-mm-dd>.pdf`, sin caché. Si el periodo no tiene respuestas responde 404 con `ACCREDITATION_EMPTY_PERIOD`, y la pantalla muestra «No hay información para exportar en este periodo».

**Excel:** pendiente (T4.2). El botón «Exportar Excel» ya está en el tablero.

## HU-005 · Publicación de encuestas por carrera

**Qué pidió la PO:** que el administrador cree, edite, publique y despublique encuestas de su carrera, con una sola encuesta publicada y vigente a la vez, y que el titulado solo vea la de su carrera.

**Cómo funciona:**
1. La pantalla `/reports/encuestas/gestion` usa los endpoints `/surveys/admin`.
2. Toda encuesta nueva queda en `BORRADOR`. Solo se puede editar en borrador; la fecha de fin no puede ser anterior a la de inicio.
3. Al publicar, una transacción revisa que no haya otra `PUBLICADA` vigente hoy o con fechas superpuestas; si la hay, responde 409 con «Ya existe una encuesta publicada y vigente para esta carrera» y la encuesta sigue en borrador.
4. El titulado usa una **consulta única** (`findActiveSurveyForGraduate`) en `/surveys/status`, `/surveys/me` y el envío: la encuesta debe estar `PUBLICADA`, ser de su carrera y estar dentro de sus fechas (comparando por día en hora de Bolivia, así el último día sigue vigente).
5. Si no hay una así, `/surveys` muestra «No hay una encuesta disponible por el momento» con el botón «Volver al inicio». Sin conexión, el botón «Confirmar y enviar» se desactiva; el borrador se borra al enviar o al cambiar de sesión.

## HU-006 · Corrección única de la encuesta

**Qué pidió la PO:** que el titulado pueda corregir sus respuestas una sola vez, mientras la encuesta esté vigente.

**Estado:** en curso. La pantalla de edición está lista en el PR #755 (botón «Editar respuestas», formulario precargado, aviso «Solo puede editar esta encuesta una vez» y validaciones). Falta el endpoint `PATCH /surveys/me` (T6.1). Las columnas `edicion_usada` y `fecha_actualizacion` ya están en la base.

## Lo que no se esperaba

- Una prueba de la épica de eventos con una fecha fija vencida hacía fallar la CI de todos los PR. Se cambió la fecha a 2099 en epic9 (#740) y la épica 7 hizo el mismo cambio en dev.
- Al filtrar el tablero, las listas de cohortes y semestres se achicaban a la opción elegida. Se corrigió armando las listas antes de aplicar el filtro.
- La caché de Redis primero se hizo modificando `apps/api/src/shared/`, que está protegida por CODEOWNERS. Se movió al módulo `reports`.
- Los cálculos de radar de prueba salían todos entre 92 % y 100 %, en un solo color. Se ajustó la semilla para que el mapa muestre los 5 tramos.
- La migración de integridad de `respuesta_encuesta` se detiene a propósito si la base tiene datos viejos o respuestas huérfanas. Antes de fusionarla, el DevOps de base de datos revisó la base del despliegue y no había ninguno.
- La cuenta de demostración `admin@umss.edu.bo` tiene asignadas dos carreras (Sistemas e Informática), así que su tablero suma las dos. Para probar «solo su carrera» se usa `admin.informatica@umss.edu.bo`.

## Pendiente

- T6.1 y T6.2: corrección única de la encuesta.
- T4.2: exportación a Excel.

# Sprints anteriores

## Sprint 1 · Reportes institucionales de titulados

**Qué pidió la PO:** que el Administrador de Carrera consulte los titulados que se registraron en su carrera, vea su estado de verificación y exporte el registro.

**Cómo funciona:**
1. La pantalla `/reports` tiene dos pestañas internas: «Dashboard» y «Titulados».
2. **Dashboard:** `GET /reports/metrics` cuenta, solo de las carreras del administrador, las solicitudes de registro («Titulados registrados»), las aprobadas («Titulados verificados»), las observadas («Titulados observados») y los mentores activos («Mentores activos»).
3. **Titulados:** `GET /reports/graduates` devuelve la lista paginada, con búsqueda por texto y filtro por estado («Verificado» u «Observado»). Cada titulado muestra su carrera, código SIS, teléfono, correo, fechas de ingreso, titulación y revisión, duración de estudio y la observación, si la tiene.
4. **Exportación:**
   - `GET /reports/graduates/pdf`: PDF institucional en A4 con el logo, la carrera y la fecha, y una tabla con «Nro», «Nombre completo / Carrera», «Código SIS», «Teléfono», «Correo electrónico», «Ingreso», «Titulación», «Duración», «Revisión» y «Estado».
   - `GET /reports/graduates/csv`: CSV en UTF-8 (se abre bien en Excel) que neutraliza los valores que empiezan con `=`, `+`, `-` o `@`, para que no se ejecuten como fórmulas.
   - Las dos exportaciones usan el mismo filtro de la lista, tienen un máximo de 10 000 filas y un límite de 5 descargas por minuto por usuario (`ReportExportGuard`).
5. Todas las consultas pasan por `reportScope`, igual que en el Sprint 3.

## Sprint 2 · Encuesta de empleabilidad (US-2.6)

**Qué pidió la PO:** un formulario de seguimiento laboral del titulado que guarde en la base de datos su condición laboral, cargo, salario y tiempo de inserción laboral.

**Cómo funciona:**
1. La pantalla `/surveys` (solo titulados) pregunta primero la condición laboral: «Trabaja» o «No trabaja».
2. Si trabaja, muestra cargo, empresa, área, modalidad (Presencial, Remoto o Híbrido), rango de salario mensual y tiempo de inserción en meses, con una barra de progreso. Si cambia a «No trabaja», avisa que se descartan los datos laborales.
3. **Borrador:** las respuestas se guardan en el navegador en cada cambio, con una clave por usuario (`umsspira:survey-draft:<usuario>`), y se recuperan si vuelve a la página.
4. **Envío:** antes de enviar se muestra un resumen para revisar. `POST /surveys` guarda en `respuesta_encuesta` una sola respuesta por titulado y encuesta (clave única); si ya la envió, responde 409.
5. Después del envío, `GET /surveys/status` y `GET /surveys/me` muestran el resumen de lo que respondió.
6. El administrador ve las respuestas en `/reports/encuestas` con `GET /reports/surveys`. En el Sprint 3 ese reporte pasó a filtrar por carrera, calcular los totales en la base de datos y paginar el detalle.

