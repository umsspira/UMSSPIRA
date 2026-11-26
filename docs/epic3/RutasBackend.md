# Rutas backend de la Épica 3

**Radar de afinidad profesional y procesamiento de lenguaje natural**

**Equipo:** G3.

**Corte:** 24 de noviembre de 2026.

**Base revisada:** `epic3`, commit `ecc71c426630b6d32255d9e5943b15453f605189`.

## 1. Alcance y convenciones

Este documento describe los cinco endpoints propios de Radar y NLP, sus permisos, entradas, respuestas, efectos y errores relevantes. Incluye las dependencias de Perfil, Autenticación y salud de la API que intervienen en los recorridos de integración. El alcance funcional y las exclusiones se desarrollan en [ReporteEpica.md](ReporteEpica.md).

El prefijo global de la API es `/api/v1`. La ruta de salud es `/health` y está excluida de ese prefijo. En el frontend, el proxy `/api/v1/[...path]` reenvía las operaciones permitidas hacia la API; no constituye un segundo motor de cálculo.

Las rutas propias protegidas requieren una sesión validada por el backend. Para clientes de prueba puede enviarse `Authorization: Bearer <token_de_prueba>`. El valor real no debe incluirse en documentación ni evidencias compartidas. El servidor determina la identidad, los permisos y el alcance a partir de la sesión; no se admite suplantar al titulado enviando un ID en la URL o el cuerpo.

Las respuestas exitosas de Radar y NLP se envuelven en `{ "data": ... }`. Los errores utilizan `{ "error": { "code": "...", "message": "..." } }`. `/health` responde directamente con su estado y no utiliza el envoltorio `data`. La configuración HTTP establece `Cache-Control: no-store`.

### Distribución de permisos

- **Titulado:** `radar:self:read`, `radar:self:write` y `nlp:extract`. Sus consultas de radar quedan limitadas a su propio `graduateId`.
- **Administrador:** `nlp:extract` y `reportes:read`. Puede consultar el resumen agregado de términos desconocidos, pero no recibe los permisos de radar propio ni un alcance de titulado por ser administrador.
- **Empresa:** no tiene los permisos anteriores en la política de roles revisada. Las rutas propias documentadas no ofrecen una consulta empresarial de radares de terceros.

Sin una sesión válida se responde `401`. Con sesión pero sin el permiso o alcance requerido se responde `403`. La autorización del resumen agregado se basa en `reportes:read`; ese controlador no recibe un filtro de carrera y no aplica la restricción por carrera de los endpoints del módulo Reportes.

## 2. Contrato común del vector de radar

`GET /radar` y `POST /radar/recalculate` presentan el mismo vector base:

- `graduateId`: identificador del titulado propietario del cálculo.
- `hasLaborHistory`: indica si existe al menos un registro de experiencia laboral.
- `calculatedAt`: fecha del cálculo guardado, en formato ISO.
- `status`: `ok` o `empty`. `empty` corresponde al cálculo sin palabras reconocidas; un vector de seis ceros también puede resultar de palabras sin asociaciones válidas.
- `algorithmVersion`: versión del algoritmo utilizada por el cálculo.
- `dictionaryVersion`: versión del diccionario, cuando está disponible en la instantánea. Los registros históricos pueden contener un valor nulo o carecer del campo.
- `hasPendingChanges`: señala si la entrada efectiva del perfil difiere de la del cálculo vigente.
- `processingMs`: duración informada por la operación; la consulta de un cálculo existente utiliza cero en la capa de aplicación. No es una garantía de latencia de red.
- `areas`: seis entradas en el orden canónico descrito abajo.
- `unmappedKeywords`: lista sin duplicados de términos no reconocidos asociados al titulado.
- `recalculated`: indicador exclusivo del POST; `true` si creó un cálculo y `false` si reutilizó el vigente. No se expone en el GET.

