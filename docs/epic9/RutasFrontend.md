# Épica 9 · Rutas del frontend

Portal Admin UMSS (Grupo 5). Rutas de `apps/web` que trabajó la épica 9, con el rol que puede entrar a cada una. Primero las del Sprint 3 (US-3.3 «Tablero de acreditación») y al final las de los Sprints 1 y 2.

Todas las rutas del administrador están dentro de `/reports`. Si entra un titulado, lo lleva a `/portal` con el aviso «Acceso no autorizado: requiere rol de Administrador de Carrera». Si entra alguien sin sesión, lo lleva al inicio de sesión con el aviso «Debe iniciar sesión para acceder a este módulo». Esos avisos los resuelve el `middleware.ts` existente.

## Sprint 3 · Administrador de Carrera

| Ruta | Pantalla | Qué muestra | HU |
|---|---|---|---|
| `/reports/acreditacion` | Reportes Institucionales · pestaña «Tablero de acreditación» | Tarjetas de indicadores, «Salario mensual», gráfico «Empleabilidad por cohorte», filtros «Cohorte» y «Semestre», mapa de calor de competencias y botones «Exportar PDF» y «Exportar Excel» | HU-001 a HU-004 |
| `/reports/encuestas` | Encuestas de Empleabilidad · pestaña «Respuestas» | Reporte de las respuestas de la encuesta, solo de la carrera del administrador: totales calculados en la base de datos, «Trabaja» / «No trabaja», modalidad, salario, inserción y detalle paginado | HU-001 (mejora) |
| `/reports/encuestas/gestion` | Encuestas de Empleabilidad · pestaña «Gestión de encuestas» | Lista de encuestas con «Título», «Inicio», «Fin» y «Estado»; «Nueva encuesta», «Editar» (solo en borrador), «Publicar» y «Despublicar» | HU-005 |

### Parámetros de `/reports/acreditacion`

Los filtros quedan guardados en la URL, así se mantienen al recargar la página:

| Parámetro | Ejemplo | Qué filtra |
|---|---|---|
| `cohorte` | `?cohorte=2023` | Indicadores, gráfico por cohorte y mapa de calor (queda con una sola fila) |
| `semestre` | `?semestre=1-2026` | Indicadores y gráfico, según la fecha de envío de la encuesta. No cambia el mapa de calor |

## Sprint 3 · Titulado

| Ruta | Pantalla | Qué muestra | HU |
|---|---|---|---|
| `/surveys` | Encuesta de empleabilidad | Formulario según la condición laboral («Trabaja» / «No trabaja»), con borrador guardado, revisión antes de enviar y envío desactivado sin conexión. Si ya la envió, muestra el resumen de sus respuestas. Si no hay una encuesta publicada y vigente para su carrera, muestra «No hay una encuesta disponible por el momento» | HU-005 |

## Sprints anteriores

| Ruta | Rol | Qué muestra | Sprint |
|---|---|---|---|
| `/reports` | Administrador | Reportes Institucionales con las pestañas «Dashboard» («Titulados registrados», «Titulados verificados», «Titulados observados» y «Mentores activos») y «Titulados» (lista con búsqueda, filtro «Verificado» / «Observado» y exportación a PDF y CSV) | 1 |
| `/reports/encuestas` | Administrador | Reporte de respuestas de la encuesta (en el Sprint 3 pasó a ser por carrera y paginado) | 2 |
| `/surveys` | Titulado | Formulario de la encuesta de empleabilidad: condición laboral, cargo, empresa, área, modalidad, salario e inserción, con borrador y revisión antes de enviar | 2 |

## Módulos del frontend

| Carpeta | Contenido |
|---|---|
| `apps/web/src/modules/reports/` | Tablero, tarjetas, salario, mapa de calor y adaptadores de los endpoints de reportes |
| `apps/web/src/modules/reports/accreditation/` | Filtros del tablero, gráfico por cohorte y botones de exportación |
| `apps/web/src/modules/reports/graduates/` | Reporte de titulados en PDF y CSV (Sprint 1) |
| `apps/web/src/modules/surveys/frontend/` | Encuesta del titulado, reporte de encuestas y gestión de encuestas |
