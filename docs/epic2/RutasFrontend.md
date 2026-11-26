# Épica 2 · Rutas del frontend

Perfil de Egresado (Equipo 7). Rutas de `apps/web` que trabajó la épica 2, con el rol que puede entrar a cada una. Primero las del Sprint 3 y al final las de los Sprints 1 y 2.

Todas las pantallas del perfil son del titulado y están dentro de `/profile`, con un mismo diseño (`layout.tsx`: menú, barra lateral y barra superior). Si entra alguien sin sesión, el `middleware.ts` existente lo lleva al inicio de sesión.

## Sprint 3 · Titulado

| Ruta | Pantalla | Qué muestra | HU |
|---|---|---|---|
| `/profile` | Resumen del perfil | Foto de perfil (o las iniciales si no hay foto) con la subida de JPG, sección de proyectos con «Ver proyecto» que abre la vista embebida, sección de CV, botón «Volver», mini radar con «Actualizando tu afinidad…» mientras llega el cálculo y «Leer más» solo si la descripción pasa de tres líneas. Si el perfil está vacío, «Mi perfil profesional» lleva a Completar perfil y no aparece «Ver resumen» | HU-11, HU-12, HU-16, HU-17, HU-19, HU-20, HU-21 |
| `/profile/completar` | Completar perfil | Se agregan los proyectos en el acordeón, «Guardar borrador» guarda de verdad y avisa si el navegador no puede guardarlo. «Actualmente trabajo aquí» avisa «Ya tienes dos trabajos actuales» al pasar de dos | HU-12, HU-14, HU-19, HU-21 |
| `/profile/registros/agregar` | Agregar registros (nueva) | Varios registros a la vez como borradores. Los incompletos se conservan en el navegador por usuario. Un solo guardado y un solo recálculo del radar. Es el destino del botón del estado vacío de Mis registros | HU-13, HU-14, HU-15 |
| `/profile/records` | Mis registros | Cuatro pestañas: formación, experiencia, certificaciones y proyectos. El modal de eliminar recuperó su fondo y el estado vacío lleva a «Agregar registros». Botón «Volver» y camino directo desde Mi afinidad | HU-11, HU-15, HU-19 |
| `/profile/projects/[id]/edit` | Editar proyecto (nueva) | Formulario precargado con nombre, enlace https, descripción y tecnologías, con «Guardar cambios» y «Cancelar» | HU-19 |
| `/profile/certifications/[id]/edit` | Editar certificación | Se puede cambiar el respaldo al guardar y subir PDF o JPG de hasta 4 MB. Se quitaron las etiquetas de respaldo en esta pantalla | HU-15, HU-18 |

La vista embebida de un proyecto (HU-20) es una ventana sobre la pantalla actual: solo abre enlaces https. Si el sitio bloquea que se muestre dentro de otra página, enseña la tarjeta del proyecto con su enlace.

### Parámetros de las rutas

| Ruta | Parámetro | Para qué sirve |
|---|---|---|
| `/profile/completar` | `returnTo` | Ruta interna a la que vuelve el botón «Volver» (por ejemplo `/afinidad`, de la Épica 3). Solo se aceptan rutas que empiecen con `/`, para no redirigir a otro sitio |
| `/profile/completar` | `seccion` | Sección que se abre primero en el acordeón |
| `/profile/records` | `seccion` | Pestaña que se abre primero |
| `/profile/records` | `actualizado=1` | Muestra el aviso de que el registro se actualizó |
| `/profile/{...}/[id]/edit` | `id` | Registro que se edita. `returnTo` también se acepta en la edición de certificaciones |

Sin `returnTo`, «Volver» regresa a la pantalla anterior; si la pestaña se abrió directo en esa pantalla, va al inicio del egresado (`/portal`).

## Sprints anteriores

### Sprint 1 · Titulado

