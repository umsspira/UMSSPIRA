# Certificaciones relacionadas con un área del radar

`GET /api/v1/radar/certifications/:area` requiere sesión, `radar:self:read` y scope de titulado. El propietario se obtiene del actor autenticado; no admite consultar otro titulado por query.

Devuelve `{ data: { area, source: "current-profile", certifications } }`. Cada certificación incluye id, título, emisor, año, presencia de JPG y keywords coincidentes. Se relaciona por nombre y entidad emisora usando el extractor y los pesos vigentes, sin limitar la búsqueda al top 5 global. No analiza el JPG ni exige adjunto para relacionarla.

Esta lista describe el perfil actual: no constituye una atribución histórica del cálculo persistido ni modifica sus porcentajes, hash o fecha. Una certificación sin JPG se muestra como «Sin respaldo adjunto». El botón «Ver respaldo» reutiliza el visor autenticado de Perfil; la respuesta no entrega bytes ni enlaces firmados de antemano.

Un 0% significa que no se detectaron aportes en el cálculo mostrado, no que no existan certificaciones. La ausencia de coincidencias se informa únicamente tras completar correctamente la consulta; los fallos tienen un mensaje y reintento propios. No se inventan proyectos ni certificaciones.

Publicar primero el backend con este endpoint y después el frontend. No requiere migraciones. Con un backend anterior, la consulta puede responder 404 y el panel mostrará error, no ausencia de certificaciones.

## Persistencia del recálculo

Los términos no reconocidos se insertan o actualizan en un único lote parametrizado con ON CONFLICT. Se conservan los identificadores de términos existentes y se retiran los obsoletos únicamente del titulado calculado. El lote permanece dentro de la transacción del cálculo y de sus seis áreas, bajo el mismo bloqueo asesor. Un error revierte todo. No se amplían los tiempos de espera ni se cambia la fórmula.

Prueba PostgreSQL local optativa: configurar RADAR_PERSISTENCE_TEST_DATABASE_URL con una copia umsspira_qa o umsspira_fuego_* en localhost y ejecutar test/radar-batch-persistence.integration.spec.ts con jest.integration.config.cjs. La prueba rechaza destinos remotos y revierte las escrituras de ensayo.
