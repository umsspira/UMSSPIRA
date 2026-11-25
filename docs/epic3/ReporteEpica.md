# Reporte de la Épica 3

**Radar de afinidad profesional y procesamiento de lenguaje natural**

**Equipo:** G3.

**Responsable del reporte:** Katherin Dominguez.

**Fecha de corte:** 24 de noviembre de 2026.

**Base revisada:** rama `epic3`, commit `ecc71c426630b6d32255d9e5943b15453f605189`, después de integrar las PR #980 y #981.

## 1. Propósito y resultado alcanzado

La Épica 3 permite que un titulado consulte cómo se relaciona la información escrita de su perfil con seis áreas profesionales de informática. Desarrollamos un extractor de palabras clave, un motor de cálculo de afinidad, la persistencia de sus resultados y una interfaz que presenta el radar, sus coincidencias y la variación respecto al cálculo anterior.

El resultado es un indicador de coincidencias textuales con un catálogo técnico. No representa una evaluación de competencia, una certificación de conocimientos ni una decisión de contratación. Por ejemplo, mencionar AWS en la descripción o en una certificación puede aportar a Cloud/DevOps; el sistema no comprueba que la persona domine esa tecnología ni que el certificado sea auténtico.

Este reporte reemplaza el corte anterior del 14 de noviembre y reúne el trabajo acumulado hasta el último merge indicado. Se distingue la funcionalidad integrada en `epic3` de las demostraciones, las dependencias de otros equipos y las comprobaciones que todavía requieren el entorno desplegado. La integración de una PR no equivale por sí sola a la aceptación de toda la épica en producción.

## 2. Funcionalidades desarrolladas durante el proyecto

### 2.1 Primera etapa: experiencia visual y navegación

Construimos la vista del radar del titulado y los componentes de presentación de afinidad: gráfico de seis ejes, resumen de áreas, selección de un área y panel de detalle. Se trabajó en los estados de carga, ausencia de datos y error, en el regreso al perfil y en la adaptación de los componentes a los diseños acordados.

La ruta `/afinidad` conduce a `/afinidad/egresado`, donde se monta la vista operativa del titulado. La pantalla permite consultar el resultado, revisar las palabras influyentes y solicitar el recálculo. La pestaña denominada «Personalizar» presenta las ponderaciones que entrega el sistema; al corte es una consulta de solo lectura. No permite guardar pesos elegidos por el usuario.

También se prepararon vistas de búsqueda y comparación de candidatos para explorar la experiencia del reclutador. Esa interfaz evolucionó como demostración y no debe confundirse con una integración operativa de postulantes reales. Su situación actual se precisa en la sección 6.

### 2.2 Segunda etapa: extracción NLP y cálculo real

**Extracción de palabras clave.** Implementamos un módulo NLP independiente que recibe texto, lo normaliza y reconoce términos canónicos y alias de un diccionario. La extracción considera frases de hasta tres palabras y prioriza la coincidencia más larga. Conserva símbolos relevantes de términos técnicos como C++, C# y Node.js. Reglas específicas evitan duplicar una misma mención en aclaraciones como `Amazon Web Services (AWS)`.

El resultado contiene las palabras reconocidas y sus frecuencias, además de candidatos no reconocidos. La operación HTTP `POST /api/v1/nlp/extract` admite texto plano y no escribe resultados en la base de datos. Los términos desconocidos que se conservan para seguimiento proceden del proceso de cálculo de Radar.

**Catálogo de seis áreas.** El radar utiliza estas áreas, identificadas mediante slugs y UUID estables:

- Desarrollo de Software: `software-development`.
- Cloud, DevOps e Infraestructura: `cloud-devops`.
- Ciencia de Datos e IA: `data-ai`.
- Aseguramiento de Calidad: `quality-assurance`.
- Ciberseguridad y Redes: `cybersecurity-networks`.
- Gestión de TI y Gobernanza: `it-management`.

**Regla matemática.** Cada palabra tiene un peso de 1 a 5 por área. Su aporte se calcula como `peso × min(frecuencia, 3)`. El porcentaje es la suma de esos aportes multiplicada por 100 y dividida entre 40, limitada al intervalo de 0 a 100 y redondeada a dos decimales. Cada área se calcula de manera independiente: los seis porcentajes no tienen que sumar 100.

