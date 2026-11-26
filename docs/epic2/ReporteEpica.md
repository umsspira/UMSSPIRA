# Reporte de la Épica 2 · Perfil de Egresado (Equipo 7)

Corte: rama `epic2` al 24/11/2026, commit `d423862b`, comparada contra `dev` (commit `71e03588`, 24/11/2026). `epic2` no tiene commits que `dev` no tenga: todo lo de esta épica ya está fusionado en `dev`.
Tamaño de lo fusionado en el Sprint 3: PR #774 con 229 commits y 296 archivos, y PR #776 con 167 commits. Después se sumaron las rondas de corrección (#945, #947, #977, #978 y #979).

Este reporte cubre los tres sprints del Equipo 7: Sprint 1 (perfil base), Sprint 2 (perfil conectado a datos reales y al radar de afinidad) y Sprint 3 (mejoras de uso y corrección de errores). Hoy están completos los tres sprints.

## 1. Objetivo

Que el titulado arme y administre su perfil profesional y que ese perfil alimente la afinidad del radar. Sprint 1: completar, ver, editar, eliminar y descargar el perfil con formación académica, experiencia laboral y certificaciones. Sprint 2: guardarlo de verdad, con descripción profesional, completitud, visor de respaldo y camino a «Mi afinidad». Sprint 3: hacerlo más fácil de usar (navegación, borradores, foto, proyectos y vista embebida), aceptar respaldos en PDF y corregir los errores de QA y de la revisión de compañeros.

## 2. Estado por historia y responsables

Responsables según el reparto de cada sprint (por parejas). No hay horario asignado por historia en los Sprints 1 y 2.

### Sprint 1 (28 de septiembre al 16 de octubre de 2026 · 29 puntos)

| HU | Historia | Pts | Responsables | Estado en `epic2` | PR |
|---|---|---|---|---|---|
| HU-01 | Completar formulario de perfil | 5 | Francisco Lazarte y Darlin Almanza | Fusionada | Pantallas: #64 (integra #25). API: #162 |
| HU-02 | Validar entradas del formulario | 3 | Rodrigo Mamani y Ronald Escobar | Fusionada | Pantallas: #64 (integra #26). API: #162. Validaciones de la web: #80 (cerrado sin fusionar; llegaron con las correcciones de QA) |
| HU-03 | Visualización del perfil | 5 | Gabriel Torrico y Jheyco Padilla | Fusionada | Pantallas: #64 (integra #56). API: #162 |
| HU-04 | Administrar perfil (editar y eliminar) | 8 | Gael Villarroel y Mayra Arias | Fusionada | Pantallas: #64. API: #162 |
| HU-05 | Exportar el perfil en JSON | 8 | Jhosias Daza y Santiago Piscoya | Fusionada | Pantallas: #64. API: #162 (integra #126, cerrado sin fusionar) |

Correcciones de QA del Sprint 1: PR #307 (cerrado sin fusionar; sus cambios llegaron a `epic2` dentro de la rama base de la HU-06, PR #489 y #493).

### Sprint 2 (semanas 4 a 6 · 34 puntos)

| HU | Historia | Pts | Responsables | Estado en `epic2` | PR |
|---|---|---|---|---|---|
| HU-06 | Descripción profesional y completitud del perfil (en Taiga: Integración del perfil con el Radar) | 8 | Jhosias Daza y Santiago Piscoya | Fusionada | #489 y #493 |
| HU-07 | Resumen del perfil con la tarjeta «Mi afinidad» | 5 | Gael Villarroel y Mayra Arias | Fusionada | #493 (rama de la HU-06) |
| HU-08 | Completar perfil con guardado real | 8 | Darlin Almanza y Francisco Lazarte | Fusionada | #457 |
| HU-09 | Mis registros y edición | 8 | Jheyco Padilla y Gabriel Torrico | Fusionada | #493 (rama de la HU-06) |
| HU-10 | Visor de respaldo | 5 | Rodrigo Mamani y Ronald Escobar | Fusionada | #493 (rama de la HU-06) |