Cada elemento de `areas` contiene `area`, `affinity`, `previousAffinity`, `weighting` y `topKeywords`. `previousAffinity` es nulo cuando no existe la referencia anterior para el área. `weighting` representa el mayor peso reconocido en el área, de 1 a 5, o nulo si no hay aportes; no es un peso personal editable.

`topKeywords` contiene como máximo cinco elementos con `keyword`, `weight`, `frequency`, `points` y `percentage`. La frecuencia conserva las menciones detectadas; los puntos aplican el límite de tres menciones. `percentage` expresa el aporte de la palabra sobre la escala de 40 puntos del área, no el porcentaje que representa dentro de su lista de palabras.

Cuando existe información suficiente, un área puede incluir `explanation`, con `cause` (`profile`, `algorithm` o `dictionary`) y `changes`. Cada cambio contiene `keyword`, `previousPoints`, `currentPoints` y `deltaPercentagePoints`. La explicación puede ser nula o estar ausente en datos históricos. No debe interpretarse su ausencia como un error ni reconstruirse un desglose sin datos.

Las seis áreas se devuelven en este orden:

1. `software-development`.
2. `cloud-devops`.
3. `data-ai`.
4. `quality-assurance`.
5. `cybersecurity-networks`.
6. `it-management`.

Cada porcentaje está limitado a 0–100 y se publica con precisión de hasta dos decimales. Los ejes se calculan de forma independiente y no tienen que sumar 100.

## 3. GET /api/v1/radar

**Propósito:** consultar el vector del titulado autenticado y detectar cambios de su perfil respecto al resultado guardado.

**Permiso:** `radar:self:read`, además de alcance de titulado.

**Entrada:** sin parámetros de ruta, filtros ni cuerpo definidos por el controlador. No recibe un `graduateId`.

**Éxito:** `200`, con `{ "data": <vector> }` y sin `recalculated`.

### Comportamiento

1. Lee las cinco fuentes textuales del perfil guardado: formación, experiencia, certificaciones, descripción profesional vigente y proyectos.
2. Calcula la huella de la entrada con la misma política utilizada para el recálculo.
3. Si existe un cálculo, devuelve esa instantánea y compara su huella para informar `hasPendingChanges`. No reemplaza automáticamente un cálculo existente solo por detectar cambios.
4. Recupera el cálculo inmediatamente anterior para `previousAffinity` y la explicación cuando sea posible.
5. Si nunca hubo un cálculo, ejecuta el cálculo inicial y lo persiste antes de responder.

**Efecto de escritura importante:** aunque sea un GET, la primera consulta puede crear `calculo_radar` y sus registros relacionados. No debe describirse como una lectura siempre libre de escrituras. Los términos no reconocidos forman parte de esa persistencia inicial.

Un perfil sin coincidencias puede responder `200`, `status: "empty"` y las seis áreas en cero. No es un `404`. Si el perfil cambió, `calculatedAt` sigue siendo la fecha del cálculo guardado que se está mostrando hasta ejecutar un nuevo recálculo.

### Errores y comprobaciones

- `401`: sesión ausente o inválida.
- `403`: permiso o alcance de titulado ausente.
- `503`, `NLP_DICTIONARY_UNAVAILABLE`: si se necesita generar el cálculo inicial y el diccionario no está disponible. Una lectura de una instantánea ya existente no requiere extraer de nuevo las palabras.

Verificar primer acceso, perfil vacío, cálculo previo, cambios pendientes, referencia histórica y aislamiento entre titulados. Las pruebas correspondientes están en `get-radar.use-case.spec.ts` y `test/radar-top-keywords.e2e.spec.ts`.

**Implementación:** `apps/api/src/modules/radar/http/controllers/get-radar.controller.ts` y `application/use-cases/get-radar.use-case.ts`.

## 4. POST /api/v1/radar/recalculate

**Propósito:** actualizar el radar con la información efectivamente guardada del titulado.

**Permiso:** `radar:self:write`, además de alcance de titulado.

