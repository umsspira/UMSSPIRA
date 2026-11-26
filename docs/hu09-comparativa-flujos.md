# HU09 — Comparativa de flujos antes y después

## Base y criterio de conteo

- **Antes:** commit `0b368ecb`, padre del primer cambio HU09 (`cd21a92a`).
- **Después:** commit `3b893a04`, con las tareas 2 a 5 integradas.
- Un paso es un toque/clic que activa un enlace o botón. No se cuentan desplazamientos, carga de páginas ni espera de red.
- La comparación parte de una sesión iniciada. Para guardar, el pase debe estar vigente y el usuario conectado. Para actualizar versión, debe haber una actualización detectada.
- Los conteos son una inspección reproducible de las rutas y controles del código; no son resultados de una sesión observada con usuarios. QA debe anotar los conteos observados en `docs/qa/hu09-conteo-pasos.md`.

## Comparación

| Tarea | Antes | Toques | Después | Toques | Diferencia |
| --- | --- | ---: | --- | ---: | ---: |
| Guardar un QR vigente | Inicio → Eventos → Mis pases → Abrir pase → Guardar sin conexión | 4 | Inicio → Mis códigos QR → Guardar nuevo QR en el pase vigente | 2 | −2 |
| Abrir un QR guardado sin conexión, en tamaño completo | Pantalla offline → Mis códigos QR → Abrir pase | 2 | Inicio/PWA sin conexión → Mis códigos QR → Ver QR | 2 | 0 |
| Actualizar caché desde una pantalla distinta de Inicio | Pantalla actual → Inicio → Configuración → Actualizar caché | 3 | Pantalla actual → Configuración → Actualizar caché | 2 | −1 |
| Aplicar una versión disponible desde una pantalla distinta de Configuración | Pantalla actual → Inicio → Configuración → Actualizar ahora | 3 | Pantalla actual → Configuración → Actualizar ahora | 2 | −1 |

## Lectura del resultado

Los accesos globales reducen un toque para llegar a caché y versión desde pantallas internas. El acceso de Inicio reduce dos toques al guardado de un pase vigente.

El flujo de consulta offline **no reduce el conteo esperado**: el Service Worker anterior ya mostraba «Mis códigos QR» en la pantalla offline. Antes y después se requieren dos toques para abrir el pase completo. El listado anterior también mostraba una vista previa pequeña del QR al llegar a «Mis códigos QR»; en el flujo actual, la lista offline espera a que se toque «Ver QR». Si QA considera esa vista previa suficiente para la tarea, el flujo actual incluso añade un toque. Esta diferencia debe resolverse antes de declarar que se cumple literalmente CA-05 para las cuatro tareas.

La visibilidad y el texto del acceso offline mejoraron, pero eso por sí solo no reduce el número de toques. No se contabilizan acciones irreversibles; su confirmación se conserva según CA-06.