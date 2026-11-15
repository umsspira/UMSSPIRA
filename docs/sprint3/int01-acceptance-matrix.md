# INT-01: matriz de muestras y pruebas de aceptación

Contrato: [alcance y acuerdos técnicos](int01-sprint-agreements.md), versión `int01-v1`.
Estado inicial de todos los casos: pendiente de ejecución; no hay resultados medidos.
La coordinación del sprint custodia el catálogo; el responsable de lectura OCR registra OCR real; la coordinación de integración revisa criterios.

## Catálogo reproducible de muestras

Identidad sintética de referencia: Nombre Compuesto Apellido Compuesto; CI `00123456 CB`;
SIS `001234567`; carrera Ingeniería de Sistemas; año de egreso `2024`.
Separar nombres `Nombre Compuesto` y apellidos `Apellido Compuesto` en el formulario declarado.
Las variantes indicadas solo cambian el respaldo y mantienen el formulario de referencia.
Cada ID requiere archivo físico, SHA-256 y transcripción antes de ejecutar la validación.
En títulos y diplomas no exigir CI, SIS o egreso cuando no aparecen en el diseño.

| ID | Tipo / formato | Contenido de la muestra | Resultado esperado |
| --- | --- | --- | --- |
| M01 | Título / PDF escaneado | Una página legible, persona y carrera de referencia | APROBAR |
| M02 | Título / JPEG | Foto legible del mismo contenido que M01 | APROBAR |
| M03 | Diploma / PDF escaneado | Una página legible, persona y carrera de referencia | APROBAR |
| M04 | Diploma / JPEG | Foto legible del mismo contenido que M03 | APROBAR |
| M05 | Certificado / PDF escaneado | Persona, carrera y egreso 2024 rotulados | APROBAR |
| M06 | Certificado / JPEG | Foto legible del mismo contenido que M05 | APROBAR |
| M07 | Certificado / PNG | Egreso rotulado 2023, restantes datos coinciden | OBSERVAR con evidencia del año |
| M08 | Cada tipo / PNG | Otra persona y carrera Medicina, legibles | RECHAZAR sugerido, sin dictamen automático |
| M09 | Cada tipo / JPEG | Desenfoque o recorte impide leer campos obligatorios | REVISION_MANUAL, nunca rechazo por ilegibilidad |
| M10 | Certificado / PDF | Solo fecha de emisión 2024, sin egreso rotulado | REVISION_MANUAL para egreso |
| M11 | Certificado / PDF de seis páginas | Evidencia necesaria en página seis | Lectura parcial y REVISION_MANUAL |
| M12 | Certificado / PNG | Dos valores incompatibles del mismo campo | NO_COMPROBADO y REVISION_MANUAL |
| M13 | Cada tipo / PNG | Variante sin tildes, mismos números y nombres completos | COINCIDE tras normalizar; conservar texto original |
| M14 | Archivo inválido | PDF corrupto, MIME no admitido o más de 5 MiB | Rechazo de carga o fallo controlado; sin sugerencia aprobatoria |

M08, M09 y M13 se materializan para los tres tipos y se identifican con sufijos T, D y C.
No basta una transcripción simulada para acreditar 13.1: ejecutar los archivos con OCR real.
Para cada ejecución guardar navegador/versión, equipo, modelo/hash, páginas, tiempos,
memoria/método, evidencia por campo y sugerencia observada, sin datos personales reales.

## Criterios de integración consumidores

| Caso | Acción y comprobación esperada | Responsable / tarea |
| --- | --- | --- |
| P01 | Una carga fría y tres calientes por navegador; cumplir presupuestos del acuerdo | coordinación del sprint y responsable de lectura OCR / 13.1 |
| P02 | Buscar, filtrar y navegar durante OCR; respuesta inferior a 1 s | responsable de lectura OCR / 13.2 |
| P03 | M01-M14 conservan clasificación, evidencia y reglas por tipo | coordinación del sprint / 13.3 y 13.6 |
| P04 | Dos sesiones compiten por trabajo; una reserva, resultado compartido | responsable de base de datos y coordinación del sprint / 13.5 y 13.6 |
| P05 | Cerrar pestaña, vencer reserva y reasignar; descartar resultado de revisión vieja | responsable de base de datos y responsable de lectura OCR / INT-03 y 13.5 |
| P06 | OCR falla o se cancela; liberar recursos, conservar expediente y decisión humana | responsable de lectura OCR y coordinación del sprint / 13.2 y INT-02 |
| E01 | Correo con espacios/mayúsculas usa la misma clave y destinatario verificado | responsable de backend / 18.1 |
| E02 | Consultas a los 0, 59 y 60 s: admitir primera y tercera, suprimir segunda | responsable de backend y responsable de consulta pública / 18.1 y 18.4 |
| E03 | Admitir tres consultas espaciadas; cuarta en 15 min no envía; probar reinicio de ventana | responsable de backend y responsable de consulta pública / 18.4 |
| E04 | Un origen usa correos distintos: undécima petición en 15 min devuelve 429 | responsable de backend y responsable de consulta pública / 18.4 |
| E05 | Alcanzar 10 por destinatario y 50 por origen en 24 h, respetando ventanas cortas | responsable de backend y responsable de consulta pública / 18.4 |
| E06 | Solicitud existente/inexistente y destinatario limitado dan el mismo 202 y cuerpo | responsable de consulta pública / 18.4 |
| E07 | Dos consultas simultáneas, origen falsificado y almacén de límites caído no evaden control | responsable de backend / 18.1 |
| E08 | Pendiente, observado, rechazado, aprobado y cuenta activa usan correo correcto | coordinación de integración y responsable de consulta pública / 18.2 y 18.4 |
| E09 | Borrador excluido, último envío seleccionado, reintento sin nuevo dictamen | responsable de backend y coordinación de integración / 18.1 y 18.2 |

En E02-E05 usar reloj controlado y verificar cantidades de notificaciones encoladas,
no solo respuestas HTTP. Probar cada límite con los demás disponibles para aislarlo.
Las ventanas son fijas desde la primera admisión; a su vencimiento se reinicia el contador.
La espera mínima vuelve a contarse únicamente desde una admisión, no desde un intento suprimido.
Estas pruebas se implementan en sus ramas consumidoras; INT-01 define los criterios.
