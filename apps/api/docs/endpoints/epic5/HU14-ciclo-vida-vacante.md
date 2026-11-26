# HU-14 · Ciclo de vida de la vacante con permisos

## Vocabulario único de estados
Valores canónicos: `PUBLICADO`, `PAUSADO`, `CERRADO` (`job-posting-status.policy.ts`).
Los alias viejos (`PUBLICADA`, `ACTIVA`, `PAUSADA`, `CERRADA`…) se aceptan al leer y en el
body del PATCH, y se normalizan al canónico. En BD solo se escribe el canónico (migración
`20261120000000_epic5_hu14_unificar_estados_vacante`).

## Transiciones permitidas
| Desde | Hacia |
| --- | --- |
| PUBLICADO | PAUSADO, CERRADO |
| PAUSADO | PUBLICADO, CERRADO |
| CERRADO | ninguna (irreversible) |

Repetir el mismo estado es idempotente (200 sin reescribir). Una transición no permitida
responde `409 INVALID_JOB_POSTING_STATUS_TRANSITION`.

## Disponibilidad (regla única)
Una vacante está disponible si su estado es PUBLICADO y `fecha_cierre` es nula o futura
(`isJobPostingAvailable`). Si no, no aparece en el listado público ni acepta postulaciones,
y "mis postulaciones" la marca con `isVacancyAvailable: false`.

## Endpoints
| Método | Ruta | Permiso | Respuestas |
| --- | --- | --- | --- |
| PATCH | `/api/v1/vacantes/:id/cerrar` | `empresas:self:write` | 200, 400 (id no UUID), 403, 404 (vacante ajena), 409 |
| PATCH | `/api/v1/vacantes/:id` (campo `estado`) | `empresas:self:write` | 200, 400, 403, 404, 409 |
| DELETE | `/api/v1/vacantes/:id` | `empresas:self:write` | 200, 403, 404, 409 `JOB_POSTING_HAS_APPLICANTS` |

Pueden operar el dueño de la empresa y los miembros activos de `empresa_usuario_registros`.
Una vacante de otra empresa responde 404 sin revelar si existe.