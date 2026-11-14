# Publicación de vacantes y requisitos técnicos

El módulo conserva la publicación y el listado oficial de vacantes. La búsqueda textual opcional usa HU7 para seleccionar candidatos en Elasticsearch y recupera sus datos oficiales mediante Prisma.

La estructura sigue el mismo reparto que empresas: `domain/entities`, `domain/policies` y `domain/errors`; `application/contracts`, `application/ports` y `application/use-cases`; `http/controllers`, `http/presenters` y `http/schemas`; `infrastructure/providers`, `infrastructure/repositories` y `infrastructure/translators`.

La publicación existente declara POST y su permiso, valida el body con `job-postings.schemas.ts`, obtiene el actor verificado y llama al caso de uso. Este comprueba el scope y fija la fecha. El adaptador guarda el estado inicial PUBLICADO; el cliente no puede elegirlo ni declarar un propietario.

El repositorio utiliza la relación Prisma con una selección por empresa y usuario propietario. Eso conserva la frontera frente al esquema físico: no se presupone que usuario y empresa comparten UUID. El presenter expone solamente el resultado público.

Los campos de publicación ya existen en `schema.prisma`. Las entidades del dominio representan el resultado de la operación y el translator detecta registros incompletos; no se duplican modelos de base de datos dentro del módulo.

`GET /api/v1/job-postings` lista vacantes publicadas que no hayan vencido, y `GET /api/v1/job-postings/:id` devuelve el detalle disponible. En ambos endpoints, para titulados el campo `porcentajeAfinidad` corresponde al perfil del actor autenticado y se calcula como la proporción de habilidades requeridas distintas que coincide con las áreas declaradas o aparece como frase completa en la descripción profesional, experiencia o certificaciones de su perfil. Las habilidades requeridas proceden de `requerimiento_habilidad` y el perfil siempre se resuelve desde el scope del actor autenticado. Si la vacante no tiene requisitos de habilidad asociados o el actor no tiene perfil de titulado, la afinidad es `null`; si existen requisitos pero no hay coincidencias, devuelve `0`. El cálculo es dinámico y no reutiliza un `porcentaje_match` de postulaciones anteriores. Una vacante inexistente, cerrada o vencida responde como no encontrada.

## Búsqueda del listado oficial (HU7)

`GET /api/v1/job-postings?search=texto&page=1&limit=10` conserva la respuesta `{ data }`, la sesión obligatoria y la afinidad calculada con el perfil del actor autenticado. El texto busca título y empresa; no acepta UUID ni documentos del cliente como sustitutos de la consulta. El texto admite hasta 200 caracteres, `page` es entero positivo, `limit` va de 1 a 100 y la ventana máxima es de 10000 candidatos. Sin texto o con texto en blanco se mantiene el listado completo y el orden anteriores, sin consultar Elasticsearch ni aplicar paginación nueva.

HU7 solo aporta los identificadores de una página, ordenados por `created_at` descendente e `id` ascendente. Prisma vuelve a filtrar publicación y cierre usando el mismo instante de referencia de la búsqueda. Los campos mostrados y los requisitos usados para afinidad provienen de Prisma, nunca del índice. La afinidad conserva sus reglas y no se usa para reordenar los resultados. El detalle y los requisitos HU8 vuelven a comprobar disponibilidad al abrirse.

Un índice desactualizado puede aportar UUID eliminados, cerrados o vencidos: se excluyen y la página puede quedar corta o vacía. No se rellena con otra página ni se expone el total del índice como conteo oficial. Una página vacía no demuestra que las siguientes estén vacías; el listado permite seguir navegando hasta el límite de la ventana. Las vacantes nuevas ausentes del índice no aparecen al buscar. Las ediciones pueden conservar coincidencias textuales u orden obsoletos hasta resincronizar. Esta integración no ofrece una instantánea entre peticiones: las actualizaciones del índice también pueden desplazar resultados entre páginas.

Si HU7 o su índice separado no están disponibles, la búsqueda responde con 503; no se sustituye silenciosamente por todo el listado. El listado sin texto sigue sin depender de HU7. La configuración compartida usa `ELASTICSEARCH_INDEX_JOB_POSTINGS` (`job-postings-v1` por defecto), separado del índice anterior. Registrar la lectura de HU7 no activa `IndexacionVacantesModule`, sus controladores ni eventos automáticos; poblar y mantener ese índice queda pendiente. Los enlaces de las tarjetas siguen apuntando a `/job-postings/:id`.

## Requisitos técnicos (HU2)

`GET /api/v1/job-postings/:vacancyId/technical-requirements` recupera los requisitos de una vacante; `PUT` en la misma ruta reemplaza su lista completa. Ambas rutas exigen sesión, el permiso `vacantes:create` y el alcance de empresa de la vacante. El body de `PUT` contiene `requisitos`, con hasta 50 elementos: `competenciaTecnica`, `nivelEsperado` (`BASICO`, `INTERMEDIO`, `AVANZADO`), `tipo` (`OBLIGATORIO`, `DESEABLE`) y `descripcion` opcional (cadena vacía permitida).

La API normaliza competencias para evitar duplicados dentro de una vacante y reemplaza la colección dentro de una transacción. La interfaz permite agregar, editar y quitar elementos antes de guardar. Para invocaciones con cookies, `PUT` también requiere el token CSRF global.

La implementación usa SQL parametrizado sobre `public.vacante_requisito_tecnico`, incluido en `schema.prisma` y en la migración `20261110183000_hu2_requisitos_tecnicos`. La migración ya se aplicó a la base Supabase configurada. El esquema y el SQL están descritos en [HU2: esquema y migración de requisitos técnicos](../../../../../docs/hu2-requisitos-tecnicos-esquema.md).

Para el flujo funcional, los criterios de aceptación, el contrato HTTP, las reglas de datos, la seguridad, las pruebas y las instrucciones de despliegue, consulta la [documentación completa de HU2](../../../../../docs/hu2-requisitos-tecnicos.md).
