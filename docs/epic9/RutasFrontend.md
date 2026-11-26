# Épica 9 · Rutas del frontend

Portal Admin UMSS, Encuestas & Analytics (Grupo 5). Rutas de `apps/web` que trabajó la épica 9 en los tres sprints, más las de la deuda técnica de la épica 5 que se le asignó. Para cada ruta: quién entra, qué muestra, de qué HU y sprint es, y los archivos principales.

## Acceso a las rutas

| Quién intenta entrar | Qué pasa |
|---|---|
| Sin sesión, en una ruta de `/reports` | Lo lleva a `/login?reportes=requiere-sesion` con el aviso «Debe iniciar sesión para acceder a este módulo» |
| Sin sesión, en `/surveys` | Lo lleva a `/login` |
| Titulado en una ruta de `/reports` | Lo lleva a `/portal?acceso=reportes-no-autorizado` con el aviso «Acceso no autorizado: requiere rol de Administrador de Carrera» |
| Sesión vencida (la API responde 401) | Limpia la sesión, avisa «Su sesión ha expirado. Inicie sesión nuevamente» y vuelve a `/login?reportes=sesion-expirada` |
| No se puede verificar la sesión con el servidor | Muestra `/reportes-no-disponibles` (respuesta 503) con «No se pudo conectar con el servidor. Verifique su conexión o intente más tarde», «Reintentar conexión» y «Volver al inicio», sin cargar datos |

Lo resuelven, en el Sprint 2 (HU-004, T4.1 y T4.4):

| Archivo | Qué hace |
|---|---|
| `apps/web/src/middleware.ts` | Redirecciones por sesión y rol en `/reports` y `/surveys` |
| `apps/web/src/app/(dashboard)/reports/layout.tsx` | Encabezado «Portal Administrativo» y barra de navegación de todas las rutas de `/reports` |
| `modules/auth/frontend/components/admin-reports-navigation.tsx` | Barra con «Reportes Institucionales» y «Encuestas de Empleabilidad» |
| `modules/auth/frontend/components/reports-session-boundary.tsx`, `session-expired-dialog.tsx` y `services/session-expired.ts` | Ventana de sesión expirada |
| `modules/auth/frontend/components/login-form.tsx` | Avisos del login según el motivo |
| `shared/components/reports-access-denied-notice.tsx` | Aviso de acceso no autorizado en `/portal` |
| `app/(dashboard)/reportes-no-disponibles/page.tsx` | Pantalla segura cuando el servidor no responde |

## Resumen de rutas

| Ruta | Rol | Sprint | HU |
|---|---|---|---|
| `/reports` | Administrador | 1 | US-1.9.1 a US-1.9.5 |
| `/reportes-no-disponibles` | Administrador | 2 | HU-004 |
| `/surveys` | Titulado | 2 y 3 | HU-001 a HU-003 del Sprint 2; HU-005 y HU-006 del Sprint 3 |
| `/reports/encuestas` | Administrador | 2 y 3 | HU-004 del Sprint 2; mejora 1.4 en el Sprint 3 |
| `/reports/acreditacion` | Administrador | 3 | HU-001 a HU-004 |
| `/reports/encuestas/gestion` | Administrador | 3 | HU-005 |
| `/profile` (sección «Currículum (CV)») | Titulado | Deuda de la épica 5 | HU-16 |
| `/empresa/mis-vacantes/[id]/candidatos/[applicantId]` | Empresa | Deuda de la épica 5 | HU-16 |
| `/ayuda/bolsa-de-trabajo` | Titulado y empresa | Deuda de la épica 5 | HU-20 |
| `/portal/empleos/[id]` (ventana «¿Cómo se calcula?») | Titulado | Deuda de la épica 5 | HU-20 |

# Sprint 1 · Reportería base institucional (US-1.9)

## `/reports` · Reportes Institucionales

Página: `apps/web/src/app/(dashboard)/reports/page.tsx`. Junta las 5 HU del sprint en una sola vista con dos pestañas internas, «Dashboard» y «Titulados», y recuerda la última pestaña abierta. Desde el Sprint 3 tiene una tercera, «Tablero de acreditación», que lleva a `/reports/acreditacion`.

### Pestaña «Dashboard» (US-1.9.1)

