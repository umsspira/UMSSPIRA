# Épica 2 · Rutas del backend

Perfil de Egresado (Equipo 7). Endpoints de `apps/api` que trabajó la épica 2. Primero los del Sprint 3 y al final los de los Sprints 1 y 2. Todas las rutas llevan el prefijo `/api/v1`, necesitan sesión iniciada (menos el archivo del respaldo con enlace firmado, del Sprint 2) y envuelven la respuesta en `{ data }`.

- **Titulado:** rol `titulado`. Cada ruta pide el permiso `perfil:self:read` (consultar) o `perfil:self:write` (crear, editar o eliminar), y solo trabaja con los registros del titulado que inició sesión.

Las colecciones de prueba están en `bruno/Perfil/` (una petición por endpoint). En el Sprint 1 también hubo una colección de Postman para la exportación (`collection/perfil-exportar.postman_collection.json`).

## Sprint 3 · Proyectos, foto, CV y ajustes de revisión · módulo `profile`

| Método | Ruta | Rol | Parámetros o cuerpo | Respuesta |
|---|---|---|---|---|
| POST | `/perfil/proyectos` | Titulado | `nombre` (hasta 150), `enlace` (https, hasta 500), `descripcion` (hasta 500), `tecnologias` (opcional, hasta 300) | 201 con el proyecto. 400 si el enlace no empieza con `https://` |
| GET | `/perfil/proyectos/:id` | Titulado | `id` del proyecto | El proyecto. 404 si no existe, 403 si no es del titulado |
| PUT | `/perfil/proyectos/:id` | Titulado | Mismos campos y validaciones que al crear | El proyecto actualizado. 403 si no es del titulado |
| DELETE | `/perfil/proyectos/:id` | Titulado | — | Elimina solo ese proyecto. 404 si no existe, 403 si no es del titulado |
| GET | `/perfil` | Titulado | — | Ahora incluye `proyectos` junto con las otras tres secciones |
| PUT | `/perfil/foto` | Titulado | Archivo en el campo `foto` (multipart) | 204 sin cuerpo. 400 si no es JPG o pasa de 5 MB: «La foto debe ser JPG de máximo 5 MB.» |
| GET | `/perfil/foto` | Titulado | — | La imagen de la foto, solo con sesión y sin caché compartida |
| PUT | `/perfil/cv` | Titulado | Archivo PDF en el campo `archivo` (multipart) | Datos del CV guardado. 400 si no es PDF («El CV debe ser un archivo PDF») o pasa de 4 MB («El archivo supera el tamaño máximo de 4 MB») |
| GET | `/perfil/cv` | Titulado | — | El PDF del CV, para verlo en el navegador (`inline`) |
| POST | `/perfil/certificaciones/:id/respaldo` | Titulado | Archivo en el campo `archivo` | Cambia el respaldo (HU-18). Ahora acepta PDF o JPG de hasta 4 MB: «Solo se aceptan archivos PDF o JPG de hasta 4 MB» |
| POST | `/perfil/experiencia-laboral` y `PUT /perfil/experiencia-laboral/:id` | Titulado | Mismo cuerpo del Sprint 1 | 409 «Ya tienes dos trabajos actuales» si el titulado ya tiene dos experiencias sin fecha de fin (HU-21) |

- Los proyectos usan las rutas genéricas `/perfil/:section/:id` con `section = proyectos`, igual que las otras secciones. Solo el `POST` tiene ruta propia: `/perfil/proyectos`.
- Los tres archivos (foto, CV y respaldo) se validan por el contenido (los primeros bytes) y no por el tipo que manda el navegador.
- Límites: respaldo y CV, 4 MB reales por el tope de Vercel (el criterio de la HU-18 decía 5 MB). La foto sigue en 5 MB y solo JPG.
- El límite de dos trabajos actuales se revisa en la base de datos, con el titulado bloqueado, para que dos peticiones a la vez no lo pasen.

## Sprint 2 · Descripción profesional y visor de respaldo · módulo `profile`

| Método | Ruta | Rol | Parámetros o cuerpo | Respuesta |
|---|---|---|---|---|
| GET | `/perfil/descripcion-profesional` | Titulado | — | La descripción profesional guardada |
| PUT | `/perfil/descripcion-profesional` | Titulado | `descripcionProfesional` (de 1 a 5000 caracteres) | La descripción guardada. 400 si está vacía o pasa del máximo |
| GET | `/perfil/certificaciones/:id/respaldo/enlace` | Titulado | `id` de la certificación | `url` del archivo y `expiraEn`. El enlace dura 5 minutos. 403 si el respaldo no es del titulado |
| GET | `/perfil/respaldos/:id/archivo` | Enlace firmado | `id` de la certificación, `expira`, `firma` y, para descargar, `descargar=1` | El archivo del respaldo. Se rechaza si la firma no coincide o el enlace venció |

