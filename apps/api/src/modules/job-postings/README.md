# Publicación de vacantes

El módulo migra la publicación de vacantes existente en el backend anterior. Su contrato está en [endpoints](../../../docs/endpoints/epic05-grupo05-hu1.5.md). No incorpora todavía Elasticsearch, búsqueda ni administración posterior de vacantes.

La estructura sigue el mismo reparto que empresas: `domain/entities`, `domain/policies` y `domain/errors`; `application/contracts`, `application/ports` y `application/use-cases`; `http/controllers`, `http/presenters` y `http/schemas`; `infrastructure/providers`, `infrastructure/repositories` y `infrastructure/translators`.

El controlador declara POST y su permiso, valida el body con `job-postings.schemas.ts`, obtiene el actor verificado y llama al caso de uso. Este comprueba el scope y fija la fecha. El adaptador guarda el estado inicial PUBLICADO; el cliente no puede elegirlo ni declarar un propietario.

El repositorio utiliza la relación Prisma con una selección por empresa y usuario propietario. Eso conserva la frontera frente al esquema físico: no se presupone que usuario y empresa comparten UUID. El presenter expone solamente el resultado público.

Los campos de publicación ya existen en `schema.prisma`. Las entidades del dominio representan el resultado de la operación y el translator detecta registros incompletos; no se duplican modelos de base de datos dentro del módulo.

## Motor de afinidad laboral — HU-10

`CalculateJobPostingAffinity` es una operación interna, sin ruta HTTP ni escrituras.
Recibe un perfil y las vacantes ya autorizadas, y devuelve `{ vacancyId, result }[]`
en el mismo orden. Agrupar todas las vacantes de un perfil en una ejecución permite
extraer sus habilidades una sola vez. No hay caché global de habilidades.

`JOB_POSTING_AFFINITY_DATA` ofrece `readProfiles(userIds)` y
`readRequirements(vacancyIds)` con consultas agrupadas. El consumidor debe validar
permisos y alcance antes de solicitar esos IDs; este puerto interno no es una API
de acceso público. Los IDs de usuario y titulado se mantienen separados.

El perfil usa descripción vigente, formación, experiencia, certificaciones y
proyectos, incluidas tecnologías. Los campos se separan con saltos de línea al
invocar el NLP existente para evitar n-gramas entre campos. No depende de mentorías.

La completitud conserva provisionalmente la regla de postulación: un registro de
cada sección y descripción no vacía. Su flexibilización queda pendiente del PO.
La ausencia de habilidades reconocidas en un perfil completo produce 0 %.

La política base compara términos exactos normalizados, cuenta cada requisito
único una vez y redondea `cumplidos / total * 100` al entero más próximo.
`ready` incluye porcentaje, fecha ISO del servidor y comparación; `profile-incomplete`
y `no-requirements` tienen porcentaje y fecha nulos y comparación vacía.
Sin requisitos se devuelve `no-requirements` antes de evaluar el perfil o cargar NLP.
Un fallo del diccionario se propaga como `NLP_DICTIONARY_UNAVAILABLE`, reconocible
por el filtro global como dependencia no disponible (503), sin resultados ficticios.

Los contratos públicos y el límite de lote de 50 están en `packages/shared-types`.
Su validación HTTP, permisos por modo y errores individuales corresponden al futuro
endpoint de T10.5; persistir porcentaje/fecha corresponde a T10.4.

HU-11 puede sustituir la política de comparación. La base no equipara Java con
JavaScript; frente al cálculo web anterior algunos porcentajes pueden bajar.
Ese cambio debe explicarse al PO y al equipo de HU-11 antes de conectar las pantallas.