Por ejemplo, una palabra con peso 5 que aparece una vez aporta 5 puntos, equivalentes a 12,50 puntos porcentuales. Si aparece cinco veces, solo aportan tres menciones: 15 puntos y 37,50 puntos porcentuales. Este límite reduce el efecto de repetir palabras para aumentar artificialmente el indicador.

**Persistencia y recálculo.** Guardamos el cálculo y los resultados de sus seis áreas. La primera consulta puede generar un cálculo si el titulado todavía no tiene uno. Las consultas siguientes comparan la entrada actual con la guardada y señalan si existen cambios pendientes. El recálculo reutiliza el resultado cuando la entrada efectiva no cambió, sin generar un nuevo cálculo redundante.

La identificación de entrada usa un hash de los textos y las versiones de algoritmo y diccionario. Los recálculos concurrentes se coordinan con un bloqueo transaccional por titulado. La persistencia del cálculo, las afinidades y los términos no reconocidos se realiza de forma atómica.

**Palabras influyentes e historial.** Cada área expone hasta cinco palabras con mayor aporte, ordenadas por puntos y con desempate determinista. Conservamos la afinidad del cálculo anterior para mostrar aumentos, disminuciones y ausencia de variación. Repetir un recálculo sin cambios mantiene la referencia histórica; no compara el resultado consigo mismo.

### 2.3 Tercera etapa: integración, trazabilidad y mantenimiento

**Datos reales y permisos, HU-9.** Conectamos la vista operativa con la API y revisamos los contratos de sesión y autorización. La identidad del titulado se obtiene de la sesión validada por el backend y no de un identificador enviado por el navegador. Las rutas de lectura y recálculo exigen permisos distintos. Se prepararon pruebas de acceso, revalidación y colecciones Bruno/Postman.

**Independencia entre NLP y Radar, HU-10.** Se separó la extracción textual de las decisiones de afinidad. NLP devuelve términos y frecuencias; Radar lee las asociaciones a áreas y sus pesos, calcula porcentajes y guarda el resultado. Esta separación permite reutilizar NLP sin trasladar a ese módulo las reglas particulares del radar.

**Textos y respaldos, HU-11.** Se revisaron etiquetas, mensajes y explicaciones para informar qué datos entran al cálculo. El detalle de un área consulta las certificaciones relacionadas por su nombre y entidad emisora. Indica si existe respaldo y permite solicitar su apertura mediante el módulo de Perfil. La lectura del archivo y la emisión del enlace firmado pertenecen a Perfil; Radar no crea un almacenamiento documental paralelo.

**Proyectos como quinta fuente.** Se incorporaron el nombre, la descripción y las tecnologías de los proyectos del portafolio. Crear, editar o eliminar uno puede modificar la entrada efectiva del radar, igual que las demás secciones. Se ajustó la navegación para volver desde Perfil y actualizar la afinidad cuando corresponde.

**Explicación de cambios, HU-13.** La migración M2 incorporó campos para la versión del diccionario y las contribuciones completas por palabra. Después se integraron el cálculo, la persistencia, el contrato HTTP y la presentación de la explicación. Ya no corresponde describir M2 únicamente como una preparación para implementación futura.

La explicación compara aportes anteriores y actuales y clasifica la causa como cambio de perfil, algoritmo o diccionario, según las versiones disponibles. Conserva contribuciones más allá del top cinco para poder explicar cambios de palabras que no estaban entre las más influyentes. En el primer cálculo o cuando falta información histórica suficiente se evita inventar un desglose; la explicación puede ser nula.

**Mejora controlada del diccionario, HU-15.** Se implementó una consulta administrativa agregada de términos no reconocidos, con frecuencia total, cantidad de titulados y última detección, sin incluir identificadores de personas. Se prepararon perfiles de referencia P1–P13 y un procedimiento de comparación antes/después para evaluar términos candidatos.

La publicación del catálogo registra una versión y una huella de su contenido. El proceso comprueba conflictos entre términos y alias, evita publicar una versión antigua sobre una posterior y rechaza reutilizar una versión con un contenido distinto. Los términos desconocidos no se incorporan automáticamente al catálogo: requieren evaluación de significado, ambigüedad, alias, área, peso e impacto.

### 2.4 Estabilización más reciente

