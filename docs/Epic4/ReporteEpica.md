# Épica 4 · Reporte de la épica

**Portal de Empresas** · Equipo G6 (CodeSoft) · Estado al 14/11/2026, rama `epic4`.

El Portal de Empresas permite que una empresa invitada por la UMSS active su cuenta, gestione su perfil y su equipo, publique vacantes y revise a los titulados que se postulan a ellas.

## 1. Qué implementamos

Las fechas son las de los merges a `epic4`.

### Sprint 1 · Perfil y publicación (hasta el 18/10)

- Perfil de la empresa: encabezado (nombre, eslogan, logo, banner), datos de contacto y edición del perfil, con validación de teléfono y dirección.
- Publicación de vacantes con validaciones (`POST /job-postings`).
- Integración de esas vistas con el navbar del portal.

### Sprint 2 · Registro, invitaciones, equipo y vacantes (19/10 al 02/11)

- **US-1.4 · Registro de empresas por el administrador UMSS:** alta de la empresa, envío de invitaciones por correo (cola `correo_pendiente`), lista del registro y reenvío de invitaciones.
- **Invitación de empresa:** validación del enlace (vigente, vencido, usado, cancelado) y activación de la cuenta.
- **Gestión de usuarios de la empresa:** invitar colaboradores, cambiar rol (Administrador o Reclutador), activar o desactivar y cancelar invitaciones.
- **Mis vacantes:** lista con filtros, detalle, edición, pausar, desactivar (cerrar) y eliminar.
- **Postulantes de una vacante (HU-05):** tabla con filtros por afinidad, estado y nivel, y detalle del postulante. En este sprint funcionaba con datos de prueba, porque aún no existían postulaciones reales.

### Sprint 3 · Mejoras aceptadas por la PO (03/11 al 14/11)

| HU | Qué hace | Estado |
| --- | --- | --- |
| HU-01 · Postulantes reales | La tabla de postulantes usa la base de datos real: endpoint de lista y detalle, orden por afinidad, paginación de 10, seed con 13 postulaciones y 14 tests | Mergeada (PR #763) |
| HU-02 · Reenvío de invitaciones vencidas | Gestión de usuarios lista también las invitaciones vencidas, con su fecha de vencimiento | Backend mergeado (PR #795) |
| HU-03 · Portal de empresas en móvil | Tarjetas en móvil para vacantes, postulantes y usuarios; estados de carga, vacío y error con "Reintentar" | En revisión (PR #783) |
| HU-04 · Etapas de selección | La empresa mueve a cada postulante entre `postulado`, `en_revision`, `preseleccionado`, `entrevista` y `descartado` | Backend mergeado (PR #712 y #754); vista en curso |

Las rutas completas están en [RutasFrontend.md](./RutasFrontend.md) y [RutasBackend.md](./RutasBackend.md).

## 2. Cosas que no esperábamos

| Qué pasó | Impacto | Cómo lo resolvimos |
| --- | --- | --- |
| La Supabase de la épica se eliminó por inactividad | P1001 al migrar y sembrar; el equipo no podía iniciar sesión | Creamos una Supabase nueva y la reconstruimos con `db:deploy` + `db:seed:demo` |
| Una migración de Épica 4 quedó marcada como fallida en la base anterior (P3009) | Bloqueaba las migraciones siguientes, incluida la de chat (error 500 en `/chat/unread-summary`) | Se resolvió al pasar a la base nueva, donde las 28 migraciones se aplican en orden |
| Las postulaciones dependen de Épica 5 ("Postularme") y aún no existían | La lista de postulantes no tenía datos reales | Plan B: Épica 4 lee `postulacion` con su propio endpoint y un seed de demostración. Acuerdo de campos y códigos con Épica 5 |
| El proxy de Next.js no tenía `vacantes` en su lista de módulos | Las cookies de sesión no llegaban entre los puertos 3001 y 3000, y se intentó un `rewrites()` con `localhost` fijo | Se agregó `vacantes` al proxy oficial y se revirtió el `rewrites()` (PR #754) |
| `NEXT_PUBLIC_API_URL` configurado con `/api/v1` al final | Error 503 "No se pudo verificar la sesión" en el middleware | Documentado: la variable va sin `/api/v1` |
| El primer endpoint de etapas quedó en el módulo de Épica 1 y con un permiso de administrador | Ninguna empresa podía usarlo (403) | Se movió a `vacantes` con el permiso `empresas:self:write` y acceso para usuarios invitados (PR #754) |
| Archivos guardados con otra codificación o con finales de línea de Windows (CRLF) | Mensajes de error con tildes rotas y PRs con miles de líneas cambiadas | Se restauró el archivo afectado; recomendación de `core.autocrlf true` |
| `epic4` quedó muchos commits detrás de `dev` | Conflictos al sincronizar (proxy, test de eventos) | Ramas de HU creadas desde `origin/epic4` y `cherry-pick` para que cada PR lleve solo sus cambios |
| El perfil del titulado no guarda ubicación ni nivel de experiencia | Esas columnas de la tabla de postulantes salen como "No registrado" | Los campos admiten `null`; queda como decisión del equipo ocultar el filtro de nivel |
| Un test de eventos (Épica 7) llega roto desde `dev` | 11 tests fallan en la suite web completa | Reportado; no corresponde a Épica 4 |

## 3. Pendientes conocidos

- **Descarga del CV:** el endpoint de postulantes indica si el titulado tiene CV (`hasCv`), pero falta el endpoint para descargarlo.
- **Postulaciones reales desde Épica 5:** su botón "Postularme" debe guardar en `postulacion` con el estado `postulado`.
- **Postulaciones duplicadas:** la tabla no impide que un titulado se postule dos veces a la misma vacante. Propuesta: índice único en (`id_usuario`, `id_vacante`).
- **Vacantes sin verificación de dueño:** `PATCH /vacantes/:id/cerrar` no comprueba que la vacante sea de la empresa del usuario, y las rutas de `vacantes` del Sprint 2 no declaran permiso. Conviene alinearlas con las del Sprint 3.
- **Modo de prueba por defecto:** `applicants.ts` usa datos de prueba si `NEXT_PUBLIC_USE_MOCK` no es `false`. Para el deploy conviene invertirlo (`=== "true"`).
- **HU-04:** falta la vista de cambio de etapa y su historial; **HU-03:** pendiente el merge del PR #783.

## 4. Cómo probar

1. `pnpm --filter api db:deploy` y `pnpm --filter api db:seed:demo` (`APP_ENV=epic`).
2. En `apps/web/.env.local`: `NEXT_PUBLIC_API_URL=http://localhost:3000` y `NEXT_PUBLIC_USE_MOCK=false`.
3. `pnpm run dev`.
4. Iniciar sesión con las cuentas de `apps/api/scripts/seed/demo-accounts.ts`: el administrador para `/company-registry` y la empresa demo para `/companies`, `/empresa/mis-vacantes` (vacante "Analista de datos junior") y `/empresa/gestion_usuarios`.
