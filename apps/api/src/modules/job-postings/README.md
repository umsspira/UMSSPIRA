# Publicación de vacantes

El módulo migra la publicación de vacantes existente en el backend anterior. Su contrato está en [endpoints](../../../docs/endpoints/epic05-grupo05-hu1.5.md). No incorpora todavía Elasticsearch, búsqueda ni administración posterior de vacantes.

La estructura sigue el mismo reparto que empresas: `domain/entities`, `domain/policies` y `domain/errors`; `application/contracts`, `application/ports` y `application/use-cases`; `http/controllers`, `http/presenters` y `http/schemas`; `infrastructure/providers`, `infrastructure/repositories` y `infrastructure/translators`.

La publicación existente declara POST y su permiso, valida el body con `job-postings.schemas.ts`, obtiene el actor verificado y llama al caso de uso. Este comprueba el scope y fija la fecha. El adaptador guarda el estado inicial PUBLICADO; el cliente no puede elegirlo ni declarar un propietario.

El repositorio utiliza la relación Prisma con una selección por empresa y usuario propietario. Eso conserva la frontera frente al esquema físico: no se presupone que usuario y empresa comparten UUID. El presenter expone solamente el resultado público.

Los campos de publicación ya existen en `schema.prisma`. Las entidades del dominio representan el resultado de la operación y el translator detecta registros incompletos; no se duplican modelos de base de datos dentro del módulo.

`GET /api/v1/job-postings` lista vacantes publicadas que no hayan vencido, y `GET /api/v1/job-postings/:id` devuelve el detalle disponible. Para titulados, el detalle calcula `porcentajeAfinidad` como la proporción de habilidades requeridas distintas que coincide con las áreas declaradas o aparece como frase completa en la descripción profesional, experiencia o certificaciones de su perfil. Las habilidades requeridas proceden de `requerimiento_habilidad` y el perfil siempre se resuelve desde el scope del actor autenticado. Si la vacante no tiene requisitos de habilidad asociados o el actor no tiene perfil de titulado, la afinidad es `null`; si existen requisitos pero no hay coincidencias, devuelve `0`. El cálculo es dinámico y no reutiliza un `porcentaje_match` de postulaciones anteriores. Una vacante inexistente, cerrada o vencida responde como no encontrada.