**PR #980, espacio del botón Recalcular.** Cuando el detalle mostraba muchas certificaciones, ambas tarjetas compartían la altura de la más alta y el botón descendía, dejando un espacio excesivo bajo las palabras influyentes. Se alinearon las tarjetas al inicio y se retiró la distribución que separaba artificialmente el contenido. El botón conserva su posición aunque crezca el detalle. La solución integrada no agrega un scroll exclusivo para ese panel.

**PR #981, BUG-RADAR-01.** Se corrigió el error provocado por asociaciones de palabras a áreas ajenas a las seis del radar. El lector limita las asociaciones al catálogo válido y el mapeador ignora las áreas desconocidas con una advertencia, en lugar de interrumpir el recálculo con un error 500. La regresión cubre los tópicos asociados a PostgreSQL y Gestión de proyectos y comprueba que no sumen puntos al radar.

Este endurecimiento no reemplaza la revisión del catálogo desplegado: para que una palabra aporte a un área esperada debe existir una asociación válida con su peso. Ignorar una asociación incorrecta evita el fallo, pero no crea una asociación que falte.

## 3. Información utilizada y límites del cálculo

El motor lee cinco fuentes guardadas del perfil:

1. Formación académica: título e institución.
2. Experiencia laboral: cargo y empresa.
3. Certificaciones: nombre y entidad emisora.
4. Descripción profesional vigente.
5. Proyectos: nombre, descripción y tecnologías.

No analiza fechas, antigüedad, duración de estudios o empleos, enlaces, imágenes, PDF ni otros adjuntos. Los borradores sin guardar tampoco forman parte de la entrada. El archivo de una certificación puede consultarse como respaldo, pero sus píxeles o su contenido documental no generan puntos.

Cuando existen varias filas históricas de descripción profesional, se usa una sola: la primera según `fecha_creacion asc, id asc`, en coherencia con la regla de Perfil. No se concatenan todas las descripciones. El indicador `hasLaborHistory` informa si existe experiencia laboral; no constituye una valoración de su duración o calidad.

El extractor reconoce coincidencias de diccionario y alias. No comprende negaciones ni contexto profesional: «No tengo experiencia con AWS» puede producir una coincidencia con AWS. Tampoco infiere habilidades no escritas, similitud semántica libre o dominio técnico a partir de una imagen.

## 4. Arquitectura, datos e integración con otras épicas

La interfaz utiliza Next.js, React y TypeScript. El backend utiliza NestJS y separa controladores HTTP, casos de uso, políticas de dominio y adaptadores. PostgreSQL conserva los cálculos e históricos mediante Prisma. Los tipos compartidos permiten mantener el mismo contrato entre API y frontend.

Las principales estructuras son `calculo_radar`, `afinidad_radar`, `palabra_clave`, `alias_palabra_clave`, `palabra_clave_area`, `palabra_clave_no_mapeada` y `radar_diccionario_version`. M1 establece la persistencia del radar; M2 amplía la trazabilidad de contribuciones; la migración de HU-15 incorpora el registro de publicaciones del diccionario. Que las migraciones estén en el repositorio no acredita su aplicación en cada base desplegada.

Las responsabilidades compartidas quedan delimitadas así:

- **Épica 1:** autenticación, sesión y permisos comunes. El OCR del backoffice documental corresponde a su flujo de revisión; no es una entrada automática del radar.
- **Épica 2:** captura y mantenimiento del perfil, proyectos, certificaciones y respaldos. Épica 3 consume sus textos guardados y coordina el regreso a Afinidad.
- **Épica 4:** gestión de empresas, candidatos y etapas de selección. Su flujo de postulantes no se considera implementado por mostrar una demostración dentro de una ruta de afinidad.
- **Épica 5:** afinidad con vacantes, postulaciones y reglas de disponibilidad. La afinidad de una vacante tiene su propio contrato y reglas; no equivale al vector de seis áreas.
- **DevOps y base de datos:** despliegue de versiones, aplicación de migraciones, publicación del catálogo y configuración de entornos.

La rama `epic3` contiene además cambios de otras épicas incorporados durante sincronizaciones. Su presencia no significa que hayan sido desarrollados íntegramente por G3 ni que formen parte del alcance funcional del radar.

## 5. Trabajo adicional y situaciones no previstas

### Descripciones históricas que alteraban el resultado

