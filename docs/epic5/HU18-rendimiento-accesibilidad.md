# HU-18 · Rendimiento y accesibilidad

En `/job-postings`, el listado conserva la tabla en escritorio y presenta sus filas en bloques con etiquetas visibles en pantallas pequeñas, sin exigir un ancho mínimo de 850 px. Cada enlace de detalle identifica la vacante para facilitar la navegación con lector de pantalla.

La afinidad usa el endpoint por lote de HU-10 y se conserva en el estado del listado mientras esté abierto: filtrar u ordenar no inicia un cálculo nuevo. Al actualizar vacantes se vuelve a consultar, evitando reutilizar datos de un perfil anterior. El radar expone una lista textual asociada al SVG; sus áreas pueden seleccionarse con teclado. La comparación de requisitos es una lista asociada a su botón y el diálogo de recálculo conserva y restaura el foco.

El contrato del backend utilizado está documentado en [HU-10: Servicio de matching](../../apps/api/docs/endpoints/epic5/HU10-servicio-matching.md). HU-18 no añade endpoints.

## Medición con datos reales de prueba

La prueba [`hu18-rendimiento-accesibilidad.spec.ts`](../../apps/web/e2e/hu18-rendimiento-accesibilidad.spec.ts) mide desde la navegación hasta que las 50 vacantes muestran su afinidad. Exige menos de 3000 ms y comprueba el listado a 1440 y 360 px. No intercepta ni simula respuestas.

1. Usar un entorno aislado de prueba con web compilada en modo producción, API y base de prueba; preparar exactamente 50 vacantes vigentes con requisitos y un titulado de prueba con perfil completo.
2. Guardar una sesión vigente de ese titulado en un archivo Playwright `storageState` **fuera del repositorio**. Por ejemplo, ejecutar `pnpm --filter web exec playwright codegen --save-storage "$env:TEMP\hu18-sesion.json" http://localhost:3001/login`, iniciar sesión manualmente y cerrar el navegador. El archivo contiene credenciales de sesión: no compartirlo ni subirlo a Git.
3. En PowerShell, con ambos servicios de prueba ya iniciados:

   ```powershell
   $env:E2E_BASE_URL = "http://localhost:3001"
   $env:HU18_RUN_REAL = "1"
   $env:HU18_STORAGE_STATE = "$env:TEMP\hu18-sesion.json"
   pnpm --filter web exec playwright test hu18-rendimiento-accesibilidad.spec.ts --project=chromium
   ```

Sin las tres variables la prueba se omite. Una prueba unitaria de un solo lote no demuestra por sí sola el objetivo de tiempo; registrar el resultado de esta medición y el entorno utilizado antes de dar HU-18 por terminada.

### Medición local

El 21 de noviembre de 2026, una ejecución en Chromium tardó **826 ms** hasta mostrar las 50 afinidades y pasó las comprobaciones del listado en escritorio y móvil. Se usaron datos ficticios en PostgreSQL 17 local con Docker, el frontend compilado para producción y la API compilada con `NODE_ENV=test`. Es una medición local puntual; no garantiza el mismo tiempo en otros entornos.

En el mismo entorno se comparó visualmente el listado de escritorio a 1440 × 900 con la versión anterior, usando las mismas 50 vacantes. También se comprobó con Narrador, con confirmación del usuario, la lectura del radar, el enlace de una vacante y el desglose, además de la navegación por teclado.
