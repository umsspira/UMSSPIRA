# epic5-grupo2-hu003 · Postularme a una vacante

**Épica:** Estudios de Vacantes · **Prefijo:** `/api/v1/vacantes`  
**Éxito:** `{ "data": ... }`  
**Error:** `{ "error": { "code": "CODIGO", "message": "..." } }`; validación añade `error.fields`.

Este reporte cubre la postulación del titulado a una vacante disponible con su perfil profesional, dejando enlazados al titulado y la vacante para que la empresa lo vea entre los postulantes.

## Endpoints

- `POST /api/v1/vacantes/:id/postulaciones` — postularse a una vacante disponible · requiere sesión.
- `GET /api/v1/vacantes/:id/postulaciones/mia` — consultar si el titulado ya se postuló · requiere sesión.

## Autenticación

- `Authorization: Bearer <accessToken>`, o cookie de acceso válida.
- Con cookie, se exige `X-CSRF-Token` en el POST.
- La postulación se registra siempre a nombre del actor autenticado (`actor.id`); el cuerpo de la solicitud no identifica al postulante.
- Solo los titulados pueden postularse; cualquier otro rol recibe `403`.

Permisos usados: ninguno adicional (`@RequirePermissions` no aplica). La restricción de rol se aplica en el servicio verificando la existencia del registro `titulado` del usuario.

---

## 1. Postularse a una vacante — `POST /api/v1/vacantes/:id/postulaciones`

Crea una fila en la tabla `postulacion` que enlaza al titulado autenticado con la vacante, con estado `postulado`. Es idempotente: repetir la solicitud no crea duplicados.

**Params de ruta**

- `id` — UUID de la vacante (validado con Zod; `400 VALIDATION_ERROR` si el formato es inválido).

**Body:** ninguno.

**Precondiciones verificadas en orden**

1. El actor tiene registro `titulado` (`403` en caso contrario).
2. El perfil profesional está completo: formación académica, experiencia laboral, certificaciones, proyectos y descripción profesional no vacía (`409 PROFILE_INCOMPLETE`).
3. La vacante existe y está disponible: estado `PUBLICADA | PUBLICADO | ACTIVA | ACTIVO` y `fecha_cierre` nula o futura (`409 JOB_POSTING_UNAVAILABLE`).

**Respuesta `200`**

```json
{
  "data": {
    "postulada": true,
    "yaExistia": false
  }
}
```

- `yaExistia: true` indica que el titulado ya estaba postulado y no se creó ninguna fila nueva.

**Errores**

- `400 VALIDATION_ERROR` — el id de la vacante no es un UUID válido.
- `401 UNAUTHENTICATED` — sesión ausente, inválida o revocada, o CSRF faltante con cookie.
- `403 FORBIDDEN` — el actor no es un titulado.
- `409 PROFILE_INCOMPLETE` — el perfil profesional del titulado está incompleto.
- `409 JOB_POSTING_UNAVAILABLE` — la vacante no existe, no está publicada o ya cerró.

---

## 2. Consultar mi postulación — `GET /api/v1/vacantes/:id/postulaciones/mia`

Indica si el titulado autenticado ya tiene una postulación registrada en esa vacante.

**Params de ruta**

- `id` — UUID de la vacante (validado con Zod).

**Respuesta `200`**

```json
{
  "data": {
    "postulada": true
  }
}
```

**Errores**

- `400 VALIDATION_ERROR` — el id de la vacante no es un UUID válido.
- `401 UNAUTHENTICATED` — sesión ausente, inválida o revocada.
- `403 FORBIDDEN` — el actor no es un titulado.

---

## Casos borde

- **Concurrencia:** dos postulaciones simultáneas del mismo titulado a la misma vacante solo crean una fila; se usa `pg_advisory_xact_lock` sobre el par usuario/vacante dentro de la transacción, con relectura antes de insertar.
- **Idempotencia:** una postulación ya existente responde `{ postulada: true, yaExistia: true }` sin escritura.
- **Vacante cerrada entre consulta y postulación:** la disponibilidad se reevalúa al momento de escribir; el estado y `fecha_cierre` los determina el servidor.
- **No se filtran datos de otras vacantes ni de otros titulados**; la respuesta incluye únicamente el estado de la postulación propia.
- **Visualización por la empresa:** la postulación creada aparece en `GET /api/v1/vacantes/:idVacante/postulantes` (operación existente, con verificación de propiedad de la vacante) y en la pantalla `/empresa/mis-vacantes/[id]/candidatos` con etapa `postulado`.
- **Campos no controlables por el cliente:** `estado`, `created_at` e `id` de la postulación los asigna el servidor.
