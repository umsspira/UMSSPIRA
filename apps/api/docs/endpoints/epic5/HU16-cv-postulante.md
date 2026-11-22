# HU-16 CV del titulado

## Alcance

Estos endpoints permiten al titulado subir o reemplazar su CV en formato PDF y permiten a un reclutador descargarlo únicamente desde una postulación de una vacante perteneciente a su empresa.

El archivo se almacena en PostgreSQL, en la tabla existente `curriculum_vitae`. No se utiliza Supabase Storage.

## Autenticación

- Se requiere una sesión válida.
- El titulado usa los permisos `perfil:self:read` y `perfil:self:write`.
- El reclutador usa `empresas:self:read`.
- El alcance se verifica con la relación real entre usuario, titulado, empresa, vacante y postulación.

## Subir o reemplazar CV

```text
PUT /api/v1/perfil/cv
```

### Body

`multipart/form-data` con un único campo de archivo:

```text
archivo: curriculum.pdf
```

### Reglas

- Solo se aceptan archivos PDF.
- Se valida extensión y firma binaria `%PDF-`.
- El tamaño máximo es 5 MB.
- Si existe un CV, se reemplaza en la misma fila.

### Respuesta 200

```json
{
  "data": {
    "name": "curriculum.pdf",
    "size": 412000,
    "uploadedAt": "2026-11-20T12:00:00.000Z",
    "replaced": true
  }
}
```

### Errores

- `400 CV_REQUIRED` — no se adjuntó archivo.
- `400 INVALID_CV_TYPE` — el archivo no es un PDF.
- `400 CV_TOO_LARGE` — el archivo supera el tamaño máximo de 5 MB.
- `401 UNAUTHENTICATED` — sesión inválida.
- `403 GRADUATE_PROFILE_REQUIRED` — la cuenta no tiene perfil de titulado.

## Descargar mi CV

```text
GET /api/v1/perfil/cv
```

Devuelve los bytes del PDF con `Content-Type: application/pdf` y `Content-Disposition: inline`.

- `404 CV_NOT_FOUND` — el titulado todavía no subió su CV.

## Descargar CV desde una postulación

```text
GET /api/v1/vacantes/:idVacante/postulantes/:idPostulacion/cv
```

Devuelve los bytes del último CV del postulante con `Content-Disposition: attachment`.

La API verifica primero que la vacante pertenezca a la empresa del reclutador y luego que la postulación pertenezca a esa vacante. Un reclutador de otra empresa no puede usar el identificador de la URL para acceder al archivo.

- `404` — vacante, postulación o CV no encontrado.
- `401` — sesión inválida.
- `403` — falta el permiso empresarial.

## Integración

- T16.3 puede leer el bloque `cv` incluido en `GET /api/v1/perfil` para mostrar nombre, tamaño y fecha.
- T16.4 puede usar la ruta de descarga de la postulación; no debe consultar la tabla ni construir URLs públicas.
