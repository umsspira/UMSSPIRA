# epic6-hu13 · Editar vacante validada

**Épica:** Estudios de Vacantes · **Prefijo:** `/api/v1/vacantes`
**Éxito:** `{ "data": ... }`
**Error:** `{ "error": { "code": "CODIGO", "message": "..." } }`; la validación añade `error.fields`.

Este reporte cubre la edición de una vacante propia por parte de la empresa, con validación de datos, protección contra doble envío y scoping por empresa.

## Endpoint

- `PATCH /api/v1/vacantes/:id` — actualizar campos de la vacante · requiere sesión.

## Autenticación y autorización

- `Authorization: Bearer <accessToken>`, o cookie de acceso válida (con cookie se exige `X-CSRF-Token`).
- Permiso: `@RequirePermissions('empresas:self:write')` (rol `empresa`).
- Scoping: la vacante debe pertenecer a la empresa del actor. Pueden editar el dueño (`empresa.id_usuario`) y los miembros activos (`empresa_usuario_registros.estado = 'activo'`), la misma regla que los endpoints de postulantes. Quien no cumple recibe `404` sin revelar si la vacante existe.

## Body (actualización parcial)

Todos los campos son opcionales, pero debe venir **al menos uno**. El schema es estricto: no se aceptan campos adicionales.

| Campo | Regla |
|---|---|
| `titulo` | string, 1-150, se recortan espacios |
| `modalidad` | enum `PRESENCIAL \| HIBRIDO \| REMOTO` (vocabulario del alta) |
| `nivel_experiencia` | string, 1-100 |
| `descripcion_tecnica` | string, 50-20000 |
| `estado` | string, 1-20 (lo usa la UI para pausar con `PAUSADA`; la unificación de estados es HU-14) |

Ejemplo:

```json
{
  "titulo": "Desarrollador web junior",
  "modalidad": "HIBRIDO",
  "nivel_experiencia": "Junior",
  "descripcion_tecnica": "Requisitos técnicos de la vacante con al menos cincuenta caracteres."
}
```

## Comportamiento

- Solo se escriben los campos enviados; el resto queda intacto.
- **Protección contra doble envío:** la actualización corre dentro de una transacción con `pg_advisory_xact_lock` por vacante; dos envíos simultáneos se serializan y el resultado es idéntico al de un solo envío.
- El frontend (`/empresa/mis-vacantes/[id]/editar`) mapea las etiquetas visibles del formulario ("Híbrido") al vocabulario canónico (`HIBRIDO`) antes de enviar.

## Respuesta `200`

Devuelve la vacante actualizada (shape del repositorio).

## Errores

- `400 VALIDATION_ERROR` — body fuera del schema, sin campos o con campos adicionales (`error.fields` detalla).
- `401 UNAUTHENTICATED` — sesión ausente, inválida o revocada, o CSRF faltante con cookie.
- `403 FORBIDDEN` — el actor no tiene el permiso `empresas:self:write`.
- `404 NOT_FOUND` — la vacante no existe o no pertenece a la empresa del actor.
- `500 INTERNAL_ERROR` — fallo inesperado.

## Pendiente relacionado

- **HU-12** (epic7): al guardar debe dispararse el recálculo de afinidad de las postulaciones. El punto de enganche queda marcado como `TODO(HU-12)` en `vacantes.service.ts`; depende del servicio de matching (HU-10).
- **HU-14** (epic8): unificación del vocabulario de estados y permisos del ciclo de vida.

## Pruebas

- `apps/api/src/modules/vacantes/vacantes.schemas.spec.ts` — reglas del schema.
- `apps/api/src/modules/vacantes/vacantes.service.spec.ts` — scoping (dueño/miembro/ajeno), campos parciales y bloqueo anti-doble-envío.
- `apps/api/src/modules/vacantes/vacantes.controller.routes.spec.ts` — ruteo HTTP real: 200 con datos validados, 400 con campos inválidos o adicionales, 404 del scoping, permiso requerido.
