# QA HU09 — Conteo de pasos

Usar esta hoja para repetir el conteo de `docs/hu09-comparativa-flujos.md` y sustituir los valores esperados por los observados. No contar scroll ni tiempo de carga; contar cada toque que activa un enlace o botón, incluidos los menús que haya que abrir.

## Preparación

- Usar la misma cuenta y dispositivo para las mediciones antes/después.
- Guardar al menos un QR vigente en el dispositivo y confirmar que el usuario está autenticado.
- Para «Actualizar ahora», dejar una nueva versión del Service Worker esperando.
- Medir «antes» sobre el commit `0b368ecb` y «después» sobre el commit `3b893a04` o su descendiente.
- Empezar cada escenario desde el punto indicado; reiniciar la navegación entre repeticiones.

## Registro

| Escenario y estado inicial | Resultado final | Antes esperado | Antes observado | Después esperado | Después observado | ¿Redujo? |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| Inicio, sesión activa y pase vigente; guardar el QR | Mensaje «Tu pase QR se guardó en este dispositivo» | 4 | — | 2 | — | Pendiente |
| PWA abierta sin conexión, sesión offline vigente y QR guardado; abrir el QR completo | QR del pase visible en tamaño completo | 2 | — | 2 | — | No |
| Pantalla interna distinta de Inicio, con conexión; actualizar caché | Aviso de actualización completada | 3 | — | 2 | — | Pendiente |
| Pantalla interna distinta de Configuración, con actualización disponible; actualizar versión | Aplicación controlada por la versión nueva | 3 | — | 2 | — | Pendiente |

## Evidencia de cada repetición

- Navegador/dispositivo:
- Tamaño de pantalla:
- Fecha y responsable:
- Ruta inicial:
- Conteo observado:
- Resultado y observaciones:
- Captura o enlace a evidencia:

Para la consulta offline, anotar además si la vista previa pequeña del listado anterior bastaba para completar la tarea. No marcar CA-05 como aprobado para ese escenario si el conteo observado no disminuye.