# Informe de la Épica 9 · Portal Admin UMSS, Encuestas & Analytics

**Universidad Mayor de San Simón** · Facultad de Ciencias y Tecnología · Ingeniería de Software · Proyecto UMSSPIRA

| Dato | Detalle |
|---|---|
| Épica | 9 · Portal Admin UMSS, Encuestas & Analytics |
| Grupo | Grupo 5 (en los documentos de la PO, «Equipo 9») |
| Periodo | Sprint 1 al Sprint 3 (28/09/2026 al 25/11/2026) |
| Fecha de corte | 24/11/2026 |
| Base de código revisada | `origin/epic9`, commit `7bc42f45` (el mismo contenido que se entregó a `dev` con el PR #952). Los cambios que otros grupos hicieron después en `dev` sobre archivos de la épica se señalan en la sección 6.5 |
| Elaborado por | Juan Carlos Anagua Kahuana, Git Lead del Sprint 3 |
| Documentos relacionados | [RutasFrontend.md](RutasFrontend.md) y [RutasBackend.md](RutasBackend.md) |

## Contenido

1. Propósito del informe
2. La épica y el equipo
3. Sprint 1 · Reportería base institucional
4. Sprint 2 · Encuesta de empleabilidad
5. Sprint 3 · Tablero de acreditación y mapas de calor
6. Deuda técnica de la épica 5
7. Resumen de resultados
8. Conclusiones
9. Pendientes

## 1. Propósito del informe

Este informe responde a lo que pidió DevOps para cada épica: qué pidió la PO, cómo lo implementó el equipo hasta el último sprint y qué situaciones no se esperaban. Cubre los tres sprints del proyecto y la deuda técnica de la épica 5 que se asignó a la épica 9 en el último sprint.

Lo que aquí se describe se verificó contra el código de `epic9` y contra los PR fusionados en GitHub (`umsspira/UMSSPIRA`), no de memoria.

## 2. La épica y el equipo

La épica 9 construye la parte administrativa del portal de titulados de la UMSS: los reportes que el Administrador de Carrera necesita para la acreditación y la encuesta de empleabilidad que responden los titulados. Según la planificación de la PO, tiene una historia macro por sprint:

| Sprint | Historia macro de la PO | Criterio de aceptación macro |
|---|---|---|
| 1 | US-1.9 Módulo de reportería base institucional | Exportar el listado de titulados aprobados y observados en CSV y PDF |
| 2 | US-2.6 Formulario dinámico de seguimiento laboral | Guardar en la base de datos el salario, el cargo y el tiempo de inserción laboral |
| 3 | US-3.3 Dashboards institucionales y mapas de calor | Tablero de acreditación por cohorte, con mapa de calor de competencias y exportación |

**Integrantes:** Tais Gemio Escobar, Alex Cristian Saavedra Veliz, Natalie Saravia Camacho, Nicole Nayzeth Flores Escalera, Diego Alejandro Montaño Quispe, José Armando Quisbert Medrano, Juan Carlos Anagua Kahuana, Dadier Cadima Pozo, Anelis Melani Cordova Nigoevic y Miguel Angel Vargas Mercado. Desde el 17/11/2026 se sumó Paul Rodrigo Larico Viscarra, de la épica 5.

**Git Lead por sprint:** Alex Saavedra (Sprint 1), Diego Montaño (Sprint 2) y Juan Carlos Anagua (Sprint 3).

**Forma de trabajo:** cada HU o task tuvo su rama desde `epic9` (`feat/G5-…`) y su PR hacia `epic9`, revisado por el Git Lead y con la CI en verde (lint, pruebas y build). Al cierre de cada etapa, el Git Lead abrió el PR de `epic9` a `dev` para el despliegue que revisan los QA.

## 3. Sprint 1 · Reportería base institucional (28/09 al 17/10)

### 3.1 Lo que pidió la PO

La PO pidió que el Administrador de Carrera pudiera consultar los titulados que se registraron en su carrera, ver su estado de verificación y exportar el listado en CSV y en PDF, para usarlo en los informes de acreditación.

### 3.2 Planificación

El equipo dividió la historia en 5 HU de 3 SP cada una (15 SP), trabajadas por parejas.

| HU | Título | Responsables |
|---|---|---|
| US-1.9.1 | Visualización del dashboard y tabla base de titulados | Tais Gemio y Alex Saavedra |
| US-1.9.2 | Filtrado por texto predictivo y por estado | Natalie Saravia y Nicole Flores |
| US-1.9.3 | Reporte de titulados verificados y observados | Diego Montaño y José Quisbert |
| US-1.9.4 | Exportación del reporte en PDF | Juan Carlos Anagua y Dadier Cadima |
| US-1.9.5 | Exportación de la nómina en CSV | Anelis Cordova y Miguel Vargas |

### 3.3 Lo que se implementó

Todo el sprint quedó en una sola pantalla, **Reportes Institucionales** (`/reports`), con dos pestañas.

- **Dashboard (US-1.9.1).** Cuatro tarjetas con los titulados registrados, verificados, observados y los mentores activos, calculadas solo con las carreras del administrador (`GET /reports/metrics`).
- **Lista de titulados (US-1.9.1 y US-1.9.3).** Una tabla con número de registro, nombre, código SIS, teléfono, correo, fechas de ingreso, titulación y revisión, duración de estudio, motivo de rechazo y estado, paginada de 10 en 10. En los observados, «Ver motivo» abre un modal con el dictamen y el motivo registrado. En el celular, cada titulado se muestra como una tarjeta que se despliega. Si no hay registros, se muestra un mensaje en lugar de una tabla vacía.
- **Filtros (US-1.9.2).** Búsqueda predictiva por nombre o código SIS, hasta 60 caracteres y sin distinguir tildes ni mayúsculas, combinable con el filtro «Todos», «Verificados» u «Observados». Un botón restablece los filtros.
- **Exportación en PDF (US-1.9.4).** El administrador elige «Exportar» → «PDF» y ve una vista previa con páginas, «Imprimir», «Descargar» y «Cerrar». El documento es A4 horizontal, con el escudo y el nombre de la UMSS, «Registro de titulados» con la carrera, el estado, el total, la fecha de generación y la tabla, que repite sus títulos en cada hoja y numera «Página N de M». Mientras se genera, el botón dice «Generando…». Con «Todos», la opción PDF queda deshabilitada y pide «Seleccione Verificados u Observados».
- **Exportación en CSV (US-1.9.5).** Confirma cuántos registros se van a exportar, muestra el progreso y descarga un CSV en UTF-8 que se abre bien en Excel. Para que una celda no se ejecute como fórmula, neutraliza los valores que empiezan con `=`, `+`, `-` o `@`.

Las dos exportaciones aplican el mismo filtro de la lista, tienen un máximo de 10 000 filas y permiten 5 descargas por minuto por usuario.

### 3.4 Integración y despliegue

El Git Lead unió las cinco HU en la vista `/reports` (PR #99) y dejó un solo conjunto de datos para las tarjetas, la tabla, el PDF y el CSV (PR #186). El sprint llegó a `dev` con los PR #188 (10/10) y #288 (16/10). En total se fusionaron 25 PR en `epic9`.

### 3.5 Situaciones no previstas

- **Cada HU había creado sus propios datos de prueba.** Las tarjetas, la tabla y el PDF mostraban titulados distintos. Se unificaron en 90 titulados, iguales y en el mismo orden en toda la pantalla (PR #119 y #186). En esos datos también había fechas de revisión imposibles y duraciones que no coincidían con las fechas; se corrigieron con la autorización del Git Lead.
- **La API desplegada dejó de actualizarse desde el 09/10.** Se caía al arrancar porque le faltaban variables que otras épicas habían vuelto obligatorias (correo, OTP, JWT y conexión a la base de datos). El equipo encontró la causa reproduciéndola en local y DevOps la redesplegó el 12/10.
- **El PDF respondía «Falta el careerId» en el despliegue,** porque allí el backend dejaba de usar los datos de prueba. Se corrigió en el PR #221.
- **La lista desplegada mostraba solo 10 de los 90 titulados.** La validación global del backend descartaba los parámetros de página y filtro. Se corrigió en el PR #269.
- **Observaciones del QA:** el botón no mostraba «Generando…» y con «Todos» se exportaban los verificados sin avisar (PR #271). Además, las HU estaban escritas con «egresados», mientras que el sistema usa «titulados».

### 3.6 Resultado

Las 5 HU se entregaron y se desplegaron. El criterio macro de la PO se cumplió: el administrador exporta en PDF y en CSV los titulados verificados y observados de su carrera.

## 4. Sprint 2 · Encuesta de empleabilidad (19/10 al 05/11)

### 4.1 Lo que pidió la PO

La PO pidió un formulario de seguimiento laboral para el titulado que mostrara solo las preguntas que corresponden a su situación y que guardara en la base de datos el salario, el cargo y el tiempo de inserción laboral.

### 4.2 Planificación

Al principio se definieron 5 HU, una por campo. Como eran demasiado pequeñas, entre el 19 y el 20/10 se unificaron en 4 HU (16 SP), divididas en 18 tasks (37 puntos de task), y se repartió por tasks.

| HU | Título | SP | Tasks y responsables |
|---|---|---|---|
| HU-001 | Condición laboral y formulario dinámico | 3 | T1.1 Natalie Saravia · T1.2 Anelis Cordova · T1.3 Natalie Saravia |
| HU-002 | Datos laborales, salario e inserción | 5 | T2.1 Alex Saavedra · T2.2 y T2.4 Juan Carlos Anagua · T2.3 Dadier Cadima · T2.5 Diego Montaño |
| HU-003 | Envío y guardado en la base de datos | 5 | T3.1 y T3.6 Tais Gemio · T3.2 Nicole Flores · T3.3 y T3.5 José Quisbert · T3.4 Anelis Cordova |
| HU-004 | Acceso del administrador e integración | 3 | T4.1 Miguel Vargas · T4.2 Alex Saavedra · T4.3 Diego Montaño (Git Lead) · T4.4 Dadier Cadima |

### 4.3 Lo que se implementó

La encuesta está en `/surveys`, solo para titulados.

- **Condición laboral (HU-001).** La encuesta empieza preguntando si el titulado trabaja. Con «Trabaja», aparecen las preguntas laborales sin recargar la página. Con «No trabaja», se ocultan, se descarta lo que se había escrito y se avisa «Las respuestas anteriores se descartaron». Lo que se va respondiendo queda guardado como borrador en el navegador y se recupera al volver; se borra al enviar o al cerrar sesión.
- **Datos laborales (HU-002).** Cargo, empresa y área, de hasta 100 caracteres y con al menos dos letras; modalidad «Presencial», «Remoto» o «Híbrido»; salario mensual en un solo rango, de 0–2.999 a 12.001–21.000 Bs; y tiempo de inserción en meses, que solo acepta números. Debajo se muestra la nota «Esta información es confidencial y sólo se usará con fines estadísticos». Una barra indica el porcentaje completado y, antes de enviar, un modal muestra el resumen con la opción de volver a editar.
- **Envío (HU-003).** El backend valida otra vez las respuestas, rechaza los datos laborales si el titulado no trabaja y guarda una sola respuesta por titulado y encuesta (tabla `respuesta_encuesta`), con la fecha y hora de envío, dentro de una transacción. Un segundo envío no se duplica. Si el envío falla, aparece «No se pudo enviar la encuesta. Intente nuevamente» y las respuestas se quedan en pantalla. Sin conexión, el envío se desactiva. Al volver a entrar, el titulado ve el resumen de lo que respondió.
- **Acceso e integración (HU-004).** Un visitante es llevado al inicio de sesión y un titulado no puede entrar a los reportes. El administrador ve en la barra de navegación «Reportes Institucionales» y «Encuestas de Empleabilidad»; en esta última consulta las respuestas (`/reports/encuestas`). Si la sesión vence, el sistema avisa y vuelve al inicio de sesión; si el servidor no responde, aparece un aviso en lugar de una pantalla en blanco.

### 4.4 Integración y despliegue

El sprint llegó a `dev` con los PR #496 (25/10), #593 (30/10), #646 y #660 (04/11). En total se fusionaron 36 PR en `epic9`, incluidas las correcciones del QA.

### 4.5 Situaciones no previstas

- **El 20/10 DevOps cambió la arquitectura de `dev`** a módulos hexagonales, con Zod para validar, Prisma para la base de datos y sin datos de prueba en el código. El equipo corrigió sus tasks para alinearse a esa base antes de programar.
- **Las columnas de la respuesta se habían agregado a la tabla de la encuesta,** que no sabe qué titulado responde. Se creó la tabla `respuesta_encuesta`, con una clave única por titulado y encuesta (PR #505).
- **El tiempo de inserción estaba en rangos en una HU y en meses en el mock-up.** Se siguió el documento que se presentó al QA: meses.
- **El 28/10 el despliegue no tenía las rutas de la encuesta,** porque `epic9` no había entrado a `dev` desde el 25/10. Se resolvió con el PR #593.
- **Un cambio dejó la encuesta siempre bloqueada** (PR #629). Se corrigió con el PR #636.
- **Correcciones del QA:** #580 y #622 (HU-001), #582, #630 y #639 (HU-002), #636, #656 y #658 (HU-003), y #584 y #628 (HU-004).

### 4.6 Resultado

Las 4 HU se entregaron. El criterio macro se cumplió: el salario, el cargo y el tiempo de inserción quedan guardados en la base de datos.

Al cierre, la PO pidió proponer mejoras. El 05/11 el equipo revisó el código de `epic9` y propuso 13 mejoras de seguridad, calidad de los datos y deuda técnica. La PO aprobó las de la épica, que entraron al Sprint 3.

## 5. Sprint 3 · Tablero de acreditación y mapas de calor (06/11 al 25/11)

### 5.1 Lo que pidió la PO

La PO pidió un tablero institucional para la acreditación de la carrera: indicadores de empleabilidad, empleabilidad por cohorte, un mapa de calor de competencias, filtros, exportación del reporte y encuestas publicadas por cada carrera.

### 5.2 Planificación

El sprint tuvo 6 HU (37 SP) y 24 tasks entre 10 desarrolladores. La PO aprobó las HU el 11/11. Varias tasks aplican mejoras propuestas al cierre del Sprint 2.

| HU | Título | SP | Tasks y responsables |
|---|---|---|---|
| HU-001 | Tablero de empleabilidad | 8 | T1.1 Tais Gemio · T1.2, T1.7 y T1.9 José Quisbert · T1.3 Natalie Saravia · T1.4 Anelis Cordova · T1.5 Alex Saavedra · T1.6 Nicole Flores · T1.8 Dadier Cadima |
| HU-002 | Mapa de calor de competencias | 8 | T2.1 Diego Montaño · T2.2 y T2.3 Miguel Vargas |
| HU-003 | Filtros por cohorte y semestre | 3 | T3.1 Alex Saavedra · T3.2 Dadier Cadima |
| HU-004 | Exportación del reporte ejecutivo | 8 | T4.1 y T4.4 Juan Carlos Anagua · T4.2 Nicole Flores · T4.3 Dadier Cadima |
| HU-005 | Publicación de encuestas por carrera | 5 | T5.1 Diego Montaño · T5.2 y T5.4 Alex Saavedra · T5.3 Natalie Saravia |
| HU-006 | Corrección única de la encuesta | 5 | T6.1 Tais Gemio · T6.2 Anelis Cordova |

### 5.3 Lo que se implementó

El tablero está en `/reports/acreditacion` y la gestión de encuestas en `/reports/encuestas/gestion`.

- **Tablero de empleabilidad (HU-001).** Muestra el total de respuestas, el porcentaje de titulados que trabajan, el tiempo promedio de inserción, la cantidad de titulados por rango de salario y un gráfico de empleabilidad por cohorte (año de titulación). Usa la encuesta más reciente de la carrera que tenga respuestas. Para no mostrar cifras de grupos muy pequeños, una cohorte con 1 a 4 respuestas no muestra cifras: dice «Sin datos suficientes». Los indicadores se guardan 5 minutos en caché (Redis) y la caché se renueva cuando un titulado envía su encuesta. Con esta HU también entraron mejoras: la validación completa de la encuesta en el backend, la integridad de las respuestas en la base de datos y el reporte de encuestas por carrera y paginado.
- **Mapa de calor (HU-002).** Cruza las cohortes con las 6 áreas técnicas, usando el último cálculo del radar de afinidad de cada titulado. El color va en 5 tramos de 20 %, con leyenda. Al pasar el puntero indica sobre cuántos titulados se calculó, muestra la fecha de la última actualización y tiene un botón para actualizar. Las celdas con 1 a 4 titulados también dicen «Sin datos suficientes».
- **Filtros (HU-003).** «Cohorte» filtra los indicadores, el gráfico y el mapa. «Semestre» se calcula con la fecha de envío de la encuesta y filtra los indicadores y el gráfico, pero no el mapa, y la pantalla lo aclara. El filtro queda en la dirección de la página (por ejemplo, `?cohorte=2023&semestre=1-2026`), así que se mantiene al recargar. Si no hay datos para la combinación elegida, se muestra «No hay información para el periodo seleccionado».
- **Exportación (HU-004).** El tablero se exporta en PDF (A4, con la carrera, el periodo, los indicadores, el gráfico y el mapa de calor con los mismos colores de la pantalla) y en Excel, con tres hojas: «Indicadores», «Empleabilidad por cohorte» y «Mapa de calor». Las dos exportaciones usan los mismos datos y filtros del tablero, y solo la carrera del administrador.
- **Publicación de encuestas (HU-005).** El administrador crea encuestas en borrador, las edita mientras están en borrador y las publica o despublica. Solo puede haber una encuesta publicada y vigente por carrera; si ya existe, el sistema lo avisa. El titulado solo ve la encuesta publicada y vigente de su carrera y, si no hay ninguna, se le informa «No hay una encuesta disponible por el momento».
- **Corrección única (HU-006).** Después de enviar, el titulado puede corregir sus respuestas una sola vez, mientras la encuesta siga vigente. El formulario se abre con lo que había enviado y avisa «Solo puede editar esta encuesta una vez». Al guardar, el sistema marca la edición como usada y no permite otra.

### 5.4 Integración y despliegue

Como Git Lead del sprint, Juan Carlos Anagua preparó las rutas y ramas de cada task, revisó cada PR contra sus criterios de aceptación y lo fusionó en `epic9`. El sprint llegó a `dev` con los PR #815 (15/11) y #952 (21/11). Se fusionaron 27 PR del sprint en `epic9`, entre ellos las correcciones #750 (porcentajes del gráfico), #914 (observaciones del QA del tablero) y #927 (corrección única).

### 5.5 Situaciones no previstas

- **Una prueba de la épica de eventos con una fecha fija ya vencida** hacía fallar la CI de todos los PR. Se actualizó la fecha en `epic9` (PR #740) y la épica 7 hizo lo mismo en `dev`.
- **Las opciones de los filtros se reducían a la opción elegida.** Se corrigió calculándolas antes de aplicar el filtro.
- **La caché de indicadores se había hecho en una carpeta compartida protegida.** Se movió al módulo de reportes de la épica.
- **Los datos de prueba del radar salían todos entre 92 % y 100 %,** en un solo color. Se ajustaron para que el mapa muestre los 5 tramos.
- **En el despliegue no había datos suficientes para el mapa de calor ni cuentas de una segunda carrera.** El DevOps de base de datos cargó datos de prueba el 17/11.
- **La cuenta de demostración del administrador tiene dos carreras asignadas,** así que su tablero suma las dos. Para probar que solo se ve una carrera se usa la cuenta del administrador de Informática.
- **El mapa de calor depende del radar de afinidad de la épica 3.** El 24/11 el recálculo del radar respondía con error en el despliegue, así que los titulados no generaban cálculos nuevos.

### 5.6 Resultado

Las 6 HU y sus 24 tasks se fusionaron y se desplegaron, incluido el Excel y la corrección única, que se terminaron después del primer despliegue.

## 6. Deuda técnica de la épica 5 (17/11 al 21/11)

### 6.1 Lo que pidió la PO

El 17/11/2026 la PO disolvió la épica 5 y repartió sus HU pendientes entre las demás épicas. A la épica 9 le tocaron la **HU-16, Privacidad del titulado y CV** (3 pts), y la **HU-20, Documentación y demo a la PO** (2 pts). También se sumó Paul Larico, de la épica 5.

### 6.2 Planificación

| HU | Tasks y responsables |
|---|---|
| HU-16 | T16.1 política de datos del postulante, Paul Larico · T16.2 endpoint y migración del CV, Diego Montaño · T16.3 sección del CV en el perfil, Natalie Saravia · T16.4 descarga del CV para la empresa, Dadier Cadima |
| HU-20 | T20.1 ventana «¿Cómo se calcula?», Dadier Cadima · T20.2 página de ayuda, Paul Larico · T20.3 documentación, Alex Saavedra · T20.4 demo y acta, Juan Carlos Anagua |

### 6.3 Lo que se implementó

- **CV del titulado (HU-16).** En su perfil, el titulado sube o reemplaza su CV, que tiene que ser un PDF real: el sistema revisa el contenido del archivo, no solo su nombre. El límite que entregó la épica es de 5 MB (en `dev` hoy es de 4 MB; ver 6.5). Puede descargarlo y ver qué datos suyos ve la empresa. La empresa descarga el CV de los postulantes de sus vacantes y ve solo los datos que permite la política de privacidad definida en la T16.1 (`docs/epic5/politica-datos-postulante.md`).
- **Ayuda (HU-20, T20.1 y T20.2).** La página `/ayuda/bolsa-de-trabajo` explica la bolsa de trabajo, con una pestaña para el titulado y otra para la empresa. En cada vacante, la ventana «¿Cómo se calcula?» explica la afinidad: (requisitos exactos × 1 + requisitos parciales × 0,5) ÷ total de requisitos × 100.
- **Documentación (HU-20, T20.3).** Las 12 HU pendientes de la épica 5 quedaron registradas para la PO en `docs/epic5/historias-epica-5.md`, con su reparto entre los grupos (PR #936).
- **Demo y acta (HU-20, T20.4).** Pendiente a la fecha de corte; no lleva código.

### 6.4 Integración y despliegue

Se fusionaron 8 PR en `epic9`: #925 (T16.2), #928 (T16.1), #935 (T16.3), #923 (T16.4), #939 y #948 (T20.1), #934 (T20.2) y #936 (T20.3). Para no chocar con lo que otras épicas subían a `dev`, se integró `dev` en `epic9` tres veces (#943, #951 y #955) y se entregó todo con el PR #952 del 21/11.

### 6.5 Situaciones no previstas

- **La ventana «¿Cómo se calcula?» chocaba con la HU-10,** que otra épica había integrado en el mismo detalle de la vacante. Se corrigió en el PR #948 antes de la entrega.
- **El despliegue corta los archivos de más de unos 4,5 MB,** porque el portal pasa las peticiones por una función de Vercel con ese límite. Se informó a DevOps.
- **Otro grupo cambió en `dev` archivos de la deuda después de nuestra entrega.** El 23/11, la rama `fix/G7-correcciones-perfil` (PR #977 a `epic2`, que llegó a `dev` con el PR #978) bajó el límite del CV de 5 a 4 MB por el límite de Vercel y cambió las etiquetas de «¿Cómo se calcula?» a «Exacta», «Similar» y «No encontrada». `epic9` todavía tiene la versión anterior.
- **Una HU de la épica 7 recarga el detalle de la vacante cada 30 segundos.** Eso reinicia el cálculo de afinidad y cierra la ventana «¿Cómo se calcula?». Se le informó a su Git Lead el 24/11; el arreglo le corresponde a ellos.
- **La demo dependía de los datos de prueba de la HU-19 (épica 8).** Su primer PR a `dev` (#965) se cerró sin fusionar; los datos llegaron a `dev` recién con el PR #973 (21/11), después de nuestra entrega. Por eso se preparó la demo creando los datos en vivo.

### 6.6 Resultado

La HU-16 se entregó y se desplegó. De la HU-20 se entregaron y desplegaron tres de sus cuatro tasks; queda la demo y el acta ante la PO (T20.4).

## 7. Resumen de resultados

| Etapa | HU comprometidas | HU entregadas | SP | PR fusionados en `epic9` | Entregas a `dev` |
|---|---|---|---|---|---|
| Sprint 1 | 5 | 5 | 15 | 25 | #188 y #288 |
| Sprint 2 | 4 | 4 | 16 | 36 | #496, #593, #646 y #660 |
| Sprint 3 | 6 | 6 | 37 | 27 | #815 y #952 |
| Deuda de la épica 5 | 2 | 1 completa y la HU-20 con 3 de 4 tasks (falta la T20.4) | 5 | 8, más 3 integraciones de `dev` | #952 |

## 8. Conclusiones

1. La épica cumplió las tres historias macro de la PO. El administrador tiene reportes exportables de sus titulados, los titulados tienen una encuesta de empleabilidad que guarda sus datos laborales, y la carrera tiene un tablero de acreditación con mapa de calor, filtros y exportación en PDF y Excel.
2. La separación por carrera se resolvió en el backend, no solo en la pantalla: ningún administrador puede consultar otra carrera aunque modifique la petición.
3. Los problemas más costosos no fueron de código, sino de integración: datos de prueba distintos por HU, variables faltantes en el despliegue, cambios de arquitectura en `dev` y pruebas de otras épicas que tumbaban la CI. Desde el Sprint 2, el equipo integró `epic9` con `dev` con más frecuencia para detectarlos antes.
4. La revisión del código al cierre del Sprint 2 dio buenos resultados: las mejoras que salieron de ella (validación en el backend, reporte por carrera, integridad de los datos y corrección única) se incorporaron al Sprint 3.

## 9. Pendientes

- Hacer la demo de la HU-20 ante la PO y registrar el acta (T20.4).
- Integrar `dev` en `epic9` para traer el límite de 4 MB del CV y las etiquetas nuevas de «¿Cómo se calcula?» que otro grupo cambió en `dev`.
- Agregar a las colecciones de prueba (`postman/` y `bruno/`) los endpoints del Sprint 3 que todavía no tienen petición: `/reports/accreditation`, `/reports/accreditation/heatmap`, `/reports/accreditation/xlsx`, los cinco de `/surveys/admin` y `PATCH /surveys/me`.
- Que la épica 7 corrija la recarga automática del detalle de la vacante.
- Que la épica 3 resuelva el error del recálculo del radar en el despliegue, del que depende el mapa de calor.