La investigación de aportes de Agile mostró que se estaban considerando textos históricos y que la descripción vigente debía tener una regla explícita. Se alineó la lectura de Radar con Perfil y se añadieron pruebas sobre selección de la fila y concurrencia. Esto evitó explicar un porcentaje a partir de textos que el usuario ya no identificaba como su descripción visible.

### Integración del portafolio y duplicación de modelos

La incorporación de proyectos amplió las fuentes originales. Durante la integración aparecieron definiciones y migraciones superpuestas para la misma tabla. Se revisó la combinación con la rama de Perfil para conservar un modelo y una migración coherentes, en lugar de acumular estructuras duplicadas.

### Regresiones en el visor compartido

Una modificación orientada a abrir respaldos desde Radar afectaba la vista previa JPG de Perfil y sus pruebas. Se separó la apertura de respaldos del radar para preservar la experiencia compartida. La posibilidad de abrir un archivo se mantuvo diferenciada del análisis textual que aporta al cálculo.

### Datos de demostración que podían confundirse con resultados reales

La auditoría de mocks identificó fixtures y controles de simulación. Se restringió el mock de afinidad a pruebas automatizadas, se eliminó el guardado de configuración sin endpoint real y se hizo explícita la demostración de candidatos. Los errores de la API no deben sustituirse silenciosamente por un vector de ejemplo.

### Fallos de otras épicas durante la integración

Fixtures de Eventos con fechas vencidas hicieron fallar verificaciones en etapas anteriores. Se documentó su procedencia y se contrastaron los arreglos correspondientes, sin atribuir ese fallo al algoritmo de afinidad. En las dos PR más recientes las suites completas de CI sí finalizaron correctamente.

### Datos de catálogo que tumbaban el recálculo

El catálogo compartido contiene áreas o tópicos de otras funcionalidades. Una asociación a uno de esos identificadores podía provocar un error no controlado. BUG-RADAR-01 llevó a reforzar el límite del contexto de Radar mediante filtrado de las seis áreas y tolerancia del mapeador ante asociaciones ajenas.

### Crecimiento del detalle de certificaciones

El caso de muchas certificaciones reveló que un diseño correcto con pocos datos podía generar espacios desproporcionados. La corrección de #980 desacopla las alturas de las tarjetas. Se probó con 1 y 18 certificaciones para verificar el comportamiento con contenido extenso.

### Participación en QA de vacantes

El equipo también aportó a la suite de contratos HTTP de HU-E5-17, integrada mediante #924. Incluye controles de postulación única, aislamiento entre titulados y campos públicos de la oferta, entre otros casos. Es una contribución de QA al flujo de Épica 5, no una ampliación del radar a toda la gestión de vacantes.

El informe manual de HU-E5-17 registra observaciones sobre postulantes, estados, sesión y textos. Las PR #980 y #981 no resuelven ese conjunto de incidencias; su seguimiento corresponde al módulo y equipo responsables.

## 6. Funcionalidades excluidas y entregas parciales

### Fuera del alcance del radar entregado

- **Escaneo de documentos mediante IA u OCR.** No se extrae texto de JPG/PDF para sumar afinidad. Mostrar o descargar un respaldo no constituye procesamiento OCR.
- **Validación de autenticidad.** No se determina si un diploma, certificado, experiencia o proyecto es verdadero. No se consultan instituciones emisoras ni registros externos para certificarlo.
- **IA generativa o interpretación semántica abierta.** El motor implementado usa un diccionario y reglas deterministas. No hay un modelo que interprete libremente currículos, complete habilidades o redacte una evaluación profesional.
- **Aprendizaje automático del catálogo.** Una palabra frecuente sin reconocer es candidata a revisión, no una nueva habilidad aprobada automáticamente.
- **Decisiones de selección.** El radar no acepta, descarta ni contrata postulantes. Tampoco sustituye la revisión humana de un reclutador.
- **Consulta de postulantes reales para la vista de reclutador.** No implementamos la conexión de esa vista con una consulta de postulantes en la base de datos. Según el alcance de las HU asignadas al equipo G3, esa integración no estaba definida como un entregable de Épica 3 y no formó parte del trabajo comprometido del radar. La demostración visual no debe presentarse como una consulta operativa de postulantes reales. Se propone considerar esta integración en futuros sprints, con una HU explícita que acuerde responsabilidades con las épicas de Empresas y Vacantes, contrato de datos, permisos y criterios de aceptación.
- **Edición personal de pesos o áreas.** Los seis ejes y las reglas de cálculo pertenecen al sistema; no existe un endpoint operativo para guardar una configuración individual de ponderaciones.
- **Historial completo navegable.** Existe persistencia histórica y comparación con el cálculo anterior; no se presenta como entregada una pantalla general para explorar y restaurar cualquier cálculo pasado.