| Elemento | Detalle |
|---|---|
| Tarjetas | «Titulados registrados», «Titulados verificados», «Titulados observados» y «Mentores activos» |
| Datos | `GET /reports/metrics`, solo de las carreras del administrador |
| Archivos | `modules/reports/components/kpi-card.tsx`, `modules/reports/hooks/use-dashboard-indicators.ts` |

### Pestaña «Titulados» (US-1.9.1 a US-1.9.5)

| Elemento | HU | Detalle |
|---|---|---|
| Tabla de titulados | US-1.9.1 y US-1.9.3 | «Nro», número de registro, nombre completo, código SIS, teléfono, correo electrónico, fecha de ingreso, fecha de titulación, duración de estudio, fecha de revisión, motivo de rechazo y estado (badge «Verificado» u «Observado»). Paginación de 10 con «Mostrando 1-10 de N registros». En el celular, cada titulado es una tarjeta que se despliega. Archivos: `components/graduates-table.tsx` y `components/pagination.tsx` |
| Sin registros | US-1.9.1 | Mensaje en lugar de la tabla vacía (`components/empty-state.tsx`) |
| «Ver motivo» | US-1.9.3 | Modal con el dictamen: número de registro, código SIS, titulado, teléfono y motivo registrado (`components/observation-modal.tsx`) |
| Búsqueda | US-1.9.2 | Por nombre o código SIS, predictiva mientras se escribe, hasta 60 caracteres, sin distinguir tildes ni mayúsculas (`components/graduates-search.tsx`, `utils/graduate-search.ts`) |
| Filtro de estado | US-1.9.2 | «Todos», «Verificados» y «Observados», combinable con la búsqueda, con botón para limpiar filtros (`components/graduates-status-filter.tsx`) |
| Menú «Exportar» | US-1.9.4 y US-1.9.5 | Dos opciones: «CSV» («Nómina compatible con Excel») y «PDF» («Reporte institucional») |
| Exportar → PDF | US-1.9.4 | «Generando…» con el botón deshabilitado, vista previa con páginas, «Imprimir», «Descargar» y «Cerrar». Con «Todos», la opción PDF queda deshabilitada y dice «Seleccione Verificados u Observados». Archivos en `modules/reports/graduates/pdf/` |
| Exportar → CSV | US-1.9.5 | Confirmación con la cantidad de titulados y el nombre del archivo, «Confirmar .csv», barra de progreso y aviso «Archivo CSV descargado», con el filtro aplicado. Archivos en `modules/reports/graduates/csv/` |

Endpoints que usa: `GET /reports/metrics`, `GET /reports/graduates`, `GET /reports/graduates/pdf` y `GET /reports/graduates/csv`.

# Sprint 2 · Encuesta de empleabilidad (US-2.6)

## `/surveys` · Encuesta de empleabilidad (titulado)

Página: `apps/web/src/app/(dashboard)/surveys/page.tsx`. Componente principal: `modules/surveys/frontend/components/survey-container.tsx`.

| Elemento | HU · Task | Detalle |
|---|---|---|
| Condición laboral | HU-001 · T1.1 | Opciones «Trabaja» y «No trabaja» (`survey-work-condition-selector.tsx`) |
| Preguntas dinámicas | HU-001 · T1.2 | Con «Trabaja» aparecen los datos laborales sin recargar. Al pasar a «No trabaja» se ocultan, se descartan y se avisa «Las respuestas anteriores se descartaron» (`hooks/use-survey-form.ts`) |
| Borrador | HU-001 · T1.3 | Se guarda en el navegador en cada cambio y se recupera al volver; se borra al enviar o al cerrar sesión (`hooks/use-survey-draft.ts`, `survey-draft-notice.tsx`) |
| Cargo, empresa y área | HU-002 · T2.1 | Texto obligatorio, hasta 100 caracteres y con al menos 2 letras; «Este campo es obligatorio» (`survey-job-inputs.tsx`) |
| Modalidad | HU-002 · T2.1 | «Presencial», «Remoto» o «Híbrido» (`survey-work-modality-selector.tsx`) |
| Salario mensual | HU-002 · T2.2 | Un rango: 0–2.999, 3.000–5.000, 5.001–8.000, 8.001–12.000 o 12.001–21.000 Bs (`survey-salary-selectors.tsx`) |
| Tiempo de inserción | HU-002 · T2.2 | Meses enteros, solo dígitos (`survey-insertion-time-input.tsx`) |
| Nota de confidencialidad | HU-002 · T2.2 | «Esta información es confidencial y sólo se usará con fines estadísticos» (`survey-confidential-notice.tsx`) |
| Barra de progreso | HU-002 · T2.4 | «N % completado» sobre las preguntas visibles (`survey-progress-bar.tsx`) |
| Revisión antes de enviar | HU-002 · T2.5 | Modal con el resumen de las respuestas y «Volver y editar» (`survey-review-modal.tsx`) |
| Envío | HU-003 · T3.4 | «Encuesta enviada correctamente» o «No se pudo enviar la encuesta. Intente nuevamente», conservando las respuestas (`hooks/use-survey-submit.ts`, `survey-submission-status-modal.tsx`) |
| Sin conexión | HU-003 · T3.6 | Aviso y botón de envío desactivado (`survey-offline-banner.tsx`, `hooks/use-network-status.ts`) |
| Encuesta ya enviada | HU-003 | Muestra el resumen de lo que respondió y el enlace para volver al portal |

