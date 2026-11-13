# INT-01: alcance y acuerdos técnicos del Sprint 3

Fecha de registro: 12 de noviembre de 2026. Sprint: 11 al 28 de noviembre de 2026.
Responsable: coordinación del sprint. Apoyo y revisión: coordinación de integración.
Rama: `feat/G8-INT1-sprintAgreements`. Destino de integración: `epic1`.

## Estado y fuentes

Este registro fija la línea base técnica propuesta para las tareas dependientes.
La revisión de la coordinación de integración, la aceptación del equipo y las mediciones en equipos administrativos
quedan pendientes; este documento no acredita reuniones, aprobaciones ni pruebas ejecutadas.
Las implementaciones ya existentes se contrastarán con esta línea base antes de integrarlas.

Fuentes: planificación oficial de Épica 1, página 20 (INT-01), páginas 2-12 (HU-13 a HU-18),
y plan de ramas G8, páginas 1-2, 6 y 8-12. Se prioriza la planificación oficial para el
contenido funcional: el plan de ramas conserva nombres de HU y bugs que no coinciden
con ella. Para INT-01 se conserva el nombre explícito `sprintAgreements` del plan de ramas.
Base consultada: `origin/epic1`, commit `b29fe3c1`.

## Alcance, prioridad y responsables

| Bloque | Resultado verificable | Responsable principal / apoyo |
| --- | --- | --- |
| INT-01 | Muestras, presupuestos OCR, reglas y límites de consulta documentados | coordinación del sprint / coordinación de integración |
| INT-03 y INT-04 | Revisión única, concurrencia y migraciones preservando solicitudes | responsable de base de datos / responsable de backend y coordinación de integración, respectivamente |
| HU-13 | Reserva por revisión, lectura en Worker, hallazgos y resultado compartido | coordinación del sprint, responsable de lectura OCR y responsable de base de datos según tareas 13.1-13.6 |
| HU-14 | Expediente, comprobación humana y confirmación vigente con correo único | responsable de frontend, responsable de comparación visual y responsable de backend según tareas 14.1-14.5 |
| HU-15 | Avisos de calidad y calibración del respaldo | coordinación de integración y responsable de interfaz |
| HU-16 | Motivos múltiples, explicación única y canales consistentes | responsable de motivos y validación móvil, responsable de interfaz y responsable de backend |
| HU-17 | Historial y acceso al documento de cada revisión | responsable de base de datos, responsable de lectura OCR y responsable de historial visual |
| HU-18 | Consulta por correo sin revelar existencia ni modificar dictámenes | responsable de backend, coordinación de integración y responsable de consulta pública |
| BUG-01 a BUG-18 | Corregir incidencias de la planificación oficial | Titular de cada BUG; la coordinación de integración coordina integración |
| MAIL-01 a MAIL-03 | Estilo común, envío y límites según planificación oficial | Titular de cada MAIL; la coordinación de integración coordina integración |
| INT-02, INT-05 a INT-08 | Validación integrada, permisos, accesibilidad, móvil y entrega | coordinación del sprint, responsable de backend, responsable de frontend, responsable de motivos y validación móvil y responsable de lectura OCR |

Se mantiene el alcance de seis mejoras, 26 tareas de HU y 29 tareas independientes.
Ante capacidad insuficiente se atienden primero versión, permisos, bugs que bloquean
recorridos, reserva OCR y decisión humana; luego presentación, calidad y consulta pública.
La coordinación del sprint registra el ajuste de alcance y la coordinación de integración reordena la integración; no se omiten
criterios de seguridad, consistencia o confirmación humana para cumplir una fecha.

## Muestras y entorno OCR