Estas exclusiones describen esta entrega. Incorporarlas más adelante requeriría definición de alcance, criterios y coordinación, no solo activar una bandera.

### Demostraciones y dependencias que siguen diferenciadas

`/radar-preview` presenta un vector de ejemplo con aviso explícito. `/afinidad/reclutador` muestra por defecto un estado de dependencia y permite abrir una demostración con candidatos de prueba mediante una acción explícita. Ninguna de las dos demuestra que esté completo el contrato operativo de candidatos con afinidad para empresas.

La política backend permite al titulado consultar y recalcular su radar. El administrador puede extraer texto y consultar el resumen de términos no reconocidos, pero no recibe por ello acceso al radar de cualquier persona. La autorización del resumen agregado se basa en `reportes:read`; su consulta no recibe un filtro de carrera. Cualquier ampliación o restricción adicional de ese alcance debe acordarse expresamente.

## 7. Pruebas y evidencia disponible

La cobertura del repositorio incluye normalización y alias, frases compuestas, permisos, saturación de porcentajes, top cinco, entrada sin coincidencias, idempotencia, concurrencia, lectura del perfil, persistencia y explicación de cambios. También existen perfiles P1–P13 y pruebas de impacto de términos candidatos, además de colecciones Bruno y Postman.

La revisión realizada para #980 y #981 obtuvo estos resultados:

- **Frontend local:** 45 pruebas aprobadas de `GraduateAffinityView` y `AffinitySkeleton`.
- **Backend local:** cuatro suites y 26 pruebas aprobadas del mapeador, lector de pesos, recálculo y contrato HTTP, incluida la regresión de áreas ajenas.
- **Comprobación visual local:** se renderizó la vista con servicios simulados y 1 frente a 18 certificaciones. En un ancho de 1440 px, el botón conservó la coordenada vertical y la tarjeta izquierda mantuvo su altura mientras crecía el detalle. No fue una prueba con cuentas de producción.
- **CI de #980:** 366 suites web y 2589 pruebas; 243 suites API y 1943 pruebas; lint y compilación exitosos.
- **CI de #981:** 366 suites web y 2589 pruebas; 243 suites API y 1944 pruebas; lint y compilación exitosos, incluida `radar-top-keywords.e2e.spec.ts`.

Las pruebas locales se ejecutaron en una copia aislada con ambas correcciones, generación del cliente Prisma y dependencias auxiliares de los módulos importados. Los siete archivos fusionados se contrastaron con esa copia y coincidieron. Las cantidades de CI son del monorepo completo, no exclusivamente de Épica 3.

Las pruebas HTTP citadas utilizan dobles de persistencia y servicios; no sustituyen las integraciones opt-in con PostgreSQL real. Hay suites específicas de integración para historial, bloqueos y persistencia en lote, cuya ejecución depende de una base de prueba configurada.

## 8. Pendientes de aceptación y despliegue

1. **Confirmar el candidato desplegado.** Registrar por separado SHA de frontend y API, entorno y versión del diccionario. El estado exitoso de Vercel no prueba por sí solo qué backend o base utiliza la aplicación.
2. **Revalidar BUG-RADAR-01 en el ambiente compartido.** Probar PostgreSQL, Postgres y Gestión de proyectos; comprobar respuesta, fecha del nuevo cálculo y aportes de asociaciones válidas. Revisar el catálogo con el responsable de datos si faltan pesos o vínculos.
3. **Completar QA con datos reales.** Registrar los casos A/B, P1–P13 en el candidato desplegado y los recorridos de crear, editar y eliminar datos de Perfil y regresar a Afinidad. Las pruebas automatizadas de referencia no equivalen a esa ejecución manual.
4. **Confirmar respaldos reales.** Verificar JPG y PDF propios, ausencia de archivo, enlace vencido y acceso denegado a respaldos ajenos, conservando la experiencia de Perfil.
5. **Cerrar decisiones de producto.** Definir la permanencia de `/radar-preview`, el alcance de la demostración de reclutador y el acceso administrativo que se quiera ofrecer. No se presentan como decisiones ya aprobadas.
6. **Coordinar integración con `dev`.** En la comprobación posterior a los merges, `epic3` tenía cuatro commits propios y 22 commits de `dev` pendientes de incorporar. Este dato corresponde al corte y debe actualizarse antes de una nueva integración.

