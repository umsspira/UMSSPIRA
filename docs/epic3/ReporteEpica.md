# Reporte de Épica 3 · Radar de afinidad y NLP

Corte del 14 de noviembre de 2026. Responsable del reporte: Katherin Dominguez.

## Funcionalidad implementada

- **Extracción de palabras clave.** El módulo NLP normaliza el texto, reconoce términos y alias del diccionario y devuelve términos con sus frecuencias mediante `POST /api/v1/nlp/extract`. El radar asigna los pesos y las áreas por separado.
- **Radar del titulado.** La API calcula seis áreas y guarda el historial. La consulta detecta cambios comparando el hash de la entrada actual. Si se solicita un recálculo con los mismos textos, se reutiliza el resultado guardado. La interfaz muestra porcentajes, palabras clave, variación disponible y estados de carga, vacío y error.
- **Fuentes del perfil.** Radar lee título e institución, cargo y empresa, nombre y entidad emisora de certificaciones, descripción profesional vigente y nombre, descripción y tecnologías de proyectos. Para perfiles con varias descripciones, usa la primera fila por fecha de creación e identificador. Los enlaces, las fechas y los adjuntos quedan fuera del cálculo.
- **Certificaciones y respaldos.** El panel consulta las certificaciones relacionadas con el área elegida y muestra si hay un archivo adjunto. Perfil entrega el enlace firmado para abrir o descargar JPG y PDF. Se conservó la vista previa JPG del visor compartido de Perfil.
- **Estabilización y QA.** Se documentó el origen de Agile en una descripción histórica, se agregó el aviso de demostración en `/radar-preview` y se prepararon pruebas de permisos y colecciones Bruno/Postman. La migración M2 agregó columnas opcionales para la versión del diccionario y las contribuciones por palabra clave. El guardado y la explicación de M2 requieren sus tareas de implementación posteriores.

## Hallazgos durante la integración

- **Agile inicial.** La descripción que Radar leía históricamente incluía términos de Agile. La investigación mostró cómo eso aportaba 10 % a Gestión TI y permitió verificar la regla de descripción vigente.
- **Pruebas de Eventos.** Un fixture con fechas vencidas hizo fallar CI en `epic3`. El arreglo equivalente ya se integró en `dev` con #742 y la suite de Eventos pasó al probar ambas ramas juntas localmente.
- **Portafolio de Épica 2.** Proyectos amplió el alcance original a cinco fuentes. Al comparar las primeras ramas aparecieron dos definiciones del modelo y dos migraciones para la misma tabla. La combinación revisada con la rama más reciente de Épica 2 conservó un único modelo y una migración.
- **Visor de respaldos.** Cambiar el visor compartido eliminaba la vista previa JPG y rompía dos pruebas de Perfil. Se aisló la apertura de archivos de Radar. Pasaron las regresiones de Perfil y la simulación hacia `dev` quedó libre de ese conflicto.

## Evidencia y pendientes

- HU-9 y HU-10 están integradas en `epic3`. El candidato combinado pasó 41 pruebas de contrato y regresión. Queda contrastar los perfiles P1–P13 del anexo de QA y registrar la ejecución de las colecciones en el despliegue.
- HU-11 tiene inventario, textos y panel de respaldos integrados. Pasaron 90 pruebas para T11.5. El cierre de F-05 requiere comprobar JPG y PDF reales en el navegador. Queda acordar con Épica 2 la definición del contador y el flujo compartido.
- Proyectos pasó 38 pruebas de backend y el ajuste de textos pasó 56 pruebas web. Queda probar el recorrido crear, editar y eliminar desde Perfil y volver al Radar con la migración aplicada.
- La migración M2 pasó la validación de Prisma y el ensayo local preservó los datos históricos con las columnas nuevas en NULL. La BD de apoyo quedó fuera de ese ensayo.
- Para cerrar el despliegue se deben registrar los SHA de frontend y API, verificar las banderas de mock y ejecutar los casos A/B con cuentas de QA.

PRs de referencia: [HU-9 #668](https://github.com/umsspira/UMSSPIRA/pull/668), [HU-10 #693](https://github.com/umsspira/UMSSPIRA/pull/693), [respaldos #760](https://github.com/umsspira/UMSSPIRA/pull/760), [M2 #758](https://github.com/umsspira/UMSSPIRA/pull/758), [Proyectos #772](https://github.com/umsspira/UMSSPIRA/pull/772), [textos #773](https://github.com/umsspira/UMSSPIRA/pull/773) y [T11.5 #784](https://github.com/umsspira/UMSSPIRA/pull/784).