Seguimiento del Sprint 2: #648 (perfil con datos reales) y #653 (contador de errores y carga de Completar perfil), ambos del 4 de noviembre. Las 5 historias y sus 33 tareas se cerraron en Taiga el 11 de noviembre, con 34 de 34 puntos.

### Sprint 3 (11 al 28 de noviembre de 2026 · 53 puntos)

Desarrollo del 11 al 13 de noviembre. Las 11 historias se integraron en una sola rama (`feat/G7-HU20-vistaEmbebida`), y de ahí llegaron a `epic2` y a `dev`.

| HU | Historia | Pts | Responsable | Estado en `dev` | PR |
|---|---|---|---|---|---|
| HU-11 | Navegación clara y botones de volver | 5 | Ronald Escobar | Fusionada | #774, #776 |
| HU-12 | Perfil vacío lleva a Completar perfil | 3 | Jhosias Daza | Fusionada | #774, #776 |
| HU-13 | Agregar registros con borradores | 5 | Gabriel Torrico | Fusionada | #774, #776 |
| HU-14 | Borradores incompletos y conservación en el navegador | 5 | Jheyco Padilla | Fusionada | #774, #776 |
| HU-15 | Mis registros más agradable y con estados vacíos | 5 | Gael Villarroel | Fusionada | #774, #776 |
| HU-16 | Foto de perfil del egresado | 5 | Francisco Lazarte | Fusionada | #774, #776 |
| HU-17 | Mini radar en la tarjeta «Mi afinidad» | 5 | Darlin Almanza | Fusionada | #716 (cerrado sin fusionar, llegó dentro del #774), #776 |
| HU-18 | Cambiar el respaldo al guardar y respaldos en PDF | 5 | Rodrigo Mamani | Fusionada | #774, #776 |
| HU-19 | Proyectos y portafolio | 5 | Mayra Arias | Fusionada | #774, #776 |
| HU-20 | Vista embebida de proyecto | 5 | Jhosias Daza | Fusionada | #774, #776 |
| HU-21 | Ajustes de la revisión de compañeros | 5 | Santiago Piscoya | Fusionada | #774, #776 |
| HU-11 (Épica 5) | Similitud avanzada del motor de afinidad (historia heredada de la Épica 5) | 5 | Eddy Andrewzzyx Morales | Fusionada | Sin PR propio: su rama se integró en otra y esa rama hizo el PR de integración |

Los responsables son los asignados en Taiga. Los puntos suman 53 sin contar la historia heredada de la Épica 5.

**PR de integración del Sprint 3**

| PR | Fecha | De → a | Qué llevó |
|---|---|---|---|
| #774 | 14/11 | `feat/G7-HU20-vistaEmbebida` → `epic2` | Las HU-11 a HU-21 integradas (229 commits, 296 archivos) |
| #776 | 14/11 (fusionado el 15/11) | `epic2` → `dev` | El Sprint 3 a `dev` (167 commits, sin conflictos) |
| #846 | 15/11 | `feat/G7-HU20-vistaEmbebida` → `epic2` | Resolución de conflictos con `dev` |
| #945 | 21/11 | `fix/G7-correcciones-perfil` → `epic2` | Primera ronda de corrección de errores de QA y de las historias |
| #947 | 21/11 | `epic2` → `dev` | Primera ronda de correcciones a `dev` |
| #959, #975, #976 | 21 y 22/11 | `fix/G7-correcciones-perfil` → `epic3` | Correcciones llevadas a la rama de la Épica 3 para la prueba conjunta del radar (el #976 adapta una prueba de vacantes) |
| #977 | 23/11 | `fix/G7-correcciones-perfil` → `epic2` | Segunda ronda de correcciones |
| #979 | 24/11 | `fix/G7-correcciones-perfil` → `epic2` | Foto de perfil restaurada y ajustes de la HU-11 de la Épica 5 |
| #978 | 23/11 (fusionado el 24/11) | `epic2` → `dev` | Las correcciones de las últimas rondas a `dev`, incluido el #979 |

