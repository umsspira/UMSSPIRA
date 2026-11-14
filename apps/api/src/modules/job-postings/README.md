# Publicación de vacantes

El módulo migra la publicación de vacantes existente en el backend anterior. Su contrato está en [endpoints](../../../docs/endpoints/epic05-grupo05-hu1.5.md). No incorpora todavía Elasticsearch, búsqueda ni administración posterior de vacantes.

La estructura sigue el mismo reparto que empresas: `domain/entities`, `domain/policies` y `domain/errors`; `application/contracts`, `application/ports` y `application/use-cases`; `http/controllers`, `http/presenters` y `http/schemas`; `infrastructure/providers`, `infrastructure/repositories` y `infrastructure/translators`.

La publicación existente declara POST y su permiso, valida el body con `job-postings.schemas.ts`, obtiene el actor verificado y llama al caso de uso. Este comprueba el scope y fija la fecha. El adaptador guarda el estado inicial PUBLICADO; el cliente no puede elegirlo ni declarar un propietario.

El repositorio utiliza la relación Prisma con una selección por empresa y usuario propietario. Eso conserva la frontera frente al esquema físico: no se presupone que usuario y empresa comparten UUID. El presenter expone solamente el resultado público.

Los campos de publicación ya existen en `schema.prisma`. Las entidades del dominio representan el resultado de la operación y el translator detecta registros incompletos; no se duplican modelos de base de datos dentro del módulo.

`GET /api/v1/job-postings` lista vacantes publicadas que ya están disponibles y no han vencido. `GET /api/v1/job-postings/:id` devuelve el detalle disponible junto con los requisitos técnicos obtenidos del servicio HU8 (`GET /api/v1/job-postings/:id/requisitos`). El porcentaje de afinidad se devuelve como `null` con `mensajeAfinidad` mientras HU9 no provea el cálculo; este módulo no calcula una afinidad alternativa. Una vacante inexistente, no publicada, programada para el futuro o vencida responde como no encontrada. Los errores de lectura de requisitos se propagan al manejador global y no se convierten en una lista vacía.
