# Infraestructura

repositories implementa los ports de aplicación mediante Prisma. translators convierte filas y relaciones a entidades propias; providers conecta implementaciones con casos de uso usando la inyección de Nest.

El repositorio aplica los mismos filtros y carreras a todos los formatos. La búsqueda parcial de SIS requiere una conversión SQL de NUMERIC a texto; los parámetros se vinculan con Prisma.sql. exporters implementa los ports de CSV/PDF y mantiene sus dependencias fuera del dominio.

Esta capa conoce nombres de tablas y herramientas externas. La capa application depende de sus interfaces, no de estas clases concretas.

La caché del tablero vive en `cache/AccreditationCache`, con conexión ioredis propia usando `REDIS_URL`; conserva TTL de cinco minutos y borra por prefijo mediante `SCAN`. El módulo exporta el port para Reports y el adaptador para que Surveys invalide la carrera afectada al guardar una respuesta.
