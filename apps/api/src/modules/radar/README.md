# Radar de afinidad

El módulo calcula y consulta la afinidad del titulado con las seis áreas del radar. La lectura de textos vive en `infrastructure/adapters/prisma-profile-text-reader.adapter.ts`; la regla de afinidad y la persistencia no cambian en esta entrega.

## Descripción profesional vigente

El radar usa una sola descripción de `perfil_area`: la fila más antigua del titulado. La consulta es `findFirst` con el orden `fecha_creacion asc, id asc`. Si dos filas comparten fecha, el id menor define la fila vigente. Las demás filas no se concatenan ni se suman al texto de entrada.

La regla es la misma que aplica Perfil para mostrar y guardar la descripción (`prisma-profile.repository.ts`: `descriptionOrder`, `findDescription` y `saveDescription`). Perfil actualiza la fila vigente dentro de una transacción que bloquea el titulado; Radar solo lee esa fila. Una fila nueva agregada por otro proceso no reemplaza la vigente.

`PerfilArea` no tiene una restricción unique sobre `id_titulado`. La aplicación no crea duplicados desde la interfaz, pero datos legacy, seeds manuales o escrituras externas pueden dejar varias filas. Por eso el radar debe ordenar y limitar la lectura.

Con una sola fila, el hash de entrada del radar conserva el mismo valor que antes de este cambio. Con varias filas, el hash cambia una vez porque la entrada deja de incluir textos que no pertenecen a la descripción vigente.

Los guardados concurrentes de Perfil se serializan con el bloqueo de la fila del titulado y reutilizan la misma fila. El recálculo del radar usa `pg_advisory_xact_lock` para evitar cálculos duplicados; no modifica `perfil_area`.

## Pruebas

- Unitarias: `src/modules/radar/infrastructure/adapters/prisma-profile-text-reader.adapter.spec.ts`.
- Integración: `test/integration/profile-description-radar.integration.spec.ts`. Es opt-in; usa `TEST_DATABASE_URL` solo como servidor PostgreSQL local, crea una base temporal, aplica migraciones y la borra al terminar. No apuntar esa variable a una base de QA o producción.

## Criterios CA-9 A/B

No se encontró en el repositorio una prueba backend etiquetada CA-9 A/B. La cobertura existente de afinidad está en `test/affinity-profiles.spec.ts`; la lectura de la descripción vigente y la concurrencia se cubren en las pruebas nuevas de este módulo. No se agregó un vector A/B porque la historia no incluye sus valores esperados.

Comando de integración:

```bash
TEST_DATABASE_URL="postgres://postgres:umsspira_local@127.0.0.1:5432/postgres" \
pnpm --filter api test:integration -- --runTestsByPath test/integration/profile-description-radar.integration.spec.ts
```
