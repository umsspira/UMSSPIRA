# Publicación de vacantes

El módulo migra la publicación de vacantes existente en el backend anterior. Su contrato está en [endpoints](../../../docs/endpoints/epic05-grupo05-hu1.5.md). Este módulo no implementa búsqueda; la edición y sincronización del índice se atienden desde `modules/vacantes`.

La estructura sigue el mismo reparto que empresas: `domain/entities`, `domain/policies` y `domain/errors`; `application/contracts`, `application/ports` y `application/use-cases`; `http/controllers`, `http/presenters` y `http/schemas`; `infrastructure/providers`, `infrastructure/repositories` y `infrastructure/translators`.

El controlador declara POST y su permiso, valida el body con `job-postings.schemas.ts`, obtiene el actor verificado y llama al caso de uso. Este comprueba el scope y fija la fecha. El adaptador guarda el estado inicial PUBLICADO; el cliente no puede elegirlo ni declarar un propietario.

El repositorio utiliza la relación Prisma con una selección por empresa y usuario propietario. Eso conserva la frontera frente al esquema físico: no se presupone que usuario y empresa comparten UUID. El presenter expone solamente el resultado público.

Los campos de publicación ya existen en `schema.prisma`. Las entidades del dominio representan el resultado de la operación y el translator detecta registros incompletos; no se duplican modelos de base de datos dentro del módulo.

## Sincronización de vacantes editadas

El endpoint `PATCH /api/v1/vacantes/:id` persiste los cambios y realiza un `PUT` en Elasticsearch con el ID de la vacante como `_id`. Así, una edición reemplaza el documento existente en lugar de crear duplicados. Se espera a que el índice refresque antes de responder correctamente.

Configurar `ELASTICSEARCH_URL`; `ELASTICSEARCH_INDEX` es opcional y por defecto usa `vacantes`; `ELASTICSEARCH_API_KEY` es opcional para autenticación ApiKey. El documento incluye los campos de la vacante, la descripción técnica, requisitos laborales y habilidades relacionadas. Si Elasticsearch no está configurado o rechaza la operación, la API responde con error en lugar de confirmar una sincronización incompleta.
