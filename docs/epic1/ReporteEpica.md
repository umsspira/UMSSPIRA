# Reporte de la Épica 1 - G8

**Épica:** Onboarding y Backoffice Documental.  
**Fecha de corte:** 14 de noviembre de 2026.  
**Base de código revisada:** `origin/epic1`, commit `f107b8d4`.  
**Equipo:** G8.

## Propósito y estado del reporte

La épica permite que un titulado solicite acceso, verifique su correo, adjunte un respaldo académico y reciba una revisión del administrador de carrera. Una aprobación permite activar la cuenta e iniciar sesión; una observación permite corregir el mismo expediente.

Este reporte reúne lo desarrollado durante los tres sprints hasta la fecha de corte. El resumen de desarrollo proporcionado por el equipo declara cerrados los sprints 1 y 2 y mantiene el sprint 3 en ejecución. Por eso se separan funcionalidades presentes en el repositorio, alcance comprometido y validaciones pendientes: disponer de código o pruebas automatizadas no acredita por sí solo el cierre funcional completo.

## Funcionalidades implementadas

### Sprint 1: flujo base (HU-01 a HU-05)

| HU | Desarrollo acumulado |
| --- | --- |
| HU-01 | Formulario público de datos personales y académicos, progreso por pasos, borrador, validación de C.I., teléfono y SIS, y detección de duplicados. |
| HU-02 | Verificación de correo con OTP de seis dígitos, expiración, límite de intentos, reenvío y corrección de correo. |
| HU-03 | Selección de tipo documental, carga PDF/JPEG/PNG, validación del contenido y límite de 5 MiB, almacenamiento privado, vista previa y entrega en estado PENDIENTE. |
| HU-04 | Bandeja administrativa, búsqueda y filtros, lectura del expediente y respaldo, dictámenes APROBADA, OBSERVADA o RECHAZADA y notificación. |
| HU-05 | Login, inspección y renovación de sesión, cierre de sesión, protección de rutas y redirección según rol. Integración del acceso compartido con otras épicas. |

### Sprint 2: robustez del flujo (HU-06 a HU-12)

| HU | Desarrollo acumulado |
| --- | --- |
| HU-06 | Activación en dos pasos, verificación de OTP, contraseña, reenvío y controles de intentos. Credenciales protegidas mediante hash y prevención de cuentas duplicadas. |
| HU-07 | Resumen editable antes de entregar; cambio de correo con reverificación, entrega única y confirmación pública sin el identificador interno TIT. |
| HU-08 | Métricas de recibidas hoy, pendientes, urgentes y resueltas hoy; filtros combinables, periodos, búsqueda y paginación conservados en URL. |
| HU-09 | Correo de resolución, registro de notificaciones, reintentos técnicos y reproceso de fallidos sin emitir otro dictamen. |
| HU-10 | Acceso por enlace seguro a solicitudes observadas, edición de datos, reemplazo de respaldo y reentrega del mismo expediente. Conservación del documento anterior. |
| HU-11 | Control de rechazos por identidad, máximo de dos observaciones, autoría desde la sesión del servidor y protección frente a dictámenes concurrentes. |
| HU-12 | Solicitud, validación y restablecimiento de contraseña con respuestas públicas genéricas y envío de correo de recuperación. |

Se corrigieron además el reinicio del buscador, recorte de contenido del dictamen, estado de la zona de carga después de adjuntar, diseño del login, aviso al salir del registro y exposición del código institucional en confirmaciones públicas.

### Sprint 3: avances verificados y alcance en curso (HU-13 a HU-18)

| HU | Situación al corte |
| --- | --- |
| HU-13 | Existen servicios y endpoints de reserva, renovación, lectura, fallo y resultado OCR; frontend con cola y procesamiento en navegador. Los resultados se vinculan a la revisión. Falta acreditar la matriz completa de muestras, compatibilidad y rendimiento en equipos administrativos. |
| HU-14 | Existe revisión administrativa dentro de la bandeja. La página independiente de expediente, confirmación humana ampliada y control de revisión desactualizada del dictamen forman parte del alcance comprometido; no se declaran cerrados en este corte. |
| HU-15 | Existe detector local de calidad de imagen y sus pruebas. Los avisos orientan sobre legibilidad; no certifican autenticidad. La validación integral del flujo permanece sujeta al cierre del sprint. |
| HU-16 | Hay implementación de motivos múltiples y explicación compartida entre resolución, correo y corrección, con pruebas de reglas y concurrencia. Mantiene una observación por decisión y el máximo de dos. |
| HU-17 | Hay trabajo de persistencia de eventos y revisión única para conservar la evolución del expediente. El historial cronológico completo en interfaz y su validación de permisos siguen pendientes de acreditación integral. |
| HU-18 | Están la página pública `/status` accesible desde login/registro, endpoint público, selección de última solicitud enviada, límites y plantillas según estado; hay pruebas de consulta y correos. Responde de forma genérica y no modifica el dictamen. |

El OCR produce hallazgos y sugerencias; la decisión oficial corresponde al administrador. Un error de lectura o dato ausente exige revisión humana y no demuestra falsedad documental.

## Trabajo adicional e integración

- Correcciones de navegación hacia Inicio, correos largos, temporizador real de OTP al recargar, constancia PDF y limpieza de filtros.
- Estabilidad del buscador frente a actualizaciones tardías de URL, acceso a corrección sin sesión, consulta del documento previo y ajustes de presentación en corrección y activación.
- Estilo común de correos y validación de mensajes de registro y recuperación. El repositorio contiene evidencias de integración posteriores al resumen inicial; una plantilla integrada no demuestra entrega real en todos los entornos.
- Revisión única al cambiar datos o respaldo, migraciones y runbook para evolución de base de datos.
- Regresión de permisos por carrera, revisión de accesibilidad y pruebas móviles, con resultados y casos omitidos documentados por el equipo.

