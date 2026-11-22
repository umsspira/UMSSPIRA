# Política de datos del postulante

HU16, versión 1.1 · T16.1: política de datos y proyección única en backend.

## Alcance y acceso

Esta política se aplica a las respuestas de:

- `GET /api/v1/vacantes/:idVacante/postulantes`.
- `GET /api/v1/vacantes/:idVacante/postulantes/:idPostulacion`.

Ambas rutas conservan el permiso `empresas:self:read`. Antes de leer postulaciones,
el servicio verifica que la vacante pertenezca al dueño de la empresa o a una
empresa donde el actor sea un usuario invitado activo. Si no existe acceso,
responde 404 sin consultar postulaciones. El detalle filtra por la postulación
y la vacante solicitadas; si no encuentra esa relación, responde 404.

El formato existente se conserva: el listado devuelve un arreglo y el detalle un
objeto, directamente, sin añadir un sobre `data`. Un listado sin postulantes
devuelve `[]`.

## Datos visibles

Cada postulante contiene exactamente estas 14 claves:

| Clave | Contenido y comportamiento |
| --- | --- |
| `id` | ID de la postulación consultada; no es el ID del usuario ni del titulado. |
| `name` | Nombre y apellido del titulado; como alternativa, nombre del usuario y finalmente `Sin nombre`. |
| `email` | Correo del usuario; `''` cuando no está registrado. |
| `location` | `null`, conservando el contrato actual. |
| `experienceLevel` | `null`, conservando el contrato actual. |
| `stage` | Estado de esa postulación; `postulado` si es nulo. |
| `appliedAt` | Fecha de postulación en formato ISO o `null`. |
| `hasCv` | Indica si existe un CV con `contenido` no nulo; un registro sin contenido no cuenta. Listado y detalle solo seleccionan su ID para calcular este indicador, sin publicar el ID, la ruta ni los bytes. |
| `cvUrl` | `null`; T16.1 no implementa la descarga del CV. |
| `matchPercentage` | Valor almacenado convertido a número finito, o `null`; no se calcula ni recalcula. |
| `skills` | `null`; su implementación y el desglose de afinidad corresponden a HU15. |
| `workExperience` | Arreglo de experiencia laboral con las cuatro claves indicadas abajo. |
| `education` | Arreglo de formación académica con las cuatro claves indicadas abajo. |
| `certifications` | Arreglo de certificaciones con las cuatro claves indicadas abajo. |

Las colecciones proceden de los modelos existentes de Prisma y se leen a través
de `postulacion.usuario.titulado`. Siempre son arreglos: sin registros, sin
titulado o sin usuario, se devuelve `[]` en cada colección.

### Experiencia laboral: `workExperience`

Origen: `ExperienciaLaboral`, relación `experiencia_laboral_registros`.

| Clave exacta | Columna | Tipo público |
| --- | --- | --- |
| `position` | `cargo` | `string` |
| `company` | `empresa` | `string` |
| `startDate` | `fecha_inicio` | `string`, fecha `YYYY-MM-DD` |
| `endDate` | `fecha_fin` | Fecha `YYYY-MM-DD` o `null` si no tiene fecha de fin. |

Orden: fecha de inicio descendente; para fechas iguales, ID ascendente. El ID se
usa únicamente para ordenar y no se selecciona ni publica.

### Formación académica: `education`

Origen: `FormacionAcademica`, relación `formacion_academica_registros`.

| Clave exacta | Columna | Tipo público |
| --- | --- | --- |
| `title` | `titulo` | `string` |
| `institution` | `institucion` | `string` |
| `graduationYear` | `anio_egreso` | `number` |
| `level` | `grado` | `string` o `null` |

Orden: año de egreso descendente; para años iguales, ID ascendente. El ID no se
selecciona ni publica.

### Certificaciones: `certifications`

Origen: `Certificacion`, relación `certificacion_registros`.

| Clave exacta | Columna | Tipo público |
| --- | --- | --- |
| `name` | `nombre` | `string` |
| `issuer` | `entidad_emisora` | `string` |
| `level` | `grado` | `string` |
| `year` | `anio_emision` | `number` o `null` |

Orden: año de emisión descendente, años nulos al final y, para empates, ID
ascendente. El ID no se selecciona ni publica.

## Datos no visibles

Todo campo que no figure en las listas anteriores queda excluido. En particular:

- Carnet de identidad, extensión y expedición del CI y código SIS.
- Teléfono, fecha de nacimiento, domicilio y dirección personal.
- Encuestas laborales, sus respuestas y otras postulaciones del usuario.
- IDs internos de usuario, titulado, empresa y registros profesionales.
- Roles, permisos, credenciales, hashes, tokens y sesiones.
- Estados e historial de validación, justificaciones y datos de validadores.
- Respaldos académicos y de certificaciones, bytes de archivos, claves de
  almacenamiento, rutas internas, firmas y enlaces privados.
- Fechas de creación de los registros profesionales y otras relaciones del
  perfil, como proyectos, encuestas o radar.

La selección de nombre y correo se limita a los datos expresamente autorizados.
Los textos profesionales se devuelven tal como están registrados; esta proyección
no realiza una anonimización del contenido libre de esos textos ni del CV.

## Proyección única y límites de integración

`VacantesService.SELECT_POSTULANTE` enumera las columnas permitidas, incluidos los
campos mínimos de las tres relaciones profesionales. Listado y detalle usan la
misma selección y la misma transformación `toPostulante`. La transformación
construye explícitamente cada objeto público, sin propagar filas completas de
Prisma ni sus relaciones.

Los registros reflejan el perfil vigente al consultar. No representan una copia
histórica del perfil al momento de postular. El orden del listado de postulantes
por afinidad y fecha de postulación se conserva; los criterios de orden descritos
arriba corresponden únicamente a las tres colecciones profesionales.

Esta Task no modifica endpoints, permisos, frontend, esquema ni migraciones. El
frontend actual normaliza los campos conocidos y todavía no muestra las nuevas
colecciones. La descarga autorizada del CV y la implementación de `skills` y del
desglose de afinidad tienen sus propios alcances. Cuando HU15 amplíe el contrato,
se deberán actualizar expresamente esta política y sus pruebas estrictas.

## Pruebas de contrato

`vacantes.service.spec.ts` verifica con Prisma simulado, sin base de datos real:

- Las 14 claves exactas del objeto y las cuatro claves exactas de cada elemento
  de las tres colecciones, tanto en listado como en detalle.
- La exclusión de datos privados y campos desconocidos añadidos a los fixtures,
  incluso cuando el doble de Prisma los entrega fuera de la selección solicitada.
- La selección mínima completa, compartida por ambas consultas, incluidos orden
  descendente, nulos al final para certificaciones y desempates por ID.
- La igualdad de la transformación del listado y del detalle para una misma fila.
- Fechas, nulos, colecciones vacías y ausencia de usuario o titulado.
- Acceso autorizado, rechazo antes de consultar postulaciones y pertenencia de
  la postulación a la vacante, conservando las regresiones existentes.

Las expectativas de claves y de selección son explícitas e independientes de la
constante de producción. Agregar una clave no autorizada, en la raíz o en un
elemento de las colecciones, debe hacer fallar las pruebas. No basta con comprobar
únicamente un subconjunto mediante `objectContaining`.