La [matriz de aceptación](int01-acceptance-matrix.md) identifica muestras y resultados.
Usar documentos sintéticos con la marca visible `MUESTRA DE PRUEBA SIN VALIDEZ`,
o copias anonimizadas autorizadas; no publicar respaldos personales, tokens o correos reales.
La coordinación del sprint prepara y registra el conjunto; el responsable de lectura OCR verifica su lectura; la coordinación de integración revisa su uso.
Cada archivo debe registrar ID, tipo documental, MIME, páginas, SHA-256, procedencia,
campos declarados, transcripción esperada, sugerencia y regla aplicable.
Los archivos físicos y sus hashes se incorporan con la evidencia de 13.1/13.6;
los casos de esta matriz son especificaciones de muestras, no archivos ya disponibles.

Catálogo vigente: `titulo_provision_nacional`, `diploma_academico`, `certificado_egreso`.
Formatos: PDF, JPEG y PNG; máximo vigente de carga: 5 MiB (5 242 880 bytes).
Cubrir cada tipo con PDF escaneado y foto, además de un PNG legible y casos degradados.
Incluir tildes, ñ, nombres compuestos, CI con extensión, SIS y año de egreso.

Entorno objetivo: Windows 10/11, CPU de 4 núcleos lógicos y 8 GiB RAM, sin GPU obligatoria.
Probar Chrome, Edge y Firefox estables instalados, registrando versión exacta, CPU y RAM.
Cada combinación ejecuta una carga fría y tres lecturas calientes del mismo conjunto.
Registrar SDK, modelo español, versión PDF.js, hash de modelos, caché y velocidad de red.
La prueba 13.1 confirma la compatibilidad; no se declara un navegador aprobado sin evidencia.

| Presupuesto propuesto | Criterio de aceptación / actuación |
| --- | --- |
| Carga fría del motor | Hasta 60 s en entorno de prueba con modelos disponibles; separar descarga y arranque |
| Lectura caliente | Hasta 30 s por página y 150 s por respaldo de hasta cinco páginas |
| Tiempo total | Hasta 240 s por trabajo; cancelar y dejar revisión manual ante exceso |
| Páginas y resolución | Leer como máximo cinco páginas, lado mayor hasta 1800 px; marcar parcial al exceder |
| Memoria | Incremento máximo de 512 MiB por pestaña; registrar método y pico, no inferirlo del tamaño del archivo |
| Capacidad | Un trabajo activo por pestaña; reserva atómica de servidor impide duplicados entre sesiones |
| Interacción | Búsqueda, filtros y navegación responden en menos de 1 s durante OCR |
| Limpieza | Liberar Worker, PDF, canvas y blobs al terminar, cancelar o perder la reserva |

Medir tiempos con reloj monotónico y memoria con herramientas del navegador.
Si una API de memoria no existe, usar el administrador de tareas del navegador y
registrar el método; una medición ausente queda pendiente y no cuenta como aprobación.
Los presupuestos se calibran con 13.1; cualquier cambio debe actualizar este registro,
la matriz y las pruebas consumidoras, indicando motivo, responsable y fecha.

## Reglas de comparación y sugerencia

Versión propuesta del acuerdo: `int01-v1`. Las reglas se ejecutan en NestJS.
Conservar lectura literal y evidencia por página; normalizar solo para comparar:
mayúsculas, espacios, Unicode y tildes; conservar ceros iniciales de CI y SIS.
La extensión departamental de CI puede separarse del número; no corregir dígitos por semejanza.
Nombre, apellidos y carrera son obligatorios para los tres tipos documentales.
Año de egreso es obligatorio en certificado de egreso; en títulos y diplomas solo se
compara si está rotulado como egreso. Una fecha de emisión no demuestra año de egreso.
CI y SIS se comparan cuando figuren rotulados; su ausencia en el diseño documental
no constituye una diferencia. La falta de un campo obligatorio exige revisión manual.

Una lectura con confianza menor a 0,85, ambigua o contradictoria no sustenta diferencias.
Clasificaciones: `COINCIDE`, `POSIBLE_DIFERENCIA`, `NO_COMPROBADO`.
Cada hallazgo incluye declarado, leído, página y fragmento, o explica la evidencia ausente.

