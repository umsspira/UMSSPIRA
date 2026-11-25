# Rutas Backend · Épica 8 (PWA UMSSPIRA)

Prefijo de todas las rutas: `/api/v1`. Controladores en `apps/api/src/modules/`. Corte original: rama `epic8` al 14/11/2026 (commit `87f7249f`). Revisado el 24/11/2026 contra los PDF de historias; **no se inspeccionó el código del backend**, por eso las rutas que los documentos no nombran aparecen como «por confirmar» y no se inventan.

Los prefijos `S1-`, `S2-`, `S3-` y `E5-` se explican en `ReporteEpica.md`.

## Resultado

**Lo fusionado a `epic8` hasta el 14/11 no agregó ni modificó rutas del backend** (cero cambios en `apps/api/` y `packages/`). Todo el trabajo offline se hizo en `apps/web/`.

Eso cambia en lo pendiente: S3-HU11, S3-HU12, E5-HU14 y E5-HU19 **sí tocan el backend** (secciones 3 y 4).

---

## 1. Sprint 1 · Core PWA Shell

Sin rutas de backend. Es un sprint 100 % de frontend (Home, manifest, Service Worker, responsive).

---

## 2. Sprint 2 · Chat 1 a 1

El documento S2 describe el comportamiento que el servidor debe garantizar, pero no lista las rutas. La tabla recoge **las reglas que el backend debe cumplir**; la columna «Ruta real» queda para completar con el controlador.

| Capacidad | Regla del servidor | HU | Ruta real (completar) |
|---|---|---|---|
| Conexión en tiempo real (Socket.IO) | Autenticada con la sesión; rechaza si no es válida; revalida la sesión cada 30 s | S2-HU01, S2-HU02 | gateway Socket.IO |
| Buscar personas | Solo cuentas activas, de cualquier rol, sin el propio usuario; orden alfabético; página de 20; filtro por nombre hasta 100 caracteres | S2-HU03 | `GET …` |
| Crear solicitud (primer mensaje) | Estado «pendiente»; 1 a 500 caracteres; rechaza usuario inexistente, dado de baja o uno mismo; no duplica conversaciones (ni con envíos simultáneos); 10 por minuto | S2-HU03 | `POST …` |
| Enviar mensaje | Solo en conversación aceptada (409 si no); guarda remitente, destinatario, contenido y fecha; idempotente por identificador de envío; 60 escrituras por minuto | S2-HU04 | `POST …` |
| Listar conversaciones | Bandejas Chats, Solicitudes y Rechazadas; último mensaje; orden por actividad | S2-HU06 | `GET …` |
| No leídos | Se guardan en el servidor; solo mensajes de la otra persona no eliminados; el marcador de lectura nunca retrocede; resumen para la barra (total y 5 conversaciones) | S2-HU07, S2-HU10 | `GET …` / `PATCH …` |
| Historial | Páginas de 30; solo participantes (404 para cualquiera más, incluso administradores) | S2-HU08 | `GET …` |
| Eliminar mensaje | Solo el autor (403 si no); retira texto y archivo; notifica a la otra persona | S2-HU11 | `DELETE …` |
| Adjuntar y descargar archivos | PDF, JPG, PNG, DOCX, XLSX, PPTX ≤ 10 MB; valida tipo y contenido (rechaza `.exe`, extensión que no coincide, Office con macros); descarga solo para participantes | S2-HU12 | `POST …` / `GET …` |
| Editar mensaje | Solo el autor; 1 a 500 caracteres; marca «Editado» solo si el texto cambió | S2-HU13 | `PATCH …` |
| Aceptar o rechazar | Solo el destinatario (403 si no); una solicitud ya procesada responde conflicto; una rechazada puede aceptarse después | S2-HU14 | `PATCH …` / `POST …` |

**Cómo completar la columna «Ruta real»** (en la raíz del repo):

```bash
grep -rnE "@(Get|Post|Put|Patch|Delete)\(" apps/api/src/modules/<modulo-del-chat> --include=*.controller.ts
grep -rn "WebSocketGateway\|@SubscribeMessage" apps/api/src/modules
```