No se declara cierre integral de la épica mientras falte esa evidencia. El código de las correcciones está integrado y probado; la aceptación operativa completa requiere los recorridos y registros del entorno compartido.

## 9. Trazabilidad y referencias

**Inventario técnico:** [Rutas backend](RutasBackend.md).

**Fuentes de implementación, fijadas al commit del corte:**

- [Controladores y casos de uso de Radar](https://github.com/umsspira/UMSSPIRA/tree/ecc71c426630b6d32255d9e5943b15453f605189/apps/api/src/modules/radar).
- [Normalización, diccionario y extracción NLP](https://github.com/umsspira/UMSSPIRA/tree/ecc71c426630b6d32255d9e5943b15453f605189/apps/api/src/modules/nlp).
- [Contrato compartido de afinidad](https://github.com/umsspira/UMSSPIRA/blob/ecc71c426630b6d32255d9e5943b15453f605189/packages/shared-types/src/affinity.ts).
- [Vista operativa del titulado](https://github.com/umsspira/UMSSPIRA/blob/ecc71c426630b6d32255d9e5943b15453f605189/apps/web/src/shared/components/graduate-affinity-view.tsx).
- [Publicación versionada del catálogo](https://github.com/umsspira/UMSSPIRA/blob/ecc71c426630b6d32255d9e5943b15453f605189/apps/api/scripts/seed/radar-catalog.ts).
- [Perfiles de referencia y comparación](https://github.com/umsspira/UMSSPIRA/blob/ecc71c426630b6d32255d9e5943b15453f605189/docs/qa/hu15-t152-perfiles-referencia-comparacion.md) y [casos de QA de explicación](https://github.com/umsspira/UMSSPIRA/blob/ecc71c426630b6d32255d9e5943b15453f605189/docs/qa/hu13-t137-t138.md).

**PR que permiten seguir la evolución:** [afinidad real #668](https://github.com/umsspira/UMSSPIRA/pull/668), [independencia NLP #693](https://github.com/umsspira/UMSSPIRA/pull/693), [respaldos #760](https://github.com/umsspira/UMSSPIRA/pull/760), [proyectos #772](https://github.com/umsspira/UMSSPIRA/pull/772), [textos #773](https://github.com/umsspira/UMSSPIRA/pull/773), [regresión de respaldos #784](https://github.com/umsspira/UMSSPIRA/pull/784), [M2 #758](https://github.com/umsspira/UMSSPIRA/pull/758), [explicabilidad #810](https://github.com/umsspira/UMSSPIRA/pull/810), [presentador #806](https://github.com/umsspira/UMSSPIRA/pull/806), [interfaz de explicación #824](https://github.com/umsspira/UMSSPIRA/pull/824), [mocks #836](https://github.com/umsspira/UMSSPIRA/pull/836), [términos no reconocidos #857](https://github.com/umsspira/UMSSPIRA/pull/857), [comparación de perfiles #856](https://github.com/umsspira/UMSSPIRA/pull/856), [versionado #862](https://github.com/umsspira/UMSSPIRA/pull/862), [QA de vacantes #924](https://github.com/umsspira/UMSSPIRA/pull/924), [espaciado #980](https://github.com/umsspira/UMSSPIRA/pull/980) y [BUG-RADAR-01 #981](https://github.com/umsspira/UMSSPIRA/pull/981).

**Ejecuciones de CI:** [#980](https://github.com/umsspira/UMSSPIRA/actions/runs/45443298674) y [#981](https://github.com/umsspira/UMSSPIRA/actions/runs/45457661725).

La organización del reporte toma como referencia los documentos de [Épica 1](https://github.com/umsspira/UMSSPIRA/blob/ecc71c426630b6d32255d9e5943b15453f605189/docs/epic1/ReporteEpica.md) y [Épica 4](https://github.com/umsspira/UMSSPIRA/blob/ecc71c426630b6d32255d9e5943b15453f605189/docs/Epic4/ReporteEpica.md). Sus fechas y pendientes pertenecen a sus propios cortes; no se trasladan como estado actual de Épica 3.