Endpoints que usa: `GET /surveys/status`, `GET /surveys/me` y `POST /surveys`.

## `/reports/encuestas` · Respuestas de la encuesta (administrador)

Página: `apps/web/src/app/(dashboard)/reports/encuestas/page.tsx` (`survey-report-dashboard.tsx`). En el Sprint 2 (HU-004) se integró a la barra de navegación como «Encuestas de Empleabilidad». Desde el Sprint 3, `reports/encuestas/layout.tsx` le agrega las pestañas «Respuestas» y «Gestión de encuestas» (`survey-admin-tabs.tsx`). Muestra el total de respuestas, «Trabaja» / «No trabaja», modalidad, salario, inserción y el detalle de cada respuesta. Endpoint: `GET /reports/surveys`.

# Sprint 3 · Tablero de acreditación (US-3.3)

## `/reports/acreditacion` · Tablero de acreditación (administrador)

Página: `apps/web/src/app/(dashboard)/reports/acreditacion/page.tsx`.

| Elemento | HU | Detalle |
|---|---|---|
| Indicadores | HU-001 | Total de respuestas, % de titulados empleados y tiempo promedio de inserción (`components/acreditacion-kpis.tsx`) |
| Salario mensual | HU-001 | Cantidad de titulados por rango de salario (`components/acreditacion-salary-block.tsx`) |
| Empleabilidad por cohorte | HU-001 | Gráfico de barras por año de titulación; las cohortes con 1 a 4 titulados dicen «Sin datos suficientes» (`accreditation/components/cohort-employability-chart.tsx`) |
| Mapa de calor | HU-002 | Cohortes por las 6 áreas técnicas, 5 tramos de color de 20 % con leyenda, «Calculado sobre N titulados» al pasar el puntero, fecha de «Actualizado» y botón «Actualizar» (`components/competency-heatmap/`) |
| Filtros | HU-003 | «Cohorte» y «Semestre», guardados en la URL; «Limpiar filtros»; nota «El filtro de semestre no se aplica al mapa de calor» (`accreditation/components/accreditation-filters.tsx`, `accreditation/hooks/use-accreditation-filters.ts`) |
| Exportar PDF | HU-004 · T4.1 | «Generando…» y descarga `acreditacion-<carrera>-<aaaa-mm-dd>.pdf` |
| Exportar Excel | HU-004 · T4.2 | Descarga del `.xlsx` con el mismo filtro |

Los dos botones de exportación están en `accreditation/components/accreditation-export-buttons.tsx` y llaman a la API desde `accreditation/services/accreditation-export.service.ts`. El encabezado de la página es `components/acreditacion-header.tsx`.

Parámetros de la URL:

| Parámetro | Ejemplo | Qué filtra |
|---|---|---|
| `cohorte` | `?cohorte=2023` | Indicadores, gráfico por cohorte y mapa de calor (queda con una sola fila) |
| `semestre` | `?semestre=1-2026` | Indicadores y gráfico, según la fecha de envío de la encuesta. No cambia el mapa de calor |

Si la combinación no tiene datos: «No hay información para el periodo seleccionado».

## `/reports/encuestas` · pestaña «Respuestas» (cambio del Sprint 3)

Desde el Sprint 3 (mejora 1.4) el reporte muestra solo la carrera del administrador, calcula los totales en la base de datos y pagina el detalle.

## `/reports/encuestas/gestion` · Gestión de encuestas (HU-005)