| Tipo documental | Identificación que debe poder comprobarse | Causa propuesta para sugerir rechazo |
| --- | --- | --- |
| Título en Provisión Nacional | Encabezado de título, persona y carrera | Documento legible identifica inequívocamente a otra persona y otra carrera |
| Diploma Académico | Encabezado de diploma, persona y carrera | Documento legible identifica inequívocamente a otra persona y otra carrera |
| Certificado de Egreso | Encabezado de certificado, persona, carrera y egreso | Documento legible identifica inequívocamente a otra persona y otra carrera |

Orden: lectura fallida, parcial o insuficiente -> `REVISION_MANUAL`; evidencia completa
y causa de rechazo comprobada -> `RECHAZAR`; diferencia subsanable -> `OBSERVAR`;
todos los obligatorios coinciden y no hay diferencias -> `APROBAR`.
Un tipo desconocido, encabezado ausente o supuesto fraude exige comprobación humana;
no se deduce falsedad del OCR. La revisión de estas causas por la coordinación de integración queda pendiente.
Las reglas implementadas en otras ramas deben contrastarse por tipo antes de su integración.
La sugerencia nunca cambia el estado oficial, emite dictamen o envía correo por sí sola.

## Consulta de estado por correo: contrato de límites para HU-18

El responsable de backend implementa y prueba los contadores; la coordinación de integración revisa plantillas y entrega;
El responsable de consulta pública valida formulario y casos de abuso. Parámetros propuestos para 18.1/18.4:

| Clave | Espera mínima | Máximo por ventana fija |
| --- | --- | --- |
| Destinatario normalizado | 60 s entre admisiones | 3 en 15 min y 10 en 24 h |
| Origen (IP validada por servidor) | Sin espera adicional | 10 en 15 min y 50 en 24 h |

Normalizar con trim y minúsculas, sin eliminar puntos ni sufijos del correo.
Consumir límites antes de buscar solicitudes, también para direcciones inexistentes.
Contadores compartidos y atómicos; aplicar todas las ventanas y la espera sin
permitir envíos concurrentes duplicados. No confiar en cabeceras IP de proxies no autorizados.
Si falla el almacenamiento del límite, no enviar y responder indisponibilidad genérica.
Para un correo válido, responder igual con o sin solicitud y al agotar destinatario:
`202` y «Si existe una solicitud asociada, recibirás un correo con su estado».
Un límite de origen puede devolver `429` con `Retry-After` sin consultar existencia.
La validación sintáctica puede devolver `400`; no revelar estado ni dirección guardada.
Seleccionar la última solicitud enviada del correo verificado vigente, excluyendo borradores.
Enviar únicamente al correo verificado almacenado; no reenviar activación a una cuenta activa.
Los reintentos reutilizan la notificación encolada y conservan los límites de activación
y recuperación existentes; consultar nunca crea dictamen ni modifica sus contadores.

## Orden de integración y cierre

1. INT-01 establece contratos; INT-03/INT-04 fijan revisión y evolución de datos.
2. Priorizar bugs bloqueantes y MAIL; integrar contratos 13.4/13.5 y 17.4 antes de sus consumidores.
3. Integrar 13.1-13.3, 13.6, HU-14 y HU-17 sobre revisión y reserva vigentes.
4. Integrar HU-16 y HU-18 con sus contratos de motivos, correo y límites; HU-15 se calibra con muestras.
5. Ejecutar INT-02, INT-05, INT-06 e INT-07 sobre los recorridos integrados; INT-08 reúne evidencia.

Ventanas objetivo: primer pase a dev el 15/11, segundo el 20/11 y final el 25/11;
review el 28/11. Solo la coordinación de integración coordina epic1 y pases a dev; INT-01 publica su propia rama.
La evidencia consumidora registra caso, revisión, entorno, esperado, observado y resultado.
Para cerrar la coordinación: revisión de la coordinación de integración registrada, responsables informados,
muestras identificadas y criterios enlazados desde 13.1, 13.3 y 18.1.
Pendiente de coordinación: validar presupuestos en equipos reales y confirmar límites
y causas de rechazo. Este commit entrega la documentación; no acredita esas aceptaciones.
