# INT-02: validación integrada del Sprint 3

Fecha de registro: 13 de noviembre de 2026.
Rama: `feat/G8-INT2-integratedValidation`.
Destino de integración previsto: `epic1`.
Responsables: coordinación del sprint y responsable de lectura OCR, con apoyo de integración.

## Estado y base documental

Plan de validación pendiente de ejecución. Este documento no acredita pruebas realizadas,
aprobación del equipo ni integración de las ramas consumidoras.

El alcance se deriva de los [acuerdos INT-01](int01-sprint-agreements.md) y de la
[matriz de aceptación](int01-acceptance-matrix.md), especialmente del caso P06.
La descripción detallada de INT-02 en la planificación oficial debe contrastarse antes
de cerrar la tarea; este registro no sustituye esa fuente.

## Objetivo

Validar los recorridos integrados de análisis documental y revisión humana.
Ante fallo, cancelación o vencimiento del análisis OCR, el expediente debe seguir
disponible y la decisión debe continuar bajo control de la revisión humana.
Una sugerencia OCR nunca debe emitir un dictamen ni enviar un correo por sí sola.

## Preparación

1. Identificar el commit integrado y las versiones de frontend, API y base de datos.
2. Verificar que estén disponibles los contratos de revisión vigente, reserva OCR,
   resultado compartido y acceso al documento correspondiente a cada revisión.
3. Preparar muestras sintéticas del catálogo M01-M14 con archivo, hash y transcripción.
4. Registrar navegador, versión, equipo, motor OCR, modelo y condiciones de caché.
5. Usar dos sesiones para comprobar reservas y resultados compartidos cuando corresponda.

Los recorridos que dependan de funcionalidades aún no integradas se registran como
bloqueados, indicando la dependencia; no se consideran aprobados.

## Casos de validación

| Caso | Acción | Resultado esperado | Estado |
| --- | --- | --- | --- |
| INT02-01 | Abrir un expediente e iniciar OCR con un respaldo legible | Resultado asociado a la revisión vigente, con evidencia consultable y sin dictamen automático | Pendiente |
| INT02-02 | Buscar, filtrar y navegar mientras se analiza un respaldo | Interfaz disponible según el presupuesto de respuesta de INT-01 | Pendiente |
| INT02-03 | Provocar un fallo de lectura o de inicialización del motor | Fallo controlado; expediente y respaldo accesibles; revisión manual disponible | Pendiente |
| INT02-04 | Cancelar un análisis en curso | Liberación de Worker, PDF, canvas y blobs; reserva liberada o recuperable según su contrato; ningún resultado tardío se aplica | Pendiente |
| INT02-05 | Superar el tiempo máximo del trabajo | Cancelación controlada y continuidad de revisión manual, sin dictamen automático | Pendiente |
| INT02-06 | Cerrar la pestaña o perder la reserva durante OCR | Reserva recuperable por vencimiento; resultado de la sesión anterior descartado cuando ya no sea vigente | Pendiente |
| INT02-07 | Abrir el mismo expediente desde dos sesiones | Una sola reserva activa para el mismo trabajo y resultado compartido de la revisión vigente | Pendiente |
| INT02-08 | Reenviar un documento y recibir después un resultado de la revisión anterior | Resultado antiguo excluido de la revisión vigente; historial conserva la relación con su documento | Pendiente |
| INT02-09 | Revisar manualmente un expediente cuyo OCR falló o fue cancelado | La decisión humana puede continuar mediante el flujo autorizado y la confirmación vigente | Pendiente |
| INT02-10 | Completar una decisión humana y repetir su confirmación | Consistencia de revisión y notificación, sin dictámenes ni correos duplicados | Pendiente |

Los casos de permisos, accesibilidad y móvil se coordinan con INT-05, INT-06 e INT-07.
La evidencia de cierre se entrega a INT-08. Esta tabla no acredita esas tareas.

## Registro de evidencia

Para cada ejecución registrar:

- ID del caso, fecha, commit y revisión del expediente de prueba.
- Entorno y muestra utilizada, identificada por ID y SHA-256.
- Pasos ejecutados, resultado esperado y resultado observado.
- Estado: aprobado, fallido o bloqueado; incidencia y dependencia cuando corresponda.
- Tiempos, método de medición de recursos y evidencia de liberación para P06.
- Evidencia de estado oficial y cantidad de notificaciones antes y después del recorrido.

Usar identificadores sintéticos y roles. No incluir nombres de personas, correos reales,
documentos personales, credenciales ni tokens en este registro o en sus evidencias.
Las mediciones ausentes permanecen pendientes; no se reemplazan por valores estimados.

## Criterio de cierre

Todos los casos aplicables deben contar con evidencia reproducible sobre el commit
integrado, sin fallos pendientes que impidan conservar el expediente o continuar la
revisión humana. Registrar las dependencias no disponibles y volver a ejecutar los
casos afectados tras su integración. La coordinación de integración revisa la evidencia
antes de dar por cerrada INT-02.
