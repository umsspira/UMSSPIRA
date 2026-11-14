# Publicación de vacantes y requisitos técnicos

El módulo migra la publicación de vacantes existente en el backend anterior. No incorpora todavía Elasticsearch ni búsqueda.

La estructura sigue el mismo reparto que empresas: `domain/entities`, `domain/policies` y `domain/errors`; `application/contracts`, `application/ports` y `application/use-cases`; `http/controllers`, `http/presenters` y `http/schemas`; `infrastructure/providers`, `infrastructure/repositories` y `infrastructure/translators`.

La publicación existente declara POST y su permiso, valida el body con `job-postings.schemas.ts`, obtiene el actor verificado y llama al caso de uso. Este comprueba el scope y fija la fecha. El adaptador guarda el estado inicial PUBLICADO; el cliente no puede elegirlo ni declarar un propietario.

El repositorio utiliza la relación Prisma con una selección por empresa y usuario propietario. Eso conserva la frontera frente al esquema físico: no se presupone que usuario y empresa comparten UUID. El presenter expone solamente el resultado público.

Los campos de publicación ya existen en `schema.prisma`. Las entidades del dominio representan el resultado de la operación y el translator detecta registros incompletos; no se duplican modelos de base de datos dentro del módulo.

`GET /api/v1/job-postings` lista vacantes publicadas que no hayan vencido, y `GET /api/v1/job-postings/:id` devuelve el detalle disponible. En ambos endpoints, para titulados el campo `porcentajeAfinidad` corresponde al perfil del actor autenticado y se calcula como la proporción de habilidades requeridas distintas que coincide con las áreas declaradas o aparece como frase completa en la descripción profesional, experiencia o certificaciones de su perfil. Las habilidades requeridas proceden de `requerimiento_habilidad` y el perfil siempre se resuelve desde el scope del actor autenticado. Si la vacante no tiene requisitos de habilidad asociados o el actor no tiene perfil de titulado, la afinidad es `null`; si existen requisitos pero no hay coincidencias, devuelve `0`. El cálculo es dinámico y no reutiliza un `porcentaje_match` de postulaciones anteriores. Una vacante inexistente, cerrada o vencida responde como no encontrada.

## Requisitos técnicos (HU2)

`GET /api/v1/job-postings/:vacancyId/technical-requirements` recupera los requisitos de una vacante; `PUT` en la misma ruta reemplaza su lista completa. Ambas rutas exigen sesión, el permiso `vacantes:create` y el alcance de empresa de la vacante. El body de `PUT` contiene `requisitos`, con hasta 50 elementos: `competenciaTecnica`, `nivelEsperado` (`BASICO`, `INTERMEDIO`, `AVANZADO`), `tipo` (`OBLIGATORIO`, `DESEABLE`) y `descripcion` opcional (cadena vacía permitida).

La API normaliza competencias para evitar duplicados dentro de una vacante y reemplaza la colección dentro de una transacción. La interfaz permite agregar, editar y quitar elementos antes de guardar. Para invocaciones con cookies, `PUT` también requiere el token CSRF global.

La implementación usa SQL parametrizado sobre `public.vacante_requisito_tecnico`, incluido en `schema.prisma` y en la migración `20261110183000_hu2_requisitos_tecnicos`. La migración ya se aplicó a la base Supabase configurada. El esquema y el SQL están descritos en [HU2: esquema y migración de requisitos técnicos](../../../../../docs/hu2-requisitos-tecnicos-esquema.md).

Para el flujo funcional, los criterios de aceptación, el contrato HTTP, las reglas de datos, la seguridad, las pruebas y las instrucciones de despliegue, consulta la [documentación completa de HU2](../../../../../docs/hu2-requisitos-tecnicos.md).
