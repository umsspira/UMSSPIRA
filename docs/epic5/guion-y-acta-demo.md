# Guion y acta de la demo · HU-16 y HU-20

Deuda técnica de la épica 5 asignada a la épica 9 (Grupo 5). Task T20.4 · Responsable: Juan Carlos Anagua (Git Lead).

Lo que se pide (HU-20 del reparto de Saul y T20.4): una demo en vivo de punta a punta, guionizada, en la que se publica una vacante, se ve como titulado con su afinidad y su comparación, el titulado sube su CV y se postula, y el reclutador ve al postulante con el desglose y descarga el CV. Queda un acta o una grabación como evidencia.

El documento tiene dos partes:

- **Demo a la PO (sección 2):** el recorrido de punta a punta que se presenta.
- **Verificación de los demás CA (sección 3):** los casos de error, permisos y pantallas que no entran en el recorrido. Se comprueban en el ensayo y, si la PO lo pide, al terminar la demo.

Todo se hace en el despliegue, sin herramientas del navegador ni acceso a la base de datos.

## 1. Preparación

### 1.1 Entorno

- Despliegue: https://umsspira-sooty.vercel.app
- Código: epic9 fusionado en dev con el PR #952 (21/11/2026) y desplegado. Después entraron a epic9 la integración de dev (PR #1017) y la corrección de la recarga de 30 s de «¿Cómo se calcula?» (PR #1019); se llevan a dev antes de la demo.
- Diferencias con los criterios que la PO debe conocer (se anotan como «Observación» en la sección 4):
  - **HU-16, límite del CV:** el despliegue acepta PDF de **hasta 4 MB** («Formato PDF, hasta 4 MB» y «El archivo supera el tamaño máximo de 4 MB»). Los CA-01, CA-04 y CA-05 dicen 5 MB, pero Vercel corta los archivos de más de unos 4,5 MB antes de que lleguen a la API; el límite se bajó en dev el 23/11 (PR #977).
  - **HU-20, etiquetas de «¿Cómo se calcula?»:** la ventana marca cada requisito como «Exacta», «Similar» o «No encontrada», las mismas etiquetas del resto del portal (PR #977). El CA-10 dice «Coincide», «Coincide parcialmente» y «No encontrado».
- La pantalla de postulantes funciona sin datos de ejemplo (`NEXT_PUBLIC_USE_MOCK` apagado).
- La migración `20261120000000_epic5_hu16_cv_postulante` está aplicada en la base del despliegue (confirmado por Mijael).

### 1.2 Datos de la demo: plan A y plan B

La demo necesita una vacante con requisitos técnicos, un titulado con perfil y una postulación. Hay dos formas de tenerlos:

| Plan | Cuándo se usa | De dónde salen los datos |
|---|---|---|
| A | La HU-19 (épica 8) está en el despliegue | El seed `db:seed:demo` carga vacantes, titulados y postulaciones de ejemplo. |
| **B (el que se ensaya)** | La HU-19 no llegó a tiempo | **Se crean en vivo durante la demo**, con las cuentas de la sección 1.3. No hace falta ningún seed ni acceso a la base de datos. |

El guion de la sección 2 sigue el plan B: no depende de la HU-19 y muestra el flujo completo. Si llega la HU-19, los pasos D1 y D2 se pueden saltar usando sus datos, y el resto queda igual.

### 1.3 Cuentas

Se preparan en el ensayo, **vacías**: solo la cuenta, sin perfil, sin CV y sin vacantes. Los datos se cargan en vivo. Las contraseñas no se escriben en este documento.

| Cuenta | Rol | Uso |
|---|---|---|
| Titulado A | Titulado sin registros en el perfil, por ejemplo `titulado.sistemas.e9@umss.edu.bo` del script `04-cuentas-qa-epica9-hu5.sql` | Carga su perfil, sube su CV y se postula en la demo |
| Titulado B | Titulado sin CV, por ejemplo `titulado.informatica.e9@umss.edu.bo` | Se postula a la misma vacante sin subir CV (sección 3) |
| Reclutador 1 | Empresa dueña de la vacante | Publica la vacante y evalúa a los postulantes |
| Reclutador 2 | Otra empresa | Comprueba que no puede ver a los postulantes de la empresa 1 (sección 3) |

### 1.4 Archivos y textos

| Archivo o texto | Para qué |
|---|---|
| `cv-titulado-a.pdf` (menos de 4 MB) | CV que se sube en la demo |
| `cv-titulado-a-v2.pdf` (menos de 4 MB) | Reemplazo del CV (sección 3) |
| `cv-grande.pdf` (más de 4 MB) | Rechazo por tamaño (sección 3) |
| `cv.docx` | Rechazo por formato (sección 3) |
| Vacante «Desarrollador backend Node.js» | Título de la vacante de D1, con los requisitos **Node.js**, **PostgreSQL** y **Docker** |
| Perfil del Titulado A | Experiencia «Desarrollador backend · Empresa Andina»; formación «Licenciatura en Ingeniería de Sistemas · UMSS · 2023»; certificación «AWS Certified Cloud Practitioner · Amazon · 2025»; proyecto «API de inscripciones» con las tecnologías **Node.js, PostgreSQL** |

Con esos datos el Titulado A cumple 2 de los 3 requisitos (le falta Docker): la afinidad esperada es **67 %**, el mismo ejemplo intermedio de la ayuda («Node.js, PostgreSQL, Docker» con «Node.js, PostgreSQL» = 67 %). La afinidad se calcula con la experiencia, la formación, las certificaciones, los proyectos (tecnologías) y la descripción del perfil, así que en el ensayo se confirma que el resultado sea 67 %; si el motor da otro valor, se ajusta el texto del proyecto, no el guion.

### 1.5 Dependencias de otras HU de la épica 5

La demo recorre el flujo completo de la bolsa de trabajo, así que depende de HU que hacen otras épicas (reparto de Saul del 19/11). Si una no está en el despliegue, los pasos que bloquea no se pueden mostrar y sus CA quedan como «No cumple por dependencia» en la matriz.

| HU | Épica | Qué necesita la demo | Pasos que bloquea | Estado al 21/11/2026 |
|---|---|---|---|---|
| HU-19 Datos de prueba y ambiente de demo | 8 | Datos de ejemplo cargados (plan A). | Ninguno con el plan B | El seed `hu19-demo` entró a dev el 21/11 (PR #973), después de nuestra entrega; no se sabe si se ejecutó en la base del despliegue. **Se usa el plan B.** |
| HU-09 Requisitos técnicos estructurados | 6 | Campo de requisitos al publicar la vacante (Node.js, PostgreSQL, Docker). | D1, D3, D8 | En dev (PR #921) y desplegada |
| HU-10 Servicio de matching en backend | 1 | Porcentaje calculado y guardado, y contrato `comparison[]` (requisito, habilidad, resultado). | D3, D6, D8 | En dev (PR #940) y desplegada |
| HU-11 Similitud avanzada del motor | 2 | Peso de la coincidencia parcial y resultado «Coincide parcialmente». | D3, D4, D8 | En dev (PR #947) y desplegada |
| HU-12 Recálculo automático de afinidad | 7 | Recálculo al cambiar el perfil. | D3: recalcula cada 30 s y cerraba «¿Cómo se calcula?» | En dev desde el 21/11. La corrección para que no recalcule con la ventana abierta está en epic9 (PR #1019); si no llegó al despliegue, en D3 se abre la ventana justo después de cargar la vacante |
| HU-14 Ciclo de vida de la vacante | 8 | La vacante publicada aparece en el listado público y acepta postulaciones. | D1, D3, D6 si falla la publicación actual | En dev. La publicación se prueba en el ensayo |
| HU-15 Comparación real postulante-vacante | 4 | Desglose real en el detalle del postulante, sin datos de ejemplo. | D7, D8 | En dev (PR #946) y desplegada |

No hacen falta para la demo: HU-13 (editar vacante, en dev), HU-17 (suite de pruebas, PR #954 de epic3 abierto) y HU-18 (rendimiento y accesibilidad, en epic7).

### 1.6 Lista de control antes de la demo

- [x] Fusionadas en epic9 todas las tasks: T16.1 (#928), T16.2 (#925), T16.3 (#935), T16.4 (#923), T20.1 (#939 y #948), T20.2 (#934) y T20.3 (#936).
- [x] epic9 en dev (#952), despliegue actualizado y migración del CV aplicada.
- [x] Integración de dev (#1017) y corrección de la recarga de 30 s (#1019) fusionadas en epic9.
- [ ] epic9 llevado a dev con esas correcciones y despliegue actualizado.
- [ ] Script `04-cuentas-qa-epica9-hu5.sql` ejecutado por Mijael (cuentas de titulado) y cuentas de los reclutadores 1 y 2 disponibles.
- [ ] Cuentas de la sección 1.3 creadas, vacías y probadas (inicio de sesión de las 4).
- [ ] Archivos de la sección 1.4 a mano.
- [ ] Ensayo completo de las secciones 2 y 3 hecho y anotado en la sección 5, con la afinidad de 67 % confirmada.
- [ ] Después del ensayo, borrar la vacante y los registros creados, para empezar la demo con las cuentas vacías.
- [ ] HU-20 CA-06 probado antes de la demo con una persona que no conoce el sistema.
- [ ] Grabación preparada.
- [ ] Teléfono real (390 px o más) y tablet a mano.

## 2. Demo a la PO (plan B)

Recorrido de punta a punta, en este orden. Los pasos D1 y D2 crean los datos en vivo.

| Paso | Cuenta | Acción | Resultado esperado | CA |
|---|---|---|---|---|
| D1 | Reclutador 1 | Publicar la vacante «Desarrollador backend Node.js» con los requisitos Node.js, PostgreSQL y Docker. | La vacante aparece en «Mis vacantes» y en «Bolsa de trabajo». | Datos para HU-20 CA-12 |
| D2 | Titulado A | En el perfil (/profile), agregar la experiencia, la formación, la certificación y el proyecto de la sección 1.4. | Los 4 registros aparecen en el perfil. | Datos para D3 y D7 |
| D3 | Titulado A | En «Bolsa de trabajo» (/job-postings), abrir la vacante y presionar «¿Cómo se calcula?» junto al porcentaje; cerrar con «Entendido» y después con la X. | La afinidad es 67 %; la ventana marca Node.js y PostgreSQL «Exacta» y Docker «No encontrada», y muestra la cuenta del porcentaje; no se cierra sola mientras se explica; al cerrarla, la pantalla queda como estaba. | HU-20 CA-09, CA-10, CA-11 |
| D4 | Titulado A | Presionar «Ayuda» y abrir la pestaña «Cómo funciona la afinidad». | Están las pestañas «Titulado», «Reclutador» y «Cómo funciona la afinidad», la fórmula «Afinidad = requisitos cumplidos ÷ total de requisitos», lo que suma una coincidencia exacta y una parcial, y 3 ejemplos: 0 %, 67 % y 100 %. | HU-20 CA-01, CA-02, CA-07, CA-08 |
| D5 | Titulado A | En el perfil, sección «Currículum (CV)», subir `cv-titulado-a.pdf`. | Antes de subir se ven «Formato PDF, hasta 4 MB» y el aviso «Tu CV solo lo verán las empresas de las vacantes a las que postules»; al subir, sale «Tu CV se subió correctamente» con el nombre y la fecha. | HU-16 CA-01, CA-02, CA-05 |
| D6 | Titulado A | Postularse a la vacante de D1. | La postulación queda registrada. | Datos para D7 a D9 |
| D7 | Reclutador 1 | Abrir «Mis vacantes» > Postulantes > Titulado A, pestaña «Perfil». | Están solo «Correo», «Ubicación», «Nivel de experiencia», «Experiencia laboral», «Formación académica», «Certificaciones», «Estado» y «Fecha de postulación», con los registros cargados en D2 y sin datos personales. | HU-16 CA-07, CA-08 |
| D8 | Reclutador 1 | Abrir la pestaña «Coincidencia técnica» y presionar «¿Cómo se calcula?» junto al porcentaje. | El desglose compara cada requisito con las habilidades del titulado; el porcentaje es 67 %, el mismo que vio el titulado en D3 y el del ejemplo intermedio de la ayuda. | HU-20 CA-09, CA-10, CA-12 |
| D9 | Reclutador 1 | Presionar «Descargar CV». | Se descarga «CV - <nombre del Titulado A>.pdf» y se abre. | HU-16 CA-09 |

## 3. Verificación de los demás CA

| Paso | Cuenta | Acción | Resultado esperado | CA |
|---|---|---|---|---|
| V1 | Titulado A | En la ayuda, abrir la pestaña «Titulado» y presionar «Ir a la pantalla» en cada paso. | Están «1. Buscar una vacante», «2. Ver la afinidad», «3. Postularse» y «4. Subir el CV», en ese orden; cada paso tiene imagen y explicación, y el botón abre su pantalla. | HU-20 CA-03, CA-05 |
| V2 | Reclutador 1 | En «Mis vacantes», presionar «Ayuda» y abrir la pestaña «Reclutador». | Abre /ayuda/bolsa-de-trabajo con «1. Publicar una vacante», «2. Ver los postulantes», «3. Evaluar a un postulante» y «4. Descargar el CV», en ese orden. | HU-20 CA-01, CA-04, CA-05 |
| V3 | Titulado A | En «Currículum (CV)», presionar «¿Qué datos ve la empresa?» y luego «Entendido». | Se abre la ventana con las listas «La empresa ve» y «La empresa no ve», y se cierra. | HU-16 CA-13 |
| V4 | Titulado A | Subir `cv.docx`. | Debajo del botón sale «El CV debe ser un archivo PDF» y no se sube nada. | HU-16 CA-03 |
| V5 | Titulado A | Subir `cv-grande.pdf`. | Debajo del botón sale «El archivo supera el tamaño máximo de 4 MB» y no se sube nada. | HU-16 CA-04 |
| V6 | Titulado A | Presionar «Reemplazar CV» y subir `cv-titulado-a-v2.pdf`. | La sección muestra el nombre y la fecha del nuevo archivo. | HU-16 CA-06 |
| V7 | Reclutador 1 | Volver a descargar el CV del Titulado A. | Se descarga el archivo nuevo. | HU-16 CA-10 |
| V8 | Titulado B y reclutador 1 | El Titulado B se postula sin subir CV; el reclutador 1 abre su detalle. | «Descargar CV» está deshabilitado y debajo sale «El postulante aún no subió su CV». | HU-16 CA-11 |
| V9 | Reclutador 1 | Revisar la lista de postulantes. | No muestra carnet, teléfono, fecha de nacimiento, dirección ni datos de la encuesta. | HU-16 CA-08 |
| V10 | Reclutador 1 y 2 | Como reclutador 1, copiar la dirección del detalle del Titulado A; cerrar sesión, ingresar como reclutador 2 y abrirla. | Sale «No se encontró al postulante.» y no está «Descargar CV». | HU-16 CA-12 |
| V11 | Titulado A y reclutador 1 | En un teléfono real (390 px o más) y en una tablet, abrir el perfil, el detalle del postulante, la página de ayuda y la ventana «¿Cómo se calcula?». | No hay desplazamiento horizontal de la página. | HU-16 CA-14, HU-20 CA-13 |

El HU-20 CA-06 se prueba antes de la demo: una persona que no conoce el sistema se postula a una vacante siguiendo solo la pestaña «Titulado». En la demo se presenta el resultado y, si hay, el video.

## 4. Matriz de criterios

Se completa en la demo y en la verificación: «Cumple», «No cumple», «No cumple por dependencia (HU y épica)» u «Observación».

| HU | CA | Paso | Resultado | Nota |
|---|---|---|---|---|
| HU-16 | CA-01 | D5 | | Límite real de 4 MB (ver 1.1) |
| HU-16 | CA-02 | D5 | | |
| HU-16 | CA-03 | V4 | | |
| HU-16 | CA-04 | V5 | | Límite real de 4 MB (ver 1.1) |
| HU-16 | CA-05 | D5 | | |
| HU-16 | CA-06 | V6 | | |
| HU-16 | CA-07 | D7 | | |
| HU-16 | CA-08 | D7, V9 | | |
| HU-16 | CA-09 | D9 | | |
| HU-16 | CA-10 | V7 | | |
| HU-16 | CA-11 | V8 | | |
| HU-16 | CA-12 | V10 | | |
| HU-16 | CA-13 | V3 | | |
| HU-16 | CA-14 | V11 | | |
| HU-20 | CA-01 | D4, V2 | | |
| HU-20 | CA-02 | D4 | | |
| HU-20 | CA-03 | V1 | | |
| HU-20 | CA-04 | V2 | | |
| HU-20 | CA-05 | V1, V2 | | |
| HU-20 | CA-06 | Antes de la demo | | |
| HU-20 | CA-07 | D4 | | |
| HU-20 | CA-08 | D4 | | |
| HU-20 | CA-09 | D3, D8 | | |
| HU-20 | CA-10 | D3, D8 | | Etiquetas «Exacta», «Similar» y «No encontrada» (ver 1.1) |
| HU-20 | CA-11 | D3 | | |
| HU-20 | CA-12 | D1, D8 | | |
| HU-20 | CA-13 | V11 | | |

## 5. Ensayo

| Fecha | Participantes | Pasos que fallaron | Corrección y responsable |
|---|---|---|---|
| | | | |

## 6. Acta de la demo

| Dato | Valor |
|---|---|
| Fecha y hora | |
| Modalidad (presencial o enlace de la reunión) | |
| Asistentes | PO: · Git Lead: Juan Carlos Anagua · Integrantes: |
| Plan usado | B (datos creados en vivo) / A (datos de la HU-19) |
| Grabación (enlace) | |
| Resultado | __ de 14 CA de la HU-16 y __ de 13 CA de la HU-20 cumplidos (detalle en la sección 4) |

### 6.1 Observaciones de la PO

| N.º | Observación | HU y CA | Responsable | Fecha compromiso |
|---|---|---|---|---|
| 1 | | | | |

### 6.2 Acuerdos

- 

### 6.3 Cierre

- [ ] Observaciones registradas y asignadas.
- [ ] Correcciones de las observaciones fusionadas en epic9 y llevadas a dev por PR.
