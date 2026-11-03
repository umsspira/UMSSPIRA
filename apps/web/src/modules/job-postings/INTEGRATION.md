# HU8 — Modo real y demostración

- Sin `hu8Demo` válido, `/job-postings` utiliza el modo real. El listado permanece pendiente de integración. «Consultar por ID» abre y cierra el formulario; no hay una tarjeta permanente bajo el listado.
- El detalle real `/job-postings/[id]` consulta competencias únicamente con el adaptador oficial de fase 1, conservado junto con sus pruebas. El único acceso HTTP es `GET /job-postings/:id/requisitos`. No hay endpoints supuestos de listado ni detalle.
- «Activar demostración» abre `/job-postings?hu8Demo=listado`. Ambas pantallas muestran «Datos de demostración», y los enlaces de ofertas, regreso y navegación de HU8 conservan el escenario. «Volver al modo real» regresa al listado real sin llevar consigo un ID de ejemplo.
- Los ejemplos de `demo/fixtures.ts` proceden del frontend anterior: seis ofertas iniciales y dos del listado actualizado. Sus tipos son exclusivos de la demo. No se pasan por el adaptador oficial, no se guardan en cachés compartidas y ningún error real activa la demo.
- La demo no llama a `fetch`, a Supabase ni al backend. El formulario por ID de la demo busca únicamente en sus ejemplos y enlaza a sus detalles.
- «Probar estados» ofrece `listado`, `carga`, `error`, `inexistente`, `sin-vacantes`, `sin-requisitos` y `actualizado`. La carga se mantiene hasta cambiar de escenario. Reintentar el error recupera los ejemplos. Actualizar el listado inicial añade las dos ofertas originales adicionales.
- Las fechas de los ejemplos se identifican como «Registro (demo)»; no se presentan como fechas reales de publicación.
- El detalle demo recupera empresa, descripción, responsabilidades, competencias, beneficios y resumen lateral del original. Las competencias repetidas se deduplican sin inventar niveles que no estaban en los ejemplos.
- Postular, guardar, perfil de empresa y otras secciones siguen deshabilitados. La demo es de consulta.
- Una respuesta real vacía no confirma la existencia de la vacante; un 404 real tampoco se convierte automáticamente en «vacante inexistente».
- Pendiente del equipo: contratos y endpoints oficiales de listado/detalle, comprobación de existencia y validación con Supabase real.
