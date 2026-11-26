# HU-12: recálculo automático de afinidad laboral

## Alcance y arquitectura

Las consultas autorizadas `GET /api/v1/vacantes/mis-postulaciones`,
`GET /api/v1/vacantes/:id/postulantes` y el detalle de postulante activan un
recálculo **lazy** de las postulaciones del Titulado o de la vacante de la empresa.
No hay endpoint nuevo. El guardado de perfil y la edición de requisitos solo
persisten sus cambios; no esperan al motor NLP. En la próxima lectura, el
servidor compara la entrada vigente con `postulacion.hash_entrada`. El endpoint
`POST /api/v1/affinity/batch` de HU-10 continúa siendo de solo lectura.

La entrada del SHA-256 comprende los textos de descripción, formación,
experiencia, certificaciones y proyectos que lee
`PrismaJobPostingAffinityDataAdapter`, las banderas de completitud y los
requisitos técnicos normalizados de la vacante. Las colecciones se ordenan y
los requisitos duplicados se eliminan. No se incluyen fechas académicas,
respaldos, título o estado de la vacante, ni el ID del usuario. La versión
`hu10-exact-v1` representa la política **realmente conectada** a HU-10.
Cuando se integre HU-11 o cambie el diccionario NLP, hay que subir esta versión;
el cargador NLP actual no expone una versión confiable del contenido del
diccionario para incorporarla de forma automática.

`RefreshJobPostingAffinity` lee páginas de hasta 50 postulaciones, agrupa por
Titulado, omite hashes vigentes y usa `CalculateJobPostingAffinity`. Antes del
NLP obtiene un reclamo atómico por postulación y hash. Otra solicitud ve
`pending` y no ejecuta el mismo cálculo; el reclamo vence a los 30 segundos
para recuperar procesos interrumpidos. El NLP corre fuera de la transacción
de escritura. Antes de guardar, el repositorio
bloquea la fila del Titulado, toma el bloqueo asesor de la vacante que comparte
con su edición, y un bloqueo por postulación. Relee perfil y requisitos dentro
de la transacción y vuelve a calcular el hash. Si difiere del hash calculado,
no escribe y la postulación queda pendiente de otro intento. Las consultas
refiltran la identidad del Titulado o la propiedad/membresía activa de la
empresa antes de leer postulaciones.

La creación de postulaciones mantiene el cálculo inicial de HU-10. Antes de
crear, vuelve a comprobar disponibilidad y hash bajo bloqueos. Si cambiaron
las entradas o falló NLP, crea la postulación con resultado pendiente, que la
consulta lazy recuperará. No se pierde la postulación por un fallo del motor.

## Persistencia y respuestas

La migración nueva `20261121120000_epic5_hu12_vigencia_afinidad` añade
`hash_entrada`, `estado_match` y los campos técnicos de reclamo
`hash_en_calculo`, `reclamo_match_id`, `reclamo_match_hasta`, todos nullable.
Las filas anteriores conservan los
campos nulos y se evalúan en la próxima lectura. `ready`, incluido 0 %, guarda
porcentaje, fecha, hash y estado juntos. `profile-incomplete` y
`no-requirements` guardan hash y estado, con porcentaje y fecha nulos. Los
errores técnicos no escriben 0 %; la respuesta de esa lectura indica `error`
y permite reintentar. Un cálculo que perdió una carrera indica `pending`.

Las respuestas agregan `matchStatus`: `ready`, `profile-incomplete`,
`no-requirements`, `pending` o `error`. Si es `pending` o `error`, la API oculta
el porcentaje anterior. `matchStatus` es metadato técnico; no modifica la
etapa de la postulación. Pausar y cerrar una vacante actualizan la
disponibilidad, pero conservan el porcentaje histórico si los requisitos no
cambiaron.

Mis postulaciones, Candidatos, listado y detalle de vacantes vuelven a consultar
al recuperar el foco y cada 30 segundos mientras la pestaña está visible;
agrupan eventos cercanos
con 500 ms de espera. Durante la consulta muestran actualización en curso y
ocultan temporalmente porcentajes previos. El servidor detecta también cambios
hechos desde otra sesión o dispositivo al comparar el hash actual.

## Validación y límites

Pruebas unitarias: política SHA-256, caso de uso de recálculo, repositorio con
dependencias simuladas, postulación inicial, listados y UI de Mis postulaciones.
`test/job-posting-affinity-refresh.integration.spec.ts` es opt-in: exige
`TEST_DATABASE_URL` de PostgreSQL local, crea una base temporal propia, aplica
allí las migraciones y prueba bloqueo concurrente, vigencia y alcance empresarial.
No debe apuntarse a una base compartida. Los E2E HTTP autenticados quedan para
la fase funcional aislada. La migración debe desplegarse antes que el código
que consulta sus columnas. Las consultas lazy pueden tardar durante la primera
lectura de muchos pendientes; medir tiempos antes de añadir una cola nueva.