## Situaciones no previstas y dificultades

| Situación | Respuesta y efecto |
| --- | --- |
| El buscador restauraba texto borrado al recibir una URL atrasada. | Se corrigió la sincronización y se añadieron pruebas para actualizaciones tardías. |
| El contador del OTP podía mostrar una vigencia incorrecta después de recargar. | Se vinculó a la expiración real para mantener coherencia con la validación del servidor. |
| Los enlaces de corrección se abrían sin sesión y podían ser inválidos o antiguos. | Se separó el acceso por credencial de corrección del login y se incorporó manejo de enlaces inválidos. |
| Un reemplazo de archivo o corrección podía dejar resultados asociados a una revisión anterior. | Se unificó la revisión y se vinculó el procesamiento OCR a la versión vigente. |
| Dos administradores podían actuar sobre el mismo expediente. | Se incorporaron controles de concurrencia y encolado único; quedan comprobaciones ampliadas para el sprint 3. |
| El envío de recuperación dependía de la configuración y del proveedor de correo. | Se documentaron fallos, entrega por Brevo y pruebas locales; hay que validar las variables y entrega del entorno desplegado. |
| El OCR consume recursos del equipo administrativo y depende de tener la bandeja abierta. | Se usa procesamiento en Worker y reservas con vencimiento; rendimiento y compatibilidad requieren mediciones reales. |
| La planificación y los nombres de algunas ramas no coinciden. | INT-01 registra el alcance funcional y las dependencias para evitar considerar una rama como evidencia suficiente de cierre. |

## Arquitectura y datos

Frontend Next.js/React con TypeScript; API NestJS con capas HTTP, aplicación, dominio e infraestructura; PostgreSQL/Supabase y almacenamiento privado de documentos. El borrador y las credenciales hasheadas se conservan en PostgreSQL; Redis participa en límites y bloqueos. El correo usa Brevo por HTTPS en producción o SMTP/Mailpit en desarrollo, según configuración. El OCR se ejecuta en el navegador administrativo con PaddleOCR y PDF.js.

Los estados oficiales son PENDIENTE, APROBADA, OBSERVADA y RECHAZADA. Los expedientes, versiones de respaldo, decisiones, eventos y correos deben conservar su relación para evitar decisiones o resultados sobre documentos antiguos. El backend aplica permisos y alcance de carrera; ocultar controles en frontend no sustituye esa autorización.

## Evidencia disponible y pendientes

Esta entrega de documentación no ejecuta nuevamente suites funcionales ni modifica la aplicación. Los siguientes resultados corresponden a registros existentes del equipo:

- [Regresión INT-05](../sprint3/int05-regression-results.md): documenta casos aprobados de permisos, límites, concurrencia y correo. Difiere la comprobación `expectedRevision` del dictamen (HU-14.4) y permisos del historial (HU-17.2).
- [Matriz móvil INT-07](../sprint3/int07-mobile-matrix.md): identifica recorridos comprobados y casos omitidos; la aprobación administrativa con Mailpit y activación real queda pendiente de validación integral.
- [Acuerdos INT-01](../sprint3/int01-sprint-agreements.md) y [matriz de aceptación](../sprint3/int01-acceptance-matrix.md): son contratos y criterios; no acreditan por sí mismos muestras físicas, mediciones OCR ni aceptación del equipo.
- [Revisión frontend INT-06](../sprint3/int06-frontend-checklist.md), [consulta de estado](../sprint3/status-query-matrix.md), [correo común](../sprint3/mail01-pr-evidence.md) y [recuperación](../sprint3/mail03-evidence.md): consultar sus condiciones y limitaciones antes de declarar cierre.

Quedan por completar o ratificar el expediente ampliado e historial visual, la validación OCR con muestras y equipos reales, los recorridos integrados omitidos y la versión candidata del sprint 3. El PO debe ratificar vigencias de corrección, reglas de rechazo y sugerencias OCR, calendario de periodos, elegibilidad de certificados de egreso, retención documental y alcance de carreras. No se presentan como decisiones institucionales ya aprobadas.

## Fuera de alcance

No se incluyen onboarding de empresas, tableros de otras épicas, PWA/offline, conectores SEGIP/SIA/WebSISS, certificación de autenticidad por IA, OCR con navegadores cerrados, 2FA/login social, desbloqueo administrativo del límite de rechazos, alta masiva ni gestión visual de roles o motivos. La búsqueda pública por C.I., SIS o TIT no forma parte del flujo: la consulta de estado se envía al correo verificado.

El resumen fuente señala como deuda el endurecimiento contra bots del registro público y la dependencia del proveedor de correo. Los límites de la consulta de estado no deben interpretarse como cobertura de todos los puntos públicos del sistema.

## Inventarios y fuentes

- [Rutas frontend](RutasFrontend.md).
- [Rutas backend](RutasBackend.md).
- Resumen de desarrollo de Épica 1 (G8), PDF facilitado por el equipo: alcance acumulado, exclusiones, decisiones pendientes y riesgos. Se utiliza como referencia; sus propuestas y compromisos futuros se contrastan con el código y evidencias del corte.
- Código de `apps/web/src/app`, módulos frontend de autenticación y solicitudes, y controladores `apps/api/src/modules/auth/http` y `apps/api/src/modules/registrations/http` de la base indicada.