**Entrada:** el controlador no define cuerpo ni parámetros. Los textos y el propietario se obtienen en el servidor; no se calculan sobre un texto arbitrario enviado en el POST.

**Éxito:** `200`, con `{ "data": <vector> }` e indicador `recalculated`.

### Reglas de ejecución y persistencia

- La huella SHA-256 incorpora los textos normalizados para identificación de cambios y las versiones del algoritmo/diccionario. No es la misma operación que la normalización lingüística de NLP.
- Si coincide con la última huella, se reutilizan el cálculo, su fecha y su referencia anterior: `recalculated: false`.
- Si cambió, se extraen las palabras y se leen los pesos de las áreas. Por palabra, `points = weight × min(frequency, 3)`; por área, `affinity = min(100, sum(points) × 100 / 40)`.
- Se crea un cálculo y sus seis afinidades, con contribuciones por palabra y términos no reconocidos, dentro de una transacción: `recalculated: true`.
- El bloqueo asesor de PostgreSQL por titulado y la comprobación de huella dentro del bloqueo evitan que solicitudes simultáneas creen cálculos redundantes para una misma entrada.
- Los términos desconocidos del titulado se actualizan sin sumar repetidamente la frecuencia anterior; se retiran los que dejaron de aparecer.
- La extracción y lectura de pesos se realizan antes del bloqueo de persistencia para reducir la duración de la transacción.

### Manejo de asociaciones ajenas al radar

Desde #981, `PrismaAreaWeightReaderAdapter` consulta únicamente los seis UUID oficiales. Como defensa adicional, el mapeador ignora asociaciones a áreas desconocidas y registra una advertencia. Esas filas no aportan puntos ni deben causar el error 500 de BUG-RADAR-01.

El recálculo no corrige por sí mismo el catálogo: si PostgreSQL no tiene una asociación válida con Desarrollo de Software o Ciencia de Datos, la operación no inventa esa asociación. La corrección de datos debe revisarse por separado.

### Errores y comprobaciones

- `401` y `403`: autenticación, permisos y alcance.
- `503`, `NLP_DICTIONARY_UNAVAILABLE`: diccionario ausente, vacío o no utilizable. No debe guardarse un cálculo parcial por ese fallo.
- Otros fallos internos conservan el tratamiento global de errores; la corrección de #981 no garantiza ausencia de cualquier posible error de infraestructura.

Verificar dos POST consecutivos sin cambios, recálculos simultáneos, incorporación y retiro de términos, saturación, más de cinco contribuciones, historial previo a M2 y asociaciones fuera del catálogo. La suite `radar-top-keywords.e2e.spec.ts` incluye la regresión HTTP de #981.

**Implementación:** `http/controllers/recalculate-radar.controller.ts`, `application/use-cases/recalculate-radar.use-case.ts`, políticas de `domain/policies` y `infrastructure/repositories/prisma-radar.repository.ts`, dentro del módulo Radar.

## 5. GET /api/v1/radar/certifications/:area

**Propósito:** listar certificaciones del perfil actual que tienen coincidencias con el área elegida.

**Permiso:** `radar:self:read`, además de alcance de titulado.

**Parámetro:** `area`, exactamente uno de los seis slugs canónicos. No se envía el UUID del área.

**Cuerpo:** ninguno.

**Éxito:** `200` con la siguiente estructura ilustrativa:

```json
{
  "data": {
    "area": "cloud-devops",
    "source": "current-profile",
    "certifications": [
      {
        "id": "identificador-de-la-certificacion",
        "title": "AWS Certified Cloud Practitioner",
        "issuer": "Amazon Web Services",
        "issuedYear": 2026,
        "hasBackup": false,
        "matchedKeywords": ["aws"]
      }
    ]
  }
}
```

El ejemplo ilustra los campos, no constituye una respuesta capturada de producción ni fija el resultado del diccionario de otro entorno. `issuedYear` puede ser nulo. El año se muestra como metadato y no aporta puntos al cálculo.