**Pendiente de decidir:** el dueño del chat. S2 lo asigna al Grupo 9 y S3 lo trata como módulo de otro equipo (ver `ReporteEpica.md`, R-07). Mientras no se aclare, esta tabla debe revisarla quien responda por el módulo.

---

## 3. Sprint 3 · Offline PWA y Service Worker

### 3.1 Rutas existentes que usa la épica (de otros equipos)

| Método y ruta | Controlador (en `apps/api/src/modules/`) | Lo usa | HU |
|---|---|---|---|
| `GET /registrations/my-passes` | `events/http/event-passes.controller.ts` | `/mis-pases`: se piden los pases y se guardan en el dispositivo; la sincronización los vuelve a pedir. | S3-HU02, S3-HU03 |
| `GET /events/catalog` | `events/http/controllers/get-event-catalog.controller.ts` | `events-service.ts`: el catálogo público se guarda para verlo sin conexión. | S3-HU04 |
| `POST /auth/refresh` | `auth/http/controllers/refresh-session.controller.ts` | `auth-session.ts`: renueva la sesión; el token nuevo registra la sesión validada offline. | S3-HU07 |
| `POST /auth/logout` | `auth/http/controllers/logout.controller.ts` | `logout-button.tsx`: sin conexión el cierre queda pendiente y se revoca al volver la red. | S3-HU07 |

### 3.2 Cambios pendientes en el backend (mejoras S3)

| HU | Estado | Qué debe hacer el backend | Propuesta (a validar con el equipo) |
|---|---|---|---|
| S3-HU11 · Índices y carga perezosa | Pendiente | Índices por usuario, pase y fecha de actualización; lista de pases paginada y sin datos pesados (el QR y el detalle se piden al abrir); sincronización incremental; sin consultas N+1; medir antes y después (meta: ≥ 30 % menos de tiempo) | Parámetro `updatedSince` en `GET /registrations/my-passes`; paginación `page`/`limit`; migración nueva con los índices (nunca editar las aplicadas); script de medición documentado |
| S3-HU12 · Modularizar (María) | Pendiente | Módulos con una sola responsabilidad: pases offline, sincronización, versiones y caché, sesión y seguridad offline; capas separadas; pruebas propias; contratos de API sin cambios; guía breve | Seguir la convención del repo: `http/controllers`, casos de uso, `domain/policies`, repositorio; Zod con `ZodValidationPipe`; respuestas con envoltorio `{ data }` |
| S3-HU13 / S3-HU18 · Independencia | Pendiente | Tiempo límite de consulta a servicios externos (propuesta: 8 s); acceso a otros módulos solo por una interfaz o adaptador | Adaptadores en `apps/api/test/adapters/` para simular caídas (QA, S3-HU13 CA-05 y S3-HU18 CA-05) |
| S3-HU08 · Validación | Pendiente | Cuenta de prueba con un pase QR para el flujo E2E | Reutilizar el seed de demo de E5-HU19 |

**Estructura propuesta para S3-HU12** (diagrama de la HU, en texto):

```text
apps/api/src/modules/offline/
├─ passes/        pases guardados por usuario
├─ sync/          sincronización incremental
├─ versions/      versiones y caché
└─ session/       sesión y seguridad offline
   └─ cada una: http/ · application/ · domain/ · infrastructure/ · *.spec.ts
```

---

## 4. Épica 5 · Mejoras asignadas a epic8 (E5-HU14 y E5-HU19)

Los módulos `vacantes` (legacy, fuera de la convención del repo) y `job-postings` conviven; E5-HU14 los alinea en estados y permisos.

### 4.1 E5-HU14 · Rutas a corregir