- La descripción profesional se guarda en una fila por titulado.
- El enlace firmado lo genera la propia API con una firma HMAC; la ruta del archivo no pide sesión, solo la firma válida.
- Los respaldos de certificación se guardan en la base de datos. `GET /perfil/certificaciones/:id/respaldo` sigue sirviendo el archivo con sesión.
- Las rutas de registros del Sprint 1 se usaron en el Sprint 2 con el mismo contrato: `POST` de certificaciones con su respaldo (HU-08) y `PUT` y `DELETE` de registros, con 403 si no son del titulado (HU-09).

## Sprint 1 · Perfil profesional del titulado · módulo `profile`

Rutas con el prefijo `/perfil`. En el Sprint 1 el módulo tenía tres secciones: formación académica, experiencia laboral y certificaciones.

### Guardar

| Método | Ruta | Rol | Cuerpo | Respuesta |
|---|---|---|---|---|
| POST | `/perfil/formacion-academica` | Titulado | `institucion`, `titulo`, `grado`, `anioEgreso` | 201 con el registro. 409 si ya existe una formación con la misma institución, título y año |
| POST | `/perfil/experiencia-laboral` | Titulado | `empresa`, `cargo`, `fechaInicio` y `fechaFin` (vacía si es el trabajo actual) | 201 con el registro |
| POST | `/perfil/certificaciones` | Titulado | `nombre`, `entidadEmisora`, `grado`, `anioEmision` | 201 con el registro |
| POST | `/perfil/certificaciones/:id/respaldo` | Titulado | Archivo de respaldo de la certificación | Guarda el respaldo. Rechaza el archivo si el formato o el tamaño no son válidos |

### Consultar

| Método | Ruta | Rol | Parámetros | Respuesta |
|---|---|---|---|---|
| GET | `/perfil` | Titulado | — | Datos del titulado y sus tres secciones, del registro más reciente al más antiguo |
| GET | `/perfil/:section/:id` | Titulado | `section`: `formacion-academica`, `experiencia-laboral` o `certificaciones`. `id` del registro | El registro. 404 si no existe, 403 si no es del titulado |
| GET | `/perfil/certificaciones/:id/respaldo` | Titulado | `id` de la certificación | El archivo de respaldo, servido por la API con sesión |
| GET | `/perfil/exportar-json` | Titulado | — | Archivo JSON con las tres secciones, con sangría de 2 espacios, para descargar como `perfil_[nombre]_[fecha].json` |

### Modificar

| Método | Ruta | Rol | Cuerpo | Respuesta |
|---|---|---|---|---|
| PUT | `/perfil/:section/:id` | Titulado | Mismos campos y validaciones que al crear | El registro actualizado. 409 si el cambio deja la formación duplicada. 403 si el registro no es del titulado |
| DELETE | `/perfil/:section/:id` | Titulado | — | Elimina solo ese registro. 404 si no existe, 403 si no es del titulado |

### Reglas de validación

- Todos los campos de texto son obligatorios y tienen un largo máximo (institución, título, empresa y entidad: 150; cargo: 100; grado: 50).
- El año de egreso y el año de emisión no pueden ser futuros. El año de emisión de una certificación va de 1980 al año actual.
- Las fechas de una experiencia no pueden ser futuras ni anteriores al 1 de enero de 1950, y la fecha de fin no puede ser anterior a la de inicio.
- El respaldo de una certificación se verifica por el contenido del archivo y no por su nombre. En el Sprint 1 aceptaba JPG de hasta 5 MB. El límite vigente se explica en el Sprint 3.
- El archivo de respaldo se guarda en la base de datos con Prisma, no en un almacenamiento de archivos aparte.

## Módulos del backend

| Carpeta | Contenido |
|---|---|
| `apps/api/src/modules/profile/` | Perfil del titulado con arquitectura hexagonal: `domain`, `application/use-cases`, `http/controllers` (un controlador por endpoint), `http/schemas` (Zod), `http/presenters` e `infrastructure` (Prisma) |