Se evalúan nombre y entidad emisora de cada certificación con NLP y con los pesos del área. Solo se incluyen las que obtienen puntos positivos. La selección evalúa las palabras de cada certificación y no se limita al top cinco del radar global.

`source: "current-profile"` significa que el panel consulta las certificaciones actuales. No reconstruye cuáles existían en una fecha histórica del radar. Si no hay certificaciones relacionadas, responde `200` con una lista vacía. La ausencia de respaldo no elimina una certificación de la lista.

La respuesta no incluye el contenido del archivo ni una valoración de autenticidad. `hasBackup` indica disponibilidad de respaldo; el enlace para abrirlo se solicita a Perfil.

**Errores:** `400` para un área que no pertenece al enum; `401`/`403` para acceso no autorizado; `503 NLP_DICTIONARY_UNAVAILABLE` cuando la operación requiere extracción y el diccionario no está disponible.

**Implementación:** `get-area-certifications.controller.ts`, `get-area-certifications.use-case.ts` y `prisma-certification-reader.adapter.ts`. Pruebas en el caso de uso y los adaptadores correspondientes.

## 6. GET /api/v1/radar/unmapped-keywords

**Propósito:** aportar información agregada para revisar candidatos a ampliación del diccionario, HU-15.

**Permiso:** `reportes:read`, asignado al administrador en la política revisada.

**Entrada:** no define filtros, paginación ni cuerpo.

**Éxito:** `200`, con `dictionaryVersion`, `totalTerms` e `items` dentro de `data`.

Cada elemento contiene:

- `term`: término normalizado.
- `totalFrequency`: suma de sus frecuencias guardadas.
- `graduatesCount`: cantidad de titulados distintos asociados al término.
- `lastDetectedAt`: última detección en ISO o nulo.

La lista se ordena por frecuencia total descendente, luego cantidad de titulados descendente y finalmente término ascendente. `totalTerms` indica la cantidad de términos agregados devueltos, no la suma de menciones. Una consulta sin datos devuelve cero y una lista vacía.

El contrato no expone ID, correo ni perfil individual del titulado. No debe interpretarse como garantía absoluta de anonimización: el campo `term` sigue siendo contenido textual y requiere el acceso administrativo establecido. Al corte no hay filtro de carrera ni endpoint de aprobación o modificación del diccionario dentro de esta ruta.

La versión devuelta procede de la constante `DICTIONARY_VERSION` del código del caso de uso. No sustituye consultar el registro de publicaciones del entorno para confirmar qué catálogo se cargó realmente. El agregado refleja las filas conservadas por titulado y término; no es un contador acumulado de todas las ejecuciones históricas.

**Efectos:** consulta de información persistida; no agrega términos al catálogo ni recalcula radares.

**Errores de acceso:** `401` sin sesión válida y `403` sin `reportes:read`.

**Implementación:** `get-unmapped-keywords-summary.controller.ts`, caso de uso del mismo nombre y consulta agregada de `prisma-radar.repository.ts`. Pruebas específicas del caso de uso y del repositorio.

## 7. POST /api/v1/nlp/extract

**Propósito:** extraer palabras canónicas y candidatos desconocidos de texto plano, sin calcular afinidad.

**Permiso:** `nlp:extract`, disponible para titulado y administrador.

**Tipo de contenido:** `application/json`.

**Entrada:** objeto estricto con una única propiedad `text`, cadena de hasta 5000 caracteres.

Ejemplo de solicitud:

```json
{ "text": "Uso JavaScript" }
```

Ejemplo ilustrativo de respuesta, con JavaScript disponible en el diccionario:

```json
{
  "data": {
    "keywords": [{ "term": "javascript", "count": 1 }],
    "unmapped": []
  }
}
```

