# T11.1 y T11.5 · Inventario de textos de Mi afinidad y cierre de F-10 y F-05

Base inicial revisada en T11.1: `a35022f6`. Base integrada verificada en T11.5: `22d6b6e4` (`epic3`).
Alcance: vista de afinidad del egresado, panel de inspección, bloque de respaldos y visor de respaldos.

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

---

## T11.5 · Revisión contra la tabla de fuentes y cierre de F-10 y F-05

### 1. Cotejo de textos contra la tabla de fuentes reales del motor (`F-10`)

| Fuente del perfil | Campos que analiza el motor | Campos que NO analiza el motor | Texto verificado en la interfaz (`epic3`) | Estado |
| :--- | :--- | :--- | :--- | :--- |
| **Formación académica** | `título`, `institución` | Grado académico, año, fechas, archivo adjunto | `radar-inspection.tsx` cita explícitamente «título e institución de formación» y aclara que las fechas y los archivos adjuntos quedan fuera del cálculo. | Cumple |
| **Experiencia laboral** | `cargo`, `empresa` | Fechas de inicio/fin, duración | `radar-inspection.tsx` cita explícitamente «cargo y empresa de experiencia laboral» y excluye fechas. | Cumple |
| **Certificaciones** | `nombre`, `entidad emisora` | Año de emisión, estado de validación, archivo JPG/PDF | `radar-inspection.tsx` y `radar-certifications-panel.tsx` citan «nombre y entidad emisora» y aclaran que los archivos adjuntos quedan fuera del cálculo. | Cumple |
| **Descripción profesional** | `descripción` vigente (`perfil_area`) | Filas históricas no vigentes | `graduate-affinity-view.tsx` y `radar-inspection.tsx` citan «descripción profesional» guardada en el perfil. | Cumple |
| **Proyectos** | `nombre`, `descripción`, `tecnologías` | Fechas, enlaces externos, archivos adjuntos | `radar-inspection.tsx` cita «nombre, descripción y tecnologías de los proyectos» y aclara que las fechas, los archivos adjuntos y los enlaces de los proyectos quedan fuera del cálculo. | Cumple |

### 2. Verificación de criterios de aceptación de la HU-11 (`CA-HU11-01` a `CA-HU11-07`)

| Criterio | Verificación en código y pruebas (`epic3` `22d6b6e4`) | Resultado |
| :--- | :--- | :--- |
| **CA-HU11-01** | `radar-inspection.tsx` enumera únicamente las fuentes y campos reales que lee el motor (formación: título e institución; experiencia: cargo y empresa; certificaciones: nombre y entidad emisora; descripción profesional; proyectos: nombre, descripción y tecnologías). | Aprobado |
| **CA-HU11-02** | Ningún componente (`graduate-affinity-view.tsx`, `affinity-radar.tsx`, `radar-inspection.tsx`, `radar-certifications-panel.tsx`, `radar-backup-viewer-modal.tsx`) afirma que grado, año, JPG, PDF, estado de validación, CV, foto o enlaces influyan en el porcentaje. | Aprobado |
| **CA-HU11-03** | Con banderas de mock apagadas, `RadarCertificationsPanel` consume `GET /api/v1/radar/certifications/:area`, filtra por área del titulado autenticado y abre respaldos reales en PDF y JPG mediante `RadarBackupViewerModal` (`GET /api/v1/perfil/certificaciones/:id/respaldo/enlace`) según las pruebas con datos simulados. Falta abrir y descargar archivos reales en QA. | Parcial |
| **CA-HU11-04** | El texto de estado vacío («No se encontraron certificaciones relacionadas con esta área según los textos y el diccionario actual») y la lista de certificaciones son consistentes y no presentan contadores contradictorios. | Aprobado |
| **CA-HU11-05** | `graduate-affinity-view.tsx` y `radar-inspection.tsx` muestran el aviso de interpretación del porcentaje («no mide ni certifica tu nivel de competencia»), la aclaración de que solo cuenta la información guardada («Los cambios que aún no hayas guardado no se incluyen en el cálculo») y la limitación sobre negaciones. | Aprobado |
| **CA-HU11-06** | La visualización de respaldos se resuelve de forma autónoma con `RadarBackupViewerModal` con un enlace firmado solicitado al módulo Perfil (`#760`), según el código y las pruebas locales. Falta comprobar la apertura en el despliegue. | Parcial |
| **CA-HU11-07** | Todos los textos visibles están redactados en español y sin emojis. La evidencia automatizada cubre los textos y el contrato de respaldos. Queda pendiente validar JPG y PDF reales en el navegador. | Parcial |

### 3. Dictamen de cierre de hallazgos

- **Hallazgo `F-10` (Textos del panel afirmaban usar información no analizada por el motor):** **CERRADO**. Incorporado en `#748`, `#762` y `#773`, verificado contra la tabla de fuentes reales.
- **Hallazgo `F-05` (Panel de respaldos con datos simulados y sin enlace real a PDF/JPG):** **Validado en código y pruebas automatizadas. Cierre en QA pendiente.** Incorporado en `#760` (`RadarCertificationsPanel` + `RadarBackupViewerModal` + `ReadSignedBackupController`), verificado con pruebas automatizadas de `image/jpeg` y `application/pdf`. Para cerrar el hallazgo, registrar el SHA desplegado, comprobar que el panel muestra datos reales con los mocks apagados y abrir y descargar ambos formatos en el navegador.