| Método y ruta | Hoy | Debe quedar | Prueba |
|---|---|---|---|
| `PATCH /vacantes/:id/cerrar` | **Sin permisos ni dueño**: cualquier usuario autenticado cierra cualquier vacante (bug de seguridad) | `@RequirePermissions('empresas:self:write')` y verificación de que la vacante pertenece a la empresa del actor antes de cerrar | 403 para ajenos; 200 para dueño y miembros activos |
| `PATCH /vacantes/:id` (estado `PAUSADA`) | Solo el dueño de la empresa; el body no tiene validación Zod (lo resuelve E5-HU13, epic6) | Mismo scoping de empresa; usa el estado único | 403 para vacantes ajenas |
| `DELETE /vacantes/:id` | Existe | Mismo scoping; baja según el vocabulario único | 403 para vacantes ajenas |
| `GET /vacantes` (listado público) y `GET /vacantes/:id/oferta` | Cada módulo decide por su cuenta (incluido `fecha_cierre`) | Una sola regla: pausada, cerrada o vencida no aparece ni acepta postulaciones | e2e del listado |
| `POST /vacantes/:id/postulaciones` | Regla propia por módulo | Rechaza si la vacante no está disponible, con un código de error estable (propuesta: 409 `VACANCY_NOT_AVAILABLE`) | e2e «vacante cerrada» |

**Decisiones de diseño por confirmar con el equipo y el PO:**
- **Vocabulario único (propuesta):** `PUBLICADA`, `PAUSADA`, `CERRADA`. Los valores legados `PUBLICADO`, `ACTIVA`, `ACTIVO` pasan a `PUBLICADA` y `CERRADO` a `CERRADA` mediante una migración nueva.
- **Regla de disponibilidad (propuesta)**, en `job-posting-availability.policy`: acepta postulaciones si `estado = PUBLICADA` y (`fecha_cierre` es nula o futura).
- **403 o 404** para vacantes ajenas: 403 es lo que piden las pruebas negativas; 404 evita revelar que la vacante existe.
- **Quién puede actuar:** el dueño y los miembros activos de `empresa_usuario_registros`, igual que `verificarVacanteDeMiEmpresa` en los endpoints de postulantes, con re-filtro por empresa en el repositorio.
- **Código del bug:** quitarlo con prueba primero (test rojo que demuestre que un ajeno cierra una vacante, luego el arreglo).

### 4.2 E5-HU19 · Base de datos y despliegue

| Elemento | Detalle |
|---|---|
| Seeds | `db:seed:demo` con `epic-4.ts` y `epic-5.ts` extendidos: vacantes con requisitos técnicos, perfiles de titulado con habilidades variadas, postulaciones con y sin `porcentaje_match`. Hoy hay 3 vacantes y 13 postulaciones sin requisitos. |
| Migraciones faltantes en producción | `20261104000000_unificar_carrera_sistemas_seed` y `20261116190000_epic5_hu001_requisitos_tecnicos` (su ausencia rompe `/job-postings`) |
| Comando | `pnpm --filter api db:deploy` con el `DIRECT_URL` de producción |
| Despliegue | Render (API) y Vercel (web); el listado de vacantes debe responder 200 |
| Reglas | Nunca editar migraciones ya aplicadas; respaldo antes de tocar producción; ensayar primero en una copia |

**Checklist pre-demo (cada punto con fecha y quien lo comprobó):**

- [ ] Login por cada rol (egresado, reclutador, administrador) funciona.
- [ ] `/job-postings` responde 200 y lista las vacantes de demo.
- [ ] Una vacante pausada y una cerrada **no** aparecen en el listado.
- [ ] La afinidad se ve en vacantes y en postulaciones (con y sin cálculo).
- [ ] Una postulación nueva se crea y el reclutador la ve.
- [ ] `NEXT_PUBLIC_USE_MOCK` está en `false` en Vercel.

---

## 5. Pendiente

- Completar la tabla de la sección 2 con las rutas reales del chat.
- Cuando S3-HU11 y S3-HU12 se fusionen, listar aquí los módulos, rutas y parámetros nuevos o movidos.
- Cuando E5-HU14 se fusione, registrar el código de error definitivo y el vocabulario de estados final.
- Documentar los endpoints de estas HU en `apps/api/docs/endpoints/` (E5-HU14 en `epic5/`) y agregar sus requests a `bruno/Vacantes/`, como piden las HU de Épica 5.