`keywords` contiene términos canónicos reconocidos y su frecuencia. `unmapped` contiene candidatos no reconocidos con término y frecuencia, sujeto a las reglas de filtrado y al límite de 50 entradas. Los resultados se ordenan por conteo descendente y luego alfabéticamente.

La normalización y búsqueda reconocen alias y frases de hasta tres palabras. Se prioriza la coincidencia más larga y no se cruzan segmentos de texto. El algoritmo tiene reglas para consolidar alias adyacentes en aclaraciones; no interpreta semántica libre ni negaciones. El resultado no incluye pesos, áreas ni porcentajes: esos conceptos pertenecen a Radar.

Un texto vacío o de espacios es una entrada válida y, con el diccionario disponible, devuelve listas vacías. No es válido omitir `text`, enviarlo con otro tipo, exceder el máximo o añadir propiedades al objeto estricto.

### Carga del diccionario y errores

El cargador conserva el diccionario utilizable en memoria y comparte una carga en curso entre peticiones concurrentes. Si falla la lectura o no hay entradas utilizables, responde `503 NLP_DICTIONARY_UNAVAILABLE` y permite reintentar la carga en la siguiente petición. No se documenta como implementada una recarga automática en caliente de un catálogo ya cargado.

- `400`: cuerpo inválido o superior al límite.
- `401`: sesión ausente o inválida.
- `403`: falta de permiso; por ejemplo, rol empresa.
- `503`, `NLP_DICTIONARY_UNAVAILABLE`: diccionario no disponible para extraer.

**Efectos:** el endpoint no guarda un radar ni persiste los candidatos desconocidos. No recibe archivos ni URLs de documentos.

**Implementación:** `apps/api/src/modules/nlp/http/controllers/extract-keywords.controller.ts`, esquema HTTP, `keyword-extractor.service.ts` y `keyword-dictionary-loader.ts`. La prueba de contrato es `apps/api/test/nlp-extract.e2e.spec.ts`.

## 8. Dependencias de otros módulos

### 8.1 Perfil y apertura de respaldos

`GET /api/v1/perfil/certificaciones/:id/respaldo/enlace` pertenece a Perfil. Exige `perfil:self:read`, un ID válido y propiedad del respaldo. Devuelve `{ "data": { "url": "...", "expiraEn": "..." } }`. La vigencia configurada del enlace es de 300 segundos.

El enlace apunta a `GET /api/v1/perfil/respaldos/:id/archivo`, con los parámetros firmados `expira` y `firma`. La firma autoriza la lectura temporal del archivo; no se deben publicar enlaces reales en evidencias. El visor de Radar utiliza este flujo para JPG/PDF. La apertura de un adjunto no cambia su contribución al radar.

La emisión del enlace distingue respaldo inexistente (`BACKUP_NOT_FOUND`) y respaldo ajeno (`BACKUP_FORBIDDEN`), además de errores de autenticación y validación. La vigencia y firma se comprueban en el flujo de lectura del archivo.

Existe además `GET /api/v1/perfil/certificaciones/:id/respaldo`, una lectura autenticada del módulo Perfil. No debe confundirse con el enlace firmado usado por el visor. La carga, almacenamiento y validaciones documentales se mantienen bajo la responsabilidad de Perfil.

**Fuentes:** controladores `create-backup-link.controller.ts`, lectura de archivo firmado y `read-certification-backup.controller.ts`; `create-backup-link.use-case.ts` y `profile.presenter.ts`.

### 8.2 Autenticación

`GET /api/v1/auth/me` pertenece al módulo de Autenticación y permite comprobar la sesión del usuario en los recorridos de QA. No calcula afinidad ni concede permisos por sí mismo. Los controladores propios de Radar usan el actor verificado por la infraestructura de autenticación.

Una pantalla accesible en frontend no demuestra que su usuario tenga autorización backend. En particular, permitir al administrador navegar a una página del radar no le proporciona `radar:self:read` ni `graduateId`.

### 8.3 Salud de la API