| Ruta | Pantalla | Qué muestra | HU |
|---|---|---|---|
| `/profile` | Resumen del perfil | Las tres secciones en modo solo lectura, del registro más reciente al más antiguo, con «Sin registros» si una sección está vacía. Botón «Editar perfil» y botón «Descargar» (desactivado si las tres secciones están vacías) | HU-03, HU-05 |
| `/profile/completar` | Completar perfil | Formulario con tres secciones en acordeón (Formación académica, Experiencia laboral y Certificaciones), barra de progreso «X de 3 secciones completas» y errores junto a cada campo. En experiencia, «Actualmente trabajo aquí» deshabilita la fecha de fin. En certificaciones se adjunta el respaldo | HU-01, HU-02 |
| `/profile/records` | Gestionar registros | Una tabla por sección con los iconos de editar y eliminar. Al eliminar pide confirmar con «Confirmar» y «Cancelar», y si falla la conexión muestra el error y deja el registro en la lista | HU-04 |
| `/profile/education/[id]/edit` | Editar formación | Formulario precargado con los datos del registro, «Guardar cambios» y «Cancelar» | HU-04 |
| `/profile/experience/[id]/edit` | Editar experiencia | Formulario precargado, con las mismas reglas que al agregar | HU-04 |
| `/profile/certifications/[id]/edit` | Editar certificación | Formulario precargado, con el respaldo actual | HU-04 |

Flujo: Registro → Completar perfil. Resumen → «Editar perfil» → Gestionar registros → «Agregar registros» (icono +) → Completar perfil. Completar perfil → «Guardar perfil profesional» → Resumen. Gestionar registros → «Volver al resumen».

### Sprint 2 · Titulado

Las rutas son las mismas del Sprint 1; en el Sprint 2 se conectaron a datos reales y se agregó contenido.

| Ruta | Pantalla | Qué agregó el Sprint 2 | HU |
|---|---|---|---|
| `/profile` | Resumen del perfil | Sección «Descripción profesional» con contador y guardado, porcentaje de completitud con las secciones que faltan enlazadas a su formulario, tarjeta «Mi afinidad» que lleva a `/afinidad` (Épica 3), estados de carga y error, vista para celular y botón «Ver respaldo» que abre el visor | HU-06, HU-07, HU-10 |
| `/profile/completar` | Completar perfil | Guardado real en la API. En certificaciones: miniatura, nombre y tamaño del respaldo con opción de quitarlo, reintento sin duplicar, campos obligatorios, aviso «certificación guardada» y botón «Ver mi afinidad» | HU-08 |
| `/profile/records` | Mis registros | Lista conectada con estados de carga y error, edición y eliminación con aviso de resultado en las tres secciones | HU-09 |
| `/profile/{education\|experience\|certifications}/[id]/edit` | Editar registro | Al editar una certificación se puede subir un nuevo respaldo JPG y abrir el visor sin perder los cambios | HU-09, HU-10 |

**Visor de respaldo (HU-10).** Ventana que se abre sobre la pantalla actual: muestra «Cargando respaldo», el error con «Reintentar», un botón para descargar el JPG original y se cierra con Esc, con clic fuera del cuadro o con el botón. «Ver respaldo» no aparece si no hay respaldo.

## Módulos del frontend

| Carpeta | Contenido |
|---|---|
| `apps/web/src/app/(dashboard)/profile/` | Páginas del perfil: resumen, completar, registros y edición de cada sección |
| `apps/web/src/modules/profile/completar/` | Formulario con acordeón, barra de progreso y las tres secciones |
| `apps/web/src/modules/profile/components/` | Gestión de registros: tabla, modal de eliminar, formularios de edición y botón de descarga del JSON |
| `apps/web/src/modules/profile/ver/` | Resumen del perfil en solo lectura |
| `apps/web/src/modules/profile/validation/` | Reglas de validación y mensajes de error del perfil |
| `apps/web/src/modules/profile/services/` | Cliente de la API del perfil |
| `apps/web/src/modules/profile/utils/` | Construcción del JSON, nombre del archivo y ruta de regreso (`return-to`) |
| `apps/web/src/modules/profile/add-records/` | Pantalla de agregar registros y guardado de borradores (Sprint 3) |
| `apps/web/src/modules/profile/state/` | Estado del perfil y de los borradores (`drafts-store`) |
| `apps/web/src/modules/profile/cv/` | Sección de CV en PDF y ventana «¿Qué datos ve la empresa?» |
| `apps/web/src/modules/profile/components/` (Sprint 3) | `profile-photo-section`, `edit-project-form`, `project-embed-modal` y `view-project-button` |
