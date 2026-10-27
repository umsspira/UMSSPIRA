# HU-11 · T-11.2 — Bruno

## Preparación

1. Copia la carpeta `HU11-T11.2-Bruno` dentro del directorio `bruno/` de UMSSPIRA, junto a `Backoffice`.
2. Selecciona el entorno que tenga `baseUrl` y `accessToken` de **un administrador autenticado**. En el ZIP original, `bruno/Auth/001-login.bru` muestra `/api/v1/auth/login`. Copia `data.accessToken` del login a la variable de entorno `accessToken`.
3. En `folder.bru` completa `hu112ExpectedAdminId` (ID REAL obtenido de la sesión validada) y `hu112ExpectedAdminEmail`. No introduzcas credenciales en archivos que vayas a subir a Git.
4. Crea **tres solicitudes de prueba distintas en estado PENDIENTE**, de una carrera que el administrador tenga permiso para revisar. Coloca sus UUID en `hu112ApprovedId`, `hu112RejectedId` y `hu112ObservedId`. No uses solicitudes reales ni IDs ficticios.
5. Ejecuta los archivos en orden. `001`, `005` y `007` modifican irrevocablemente el estado de las solicitudes de prueba. Si necesitas repetir la colección, crea nuevos expedientes y actualiza sus IDs.

## Pruebas

| Archivo | Resultado esperado |
| --- | --- |
| 001 | POST aprobación, HTTP 201, autoría de sesión |
| 002 | POST sobre aprobada, HTTP 409 + `APPLICATION_ALREADY_REVIEWED` |
| 003 | POST con campos falsificados de autoría, HTTP 400 |
| 004 | POST sin autenticación, HTTP 401 |
| 005 | POST rechazo, HTTP 201, autoría de sesión |
| 006 | POST sobre rechazada, HTTP 409 + `APPLICATION_ALREADY_REVIEWED` |
| 007 | POST observación, HTTP 201, autoría de sesión |
| 008 | GET detalle, HTTP 200 + `data.reviewAuthor` persistido |

**Nota:** NestJS devuelve habitualmente 201 en POST sin `@HttpCode`; verifica el controlador desplegado. `reviewedByEmail`, `reviewedByName` y `reviewAuthor` requieren los cambios de T-11.2 que acabas de añadir. El código del ZIP antiguo aún no los expone.

**Concurrencia:** el flujo secuencial de Bruno no demuestra `FOR UPDATE` funcionando entre dos transacciones. Para CA-11.5 faltará ejecutar dos llamadas simultáneas con tokens de dos administradores contra una cuarta solicitud PENDIENTE, y comprobar que solo una se confirma, la otra devuelve 409 y que existe un solo dictamen nuevo. Prueba exclusivamente en tu base de datos de desarrollo.

**Seguridad:** nunca guardes access tokens reales ni contraseñas en estos `.bru`. No uses la base de producción.