`GET /health` es público, sin prefijo `/api/v1`. Ejecuta una comprobación `SELECT 1` en PostgreSQL y responde directamente:

```json
{ "status": "ok", "database": "ok" }
```

Si no puede acceder a la base responde `503 DATABASE_UNAVAILABLE`. Un `200` demuestra conectividad básica de API y base en ese instante; no demuestra disponibilidad del diccionario, correcta aplicación de todas las migraciones ni funcionamiento del radar completo.

## 9. Operaciones que no existen en este contrato

- No hay un `POST /api/v1/affinity/config` operativo para guardar pesos personales.
- No hay un endpoint de OCR o análisis de PDF/JPG dentro de Radar o NLP.
- No hay una consulta de radar ajeno por `graduateId` para empresas en estas rutas.
- No hay endpoint HTTP de incorporación automática de términos desconocidos al diccionario.
- No hay endpoint de historial completo ni de restauración de un cálculo anterior dentro del inventario propio descrito.

La publicación del diccionario se realiza mediante los scripts versionados del proyecto. No debe sustituirse por cargas manuales de datos no revisadas ni confundirse con la consulta de candidatos desconocidos.

## 10. Verificación y fuentes

Para verificar un candidato se debe registrar URL de API, SHA de frontend y backend, versión del diccionario, rol y resultado. Cubrir acceso sin sesión y con roles incorrectos; primer cálculo; entrada vacía; cambio de perfil; repetición sin cambios; contribuciones y explicación; certificaciones; resumen administrativo; indisponibilidad del diccionario y regresión de asociaciones ajenas. Los respaldos requieren sus casos propios de propietario, ausencia y vencimiento.

Las colecciones se encuentran en [Bruno Radar](https://github.com/umsspira/UMSSPIRA/tree/ecc71c426630b6d32255d9e5943b15453f605189/bruno/Radar). La evidencia reciente y las comprobaciones todavía pendientes se detallan en el reporte de la épica. Esta actualización documental no acredita una ejecución nueva en producción.

Fuentes fijadas a la base del corte:

- [Controladores Radar](https://github.com/umsspira/UMSSPIRA/tree/ecc71c426630b6d32255d9e5943b15453f605189/apps/api/src/modules/radar/http/controllers).
- [Casos de uso Radar](https://github.com/umsspira/UMSSPIRA/tree/ecc71c426630b6d32255d9e5943b15453f605189/apps/api/src/modules/radar/application/use-cases).
- [Presentador del vector](https://github.com/umsspira/UMSSPIRA/blob/ecc71c426630b6d32255d9e5943b15453f605189/apps/api/src/modules/radar/http/presenters/affinity-vector.presenter.ts).
- [Contrato compartido](https://github.com/umsspira/UMSSPIRA/blob/ecc71c426630b6d32255d9e5943b15453f605189/packages/shared-types/src/affinity.ts).
- [Controlador NLP](https://github.com/umsspira/UMSSPIRA/blob/ecc71c426630b6d32255d9e5943b15453f605189/apps/api/src/modules/nlp/http/controllers/extract-keywords.controller.ts).
- [Política de permisos](https://github.com/umsspira/UMSSPIRA/blob/ecc71c426630b6d32255d9e5943b15453f605189/apps/api/src/modules/user/domain/policies/access.policy.ts).
- [Controladores de Perfil](https://github.com/umsspira/UMSSPIRA/tree/ecc71c426630b6d32255d9e5943b15453f605189/apps/api/src/modules/profile/http/controllers).
- [Controlador de salud](https://github.com/umsspira/UMSSPIRA/blob/ecc71c426630b6d32255d9e5943b15453f605189/apps/api/src/shared/http/controllers/health.controller.ts) y [configuración HTTP](https://github.com/umsspira/UMSSPIRA/blob/ecc71c426630b6d32255d9e5943b15453f605189/apps/api/src/shared/http/configuration/configure-http.ts).
