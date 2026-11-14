# HU8: listado, detalle real y demostración

- Sin un `hu8Demo` válido, el listado usa `JobPostingsList`: búsqueda HU7 por título o empresa, paginación, actualización y afinidad HU10 para titulados. Los parámetros desconocidos o múltiples no activan la demo.
- La estructura visual HU8 conserva los controles de modo y la consulta por ID, plegada hasta solicitarla, con foco inicial, cierre por Escape y devolución del foco.
- El detalle real usa `VacancyDetailClient`: datos de empresa, habilidades de afinidad y requisitos estructurados con estados independientes.
- La consulta por ID y el detalle comparten el adaptador autenticado de `shared/services/technical-requirements.ts`. La importación original sigue disponible como reexportación. Usan `GET /api/v1/job-postings/:id/requisitos`, sin caché y con respuesta sin envoltorio `data`.
- La cabecera de navegación y sesión la proporciona el dashboard. El layout de vacantes conserva estilos, pie y enlace de salto; no añade otra cabecera. La navegación de demo conserva el escenario en controles, ofertas y regreso.
- La demo conserva los escenarios listado, carga, error/reintento, inexistente, sin-vacantes, sin-requisitos y actualizado. Usa exclusivamente fixtures locales; no llama al backend ni se activa ante errores reales.
- Las fechas demo se identifican como registro demo. Salir de la demo regresa al listado real sin arrastrar un ID de ejemplo.
- La consulta canónica lee `vacante_requisito_tecnico`; la fuente anterior `requisito_tecnico_vacante` es distinta y conserva sus rutas administrativas existentes. No se mezclan tablas, no hay fallback de lectura ni migración de datos.
- El contrato canónico admite BASICO, INTERMEDIO y AVANZADO. El nivel Experto de la fuente anterior no se convierte automáticamente.
- HU4 permanece preparado, sin registrar `IndexacionVacantesModule` ni su controlador provisional. El índice nuevo de HU7 y el índice anterior siguen separados.