Nota: el estado y los PR salen del corte del repositorio indicado arriba. Si alguna historia se fusiona después de ese corte, actualizar la fila.

## 3. Qué se implementó

### Sprint 1 · Perfil base (28 de septiembre al 16 de octubre)

Las pantallas se hicieron primero con datos de prueba (PR #64) y después se conectaron a la API (PR #162).

- **HU-01 · Completar formulario.** Pantalla `/profile/completar` con tres secciones en acordeón (Formación académica, Experiencia laboral y Certificaciones) y barra de progreso «X de 3 secciones completas». En experiencia, el periodo en texto se reemplazó por fecha de inicio y fecha de fin, y «Actualmente trabajo aquí» deshabilita la fecha de fin. Las experiencias se ordenan de la más reciente a la más antigua. En certificaciones se adjunta el respaldo. API: `POST` de formación académica, experiencia laboral y certificaciones, y `POST` del respaldo.
- **HU-02 · Validaciones.** Errores junto a cada campo y reglas en la web y en la API: campos obligatorios, año de egreso y de emisión no futuros, fecha de fin no anterior a la de inicio y archivo de respaldo con formato y tamaño válidos, verificado por su contenido. Una formación con la misma institución, título y año responde 409 con «La formación académica ya se encuentra registrada».
- **HU-03 · Visualización.** Pantalla `/profile` con las tres secciones en solo lectura, ordenadas de la más reciente a la más antigua y con «Sin registros» en las vacías. API: `GET /perfil`, con índices por titulado para que el resumen cargue en menos de 2 segundos.
- **HU-04 · Administrar perfil.** Pantalla `/profile/records` con una tabla por sección, iconos de editar y eliminar, modal «¿Estás seguro de que deseas eliminar este registro?» y pantallas de edición de formación, experiencia y certificación. API: `GET`, `PUT` y `DELETE` de un registro, con 403 si el registro no es del titulado.
- **HU-05 · Exportar JSON.** Botón «Descargar» en el resumen, desactivado si las tres secciones están vacías. API: `GET /perfil/exportar-json`, con sangría de 2 espacios y nombre `perfil_[nombre]_[fecha].json`. Se hizo una colección de Postman para probar la exportación con datos, sin datos y sin sesión.
- **Conexión con la base de datos.** El PR #162 conectó el módulo a Supabase (52 pruebas), con las migraciones `0002` a `0006` (tabla `titulado`, `grado`, claves únicas, seguridad por filas y el almacenamiento de respaldos).
- **Conexión con el radar.** Tarjeta con el botón de afinidad en el resumen, que lleva a la ruta `/afinidad` de la Épica 3.
- **Corrección de errores de QA.** Tras la revisión de QA se corrigieron los 12 errores reportados sobre HU-02, HU-04 y HU-05 (rama `fix/G7-correccion-bugs-sprint1`): por ejemplo, el año de egreso futuro, la formación duplicada ignorando mayúsculas y espacios, la fecha de fin anterior al inicio, el tamaño del respaldo y las claves del JSON exportado.

### Sprint 2 · Perfil conectado y afinidad (semanas 4 a 6)

- **HU-06 · Descripción profesional y completitud.** Sección «Descripción profesional» en el resumen, con contador de caracteres, guardado con aviso de éxito y el texto conservado si falla. No puede quedar vacía y admite hasta 5000 caracteres. API: `GET` y `PUT /perfil/descripcion-profesional`, guardada en una fila por titulado. El resumen muestra el porcentaje de completitud del perfil y enlaza cada sección que falta a su formulario, con `returnTo=/profile`.
- **HU-07 · Resumen con «Mi afinidad».** El resumen ordena las secciones por recencia, muestra la descripción profesional, maneja los estados de carga y error, se adapta al celular y trae la tarjeta «Mi afinidad», que lleva a `/afinidad` de la Épica 3.
- **HU-08 · Completar perfil con guardado real.** Las certificaciones se guardan en la API con su respaldo: miniatura, nombre y tamaño del archivo con opción de quitarlo, y reintento del guardado sin duplicar registros. Los campos son obligatorios, con errores junto a cada uno, y aparece el aviso «certificación guardada» y el botón «Ver mi afinidad» con `returnTo`.
- **HU-09 · Mis registros y edición.** La lista de `/profile/records` carga con estados de carga y error. Editar y eliminar quedaron conectados a la API en las tres secciones, con aviso de resultado, y al editar una certificación se puede subir un nuevo respaldo JPG. La API responde 403 si se intenta editar o borrar un registro ajeno.
- **HU-10 · Visor de respaldo.** Ventana modal que se abre desde el resumen y desde la edición sin perder los cambios. Muestra «Cargando respaldo», el error con «Reintentar», un botón para descargar el JPG original y se cierra con la tecla Esc, con clic fuera del cuadro o con el botón. Se ajusta al celular y «Ver respaldo» no aparece si no hay respaldo. API: enlace temporal firmado de 5 minutos para el archivo, con 403 si el respaldo no es del titulado.
- **Seguimiento.** El PR #648 pasó el perfil a datos reales. El PR #653 cuenta los errores de campo en el encabezado de Certificaciones y espera la carga del perfil antes de habilitar «Completar perfil».

### Sprint 3 · Mejoras de uso y corrección de errores (11 al 28 de noviembre)

- **HU-11 · Navegación.** Botón «Volver» compartido en las pantallas del perfil y en «Mi afinidad», y camino directo desde «Mi afinidad» a «Mis registros». «Mi afinidad» conserva `returnTo=/afinidad` para regresar a donde estaba el usuario.
- **HU-12 · Perfil vacío.** Si el perfil está vacío, «Mi perfil profesional» y `/profile` llevan a Completar perfil, y se quitó el botón «Ver resumen». Solo redirige si la consulta del perfil terminó bien. En la ronda de corrección se arregló que «Guardar borrador» no guardaba nada.
- **HU-13 · Agregar registros.** Pantalla nueva, parecida a Completar perfil, con borradores en pantalla. «Guardar perfil profesional» guarda todos juntos, hace un solo recálculo del radar y no deja guardar si hay un borrador incompleto (un borrador incompleto por sección).
- **HU-14 · Borradores incompletos.** Los borradores y su foto se conservan en el navegador (IndexedDB) por usuario, con aviso de que son provisionales. En la ronda de corrección se arregló que se mezclaban entre usuarios del mismo navegador y ahora avisa si no puede guardarlos.
- **HU-15 · Mis registros.** Diseño más agradable, estados vacíos, animaciones y respeto a «reducir movimiento». En la ronda de corrección se arregló el modal de eliminar, que había perdido el fondo, y el botón del estado vacío, que ahora lleva a «Agregar registros». También se quitaron las etiquetas de respaldo en la pantalla Editar.
- **HU-16 · Foto de perfil.** El titulado sube su foto (solo JPG, hasta 5 MB) y se guarda en la API: `PUT` y `GET /perfil/foto`, en la tabla `titulado_foto` (migración `20261113000100_titulado_foto`). La foto aparece en el encabezado y en la sección de foto; si no hay foto, se muestran las iniciales del nombre. La subida se restauró en el PR #979.
- **HU-17 · Mini radar.** Mini radar en la tarjeta «Mi afinidad» del perfil, conectado a `GET /radar` de la Épica 3. Mientras llega el cálculo muestra «Actualizando tu afinidad…».
- **HU-18 · Respaldos.** Se puede cambiar el respaldo al guardar y subir PDF además de JPG. El visor de respaldos muestra PDF y JPG con enlace firmado. El límite real quedó en 4 MB para respaldos y CV por el tope de unos 4,5 MB del proxy de Vercel; el criterio original decía 5 MB.
- **HU-19 · Proyectos y portafolio.** Sección nueva de proyectos: formulario (nombre, enlace https, descripción y tecnologías), pestaña «Proyectos» en Mis registros, sección en el resumen y completitud del perfil con 5 secciones. API: `POST /perfil/proyectos` y ver, editar y eliminar por `/perfil/proyectos/:id`; `GET /perfil` ahora incluye los proyectos. La migración es `20261113000000_proyecto`. Los proyectos (nombre, descripción y tecnologías) son la quinta fuente de palabras clave del radar y no cuentan como respaldos.
- **HU-20 · Vista embebida.** Botón «Ver proyecto» que abre el enlace dentro del perfil, sin salir de la página. Solo acepta enlaces https y, si un sitio no deja mostrarse, se ve la tarjeta del proyecto con su enlace (la comprobación pasa por `/api/embed-check`).
- **HU-21 · Ajustes de la revisión de compañeros.** Tarjeta de completitud, zoom del visor y «Leer más», que aparece solo cuando el texto pasa de tres líneas. Se limitó a dos trabajos actuales en la web y en la API.
- **HU-11 de la Épica 5 · Similitud avanzada del motor de afinidad.** Historia heredada de la Épica 5, que se disolvió el 17 de noviembre. Los requisitos de una vacante pasan por el mismo procesamiento que el perfil (normalización, diccionario, alias y un stemmer liviano en español e inglés), así que «JS» cuenta como JavaScript y «Postgres» como PostgreSQL. Pesos: coincidencia exacta 100 %, parcial 50 % y sin coincidencia 0 %; las palabras genéricas («experiencia», «conocimiento», «desarrollo») no cuentan. El algoritmo tiene versión (`job-affinity-hu11-v2`) y un conjunto de calidad con un mínimo declarado de 90 % de acierto. La explicación para el PO está en `apps/api/docs/endpoints/epic5/HU11-similitud-avanzada.md` y en la ventana «Cómo se calcula» de la web.
- **Rondas de corrección (21 al 24 de noviembre).** Además de lo anotado en cada historia: el aviso cuando los borradores no se pueden guardar, los textos de ayuda de la afinidad, la nota de peso parcial en «Cómo se calcula» y el límite de 4 MB.

## 4. Lo que no se esperaba

Sprint 1:

1. **El backend cambió de arquitectura a mitad del sprint.** Las primeras validaciones se escribieron en un módulo `perfil` simple; `dev` lo reemplazó por `modules/profile`, con arquitectura hexagonal, Prisma y Zod. Las reglas del equipo (fecha mínima de la experiencia, nombres de las secciones del JSON) se pasaron al módulo nuevo.
2. **Los PR por pareja se integraron en uno solo.** Los PR individuales #25, #26 y #56 se cerraron y todo quedó integrado en el PR #64, para evitar conflictos entre ramas. Lo mismo pasó en la API: el #126 se cerró y quedó dentro del #162.
3. **El respaldo cambió de lugar.** El PR #162 lo subía a Supabase Storage; al pasar al módulo hexagonal de `dev`, el archivo quedó guardado en la base de datos con Prisma y lo sirve la API con sesión.
4. **El formato del respaldo se redujo a JPG.** El plan aceptaba también PDF; en el Sprint 1 quedó solo JPG hasta 5 MB.
5. **Criterios de aceptación que se contradecían.** Por ejemplo, un modal para «confirmar» un duplicado que igual se rechaza con 409; se resolvió con el 409 y el mensaje en pantalla.
6. **Las correcciones de QA no entraron por su PR.** El #307 se cerró sin fusionar y sus cambios llegaron a `epic2` dentro de la rama base de la HU-06.

Sprint 2:

1. **Cuatro historias salieron en un solo PR grande.** Las HU-07, HU-09 y HU-10 se integraron en la rama de la HU-06 y llegaron a `epic2` por los PR #489 y #493 (143 archivos en el último). Solo la HU-08 tuvo su propio PR (#457).
2. **El «enlace firmado» se replanteó.** Como en `dev` el respaldo vive en la base de datos y lo sirve la API, el enlace de la HU-10 se resolvió con una URL temporal firmada de 5 minutos, generada por la propia API.
3. **El título de la HU-06 no coincide.** En Taiga se llama «Integración del perfil con el Radar»; lo entregado por el equipo fue la descripción profesional y la completitud. El cálculo y el gráfico del radar son de la Épica 3, y el perfil solo enlaza a ellos.
4. **Otras personas corrigieron código del perfil.** Hubo arreglos de otros equipos en el recálculo del radar al eliminar registros y en los reintentos de certificaciones sin duplicados.

Sprint 3:

1. **Las 11 historias salieron en una sola rama.** Se integraron en `feat/G7-HU20-vistaEmbebida` y llegaron a `epic2` por el PR #774 (229 commits, 296 archivos). El PR #716 de la HU-17 se cerró sin fusionar y su contenido llegó dentro del #774.
2. **Se heredó una historia de otra épica.** El grupo de la Épica 5 se disolvió el 17 de noviembre y a este equipo le tocó la HU-11 de esa épica (similitud avanzada). Su rama no hizo un PR propio: se integró en otra rama, y esa rama hizo el PR.
3. **La foto de perfil se había retirado de `dev`.** Los criterios de la HU-16 la piden, así que se restauró en el API y en la web (PR #979). Falta que el PO confirme si se mantiene.
4. **El límite de archivos bajó de 5 a 4 MB.** El proxy de Vercel corta las peticiones de más de unos 4,5 MB, así que respaldos y CV quedaron en 4 MB. La foto sigue en 5 MB y solo JPG.
5. **Hubo varias rondas de corrección después de integrar.** Los errores de QA y de la revisión de compañeros se arreglaron entre el 21 y el 24 de noviembre (PR #945, #947, #977, #978 y #979). Tres PR (#959, #975 y #976) fueron a `epic3` para la prueba conjunta del radar.
6. **El Sprint 3 compartió trabajo con la Épica 3.** El mini radar (HU-17) y los textos de «Mi afinidad» dependen de `GET /radar` y de la pantalla `/afinidad` de esa épica, por lo que las pruebas se hicieron en conjunto.

## 5. Rutas de la épica (resumen)

Detalle en `RutasBackend.md` y `RutasFrontend.md`.

- **Frontend:** `/profile`, `/profile/completar`, `/profile/records`, `/profile/registros/agregar`, `/profile/projects/[id]/edit` y `/profile/{education|experience|certifications}/[id]/edit`.
- **Backend:** `/api/v1/perfil` (resumen, secciones, descripción profesional, respaldo con enlace firmado, exportación, proyectos, foto y CV).

## 6. Riesgos para revisar antes de dar por cerrada la épica

- **Foto de perfil.** Sigue sin una prueba manual en el navegador (solo pruebas automáticas) y el PO debe confirmar que se mantiene.
- **Límite de 4 MB.** Difiere del criterio de la HU-18 (5 MB). Si el PO exige 5 MB, hay que subirlo por otra vía que no pase por el proxy de Vercel.
- **Prueba conjunta con la Épica 3.** El flujo de afinidad y el mini radar dependen de esa épica y falta cerrarla.
- **Motor de similitud.** El mínimo de 90 % de acierto se mide con un conjunto de pruebas propio; no está validado con vacantes reales.
- **Pruebas que fallan.** Quedan dos pruebas de fechas en módulos de otros equipos; no son del perfil.

## 7. Pendiente

- Confirmar con el PO: foto de perfil (HU-16) y límite de 4 MB frente a 5 MB (HU-18).
- Hacer la prueba manual de la subida de foto en el navegador.
- Terminar la prueba conjunta con la Épica 3 (mini radar y «Mi afinidad»).
- Actualizar `docs/epic5/historias-epica-5.md`: la HU-11 de la Épica 5 figura «Sin PR» y hoy está resuelta por este equipo.
