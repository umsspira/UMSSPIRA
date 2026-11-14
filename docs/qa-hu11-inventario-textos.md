# T11.1 · Inventario de textos de Mi afinidad

Base revisada: `a35022f6`. Alcance: vista de afinidad del egresado, panel de inspección y bloque de respaldos. Este inventario sirve para cotejar T11.2 y CA-HU11-19.

## Textos que requieren corrección

- **Vista de afinidad — introducción y ranking.** «Visualiza la afinidad calculada a partir de los textos de tu perfil profesional» y «Áreas con mayor afinidad identificadas» requieren contexto. Explicar que el porcentaje representa coincidencias del perfil guardado con el catálogo y que no certifica competencia.
- **Vista de afinidad — estado vacío.** «Aún no podemos calcular tus áreas de mayor afinidad» presenta la ausencia de coincidencias como incapacidad para calcular. Usar un mensaje de ausencia de coincidencias e indicar qué datos guardar.
- **Radar — instrucción sin área seleccionada.** «Selecciona un área en el radar para ver el detalle de afinidad del titulado» debe indicar que se pueden consultar coincidencias de palabras clave.
- **Inspección — fuentes y limitaciones.** Precisar los diez campos: título e institución, cargo y empresa, nombre y entidad emisora, descripción profesional, y nombre, descripción y tecnologías de cada proyecto. Aclarar que los borradores, adjuntos y fechas quedan fuera del cálculo y que el motor puede contar palabras dentro de negaciones.
- **Inspección — lista de proyectos de la vista compartida.** «Proyectos asociados» suma palabras clave al cálculo, pero no aporta respaldos. El panel autenticado de Mi afinidad recibe un bloque de certificaciones para el área seleccionada. Si se muestra la lista alternativa, aclarar que los proyectos cuentan como fuente de palabras clave y no tienen archivo adjunto.

## Textos revisados del bloque de respaldos

- «Cargando certificaciones…» y «No se pudieron consultar las certificaciones de esta área» distinguen carga y error.
- «No se encontraron certificaciones relacionadas con esta área según los textos y el diccionario actual» describe el vacío tras una consulta exitosa.
- «Ver respaldo» y «Sin respaldo adjunto» describen la presencia del archivo. El año visible es informativo. La verificación del endpoint, el aislamiento por área y la apertura del visor corresponden a T11.3.