Página: `apps/web/src/app/(dashboard)/reports/encuestas/gestion/page.tsx` (`survey-management.tsx`, `survey-admin-form.tsx`, `survey-admin-tabs.tsx`). Lista con «Título», «Inicio», «Fin» y «Estado»; botones «Nueva encuesta», «Editar» (solo en borrador), «Publicar» y «Despublicar». Si ya hay otra publicada y vigente: «Ya existe una encuesta publicada y vigente para esta carrera».

## `/surveys` · cambios del Sprint 3 (titulado)

| Cambio | HU | Detalle |
|---|---|---|
| Solo la encuesta de su carrera | HU-005 | Si no hay una publicada y vigente: «No hay una encuesta disponible por el momento» y «Volver al inicio» |
| Corrección única | HU-006 | Después de enviar aparece «Editar respuestas». El formulario se abre con lo que envió y avisa «Solo puede editar esta encuesta una vez». Al guardar, el botón desaparece (`hooks/use-survey-edit.ts`) |

Endpoint nuevo: `PATCH /surveys/me`.

# Deuda técnica de la épica 5 (asignada a la épica 9)

La épica 5 se disolvió el 17/11/2026 y a la épica 9 le tocaron la HU-16 y la HU-20.

| Ruta | Rol | HU · Task | Detalle |
|---|---|---|---|
| `/profile`, sección «Currículum (CV)» | Titulado | HU-16 · T16.3 | Subir o reemplazar el CV en PDF («Formato PDF, hasta 5 MB» en `epic9`; 4 MB en `dev`), descargarlo y ver «¿Qué datos ve la empresa?» (`modules/profile/cv/cv-section.tsx`, `cv-service.ts` y `que-datos-ve-empresa-modal.tsx`) |
| `/empresa/mis-vacantes/[id]/candidatos/[applicantId]` | Empresa | HU-16 · T16.4 | Detalle del postulante con la descarga de su CV, solo con los datos que permite la política de la T16.1 (`shared/services/applicants.ts`, `shared/types/applicant.ts` y `shared/components/match-breakdown-view.tsx`) |
| `/ayuda/bolsa-de-trabajo` | Titulado y empresa | HU-20 · T20.2 | Página de ayuda con una pestaña por rol y 8 imágenes de guía (`modules/ayuda/ayuda-bolsa-trabajo.tsx`) |
| `/portal/empleos/[id]` | Titulado | HU-20 · T20.1 | Ventana «¿Cómo se calcula?» con la fórmula y el detalle de cada requisito (`modules/ayuda/como-se-calcula-modal.tsx`, `modules/ayuda/como-funciona-afinidad.tsx` y `app/portal/empleos/_components/job-posting-detail.tsx`) |

**Cambios de otro grupo en `dev`.** El 23/11, la rama `fix/G7-correcciones-perfil` (PR #977, que llegó a `dev` con el PR #978) bajó el CV a 4 MB y cambió las etiquetas de «¿Cómo se calcula?» de «Coincide», «Coincide parcialmente» y «No encontrado» a «Exacta», «Similar» y «No encontrada». Lo desplegado muestra esa versión; `epic9` la recibirá en la próxima integración de `dev`.

# Módulos del frontend

| Carpeta | Sprint | Contenido |
|---|---|---|
| `apps/web/src/modules/reports/components/`, `hooks/`, `services/` y `utils/` | 1 y 3 | Tarjetas, tabla, búsqueda, filtro, paginación y modal del Sprint 1; indicadores, salario y mapa de calor del Sprint 3 |
| `apps/web/src/modules/reports/graduates/pdf/` | 1 | Exportación del reporte de titulados en PDF con vista previa (react-pdf) |
| `apps/web/src/modules/reports/graduates/csv/` | 1 | Exportación del reporte de titulados en CSV |
| `apps/web/src/modules/reports/accreditation/` | 3 | Filtros, gráfico por cohorte y botones de exportación del tablero |
| `apps/web/src/modules/surveys/frontend/` | 2 y 3 | Encuesta del titulado, reporte de respuestas, gestión de encuestas y corrección única |
| `apps/web/src/modules/profile/cv/` | Deuda de la épica 5 | Sección del CV del titulado |
| `apps/web/src/modules/ayuda/` | Deuda de la épica 5 | Página de ayuda y explicación de la afinidad |
