# Rutas Frontend · Épica 8 (PWA UMSSPIRA)

Código en `apps/web/src/`. Corte original: rama `epic8` al 14/11/2026 (commit `87f7249f`). Revisado el 24/11/2026 contra el árbol de carpetas de la rama `epic8` (captura del explorador); los archivos que no aparecen en la captura están marcados «por ubicar».

**Convenciones.** «Privada» = el Service Worker no la guarda en caché (`PRIVATE_ROUTE_PREFIXES` en `public/sw.js`). Los prefijos `S1-`, `S2-`, `S3-` y `E5-` se explican en `ReporteEpica.md`. Estado: **Nueva**, **Modificada**, **Sin cambios de archivo**, **Pendiente**.

## 0. Árbol de la épica (según el diagrama de carpetas)

Solo se anotan las carpetas y archivos que pertenecen a la épica; el resto del árbol es de otros equipos.

```text
apps/web/src/
├─ app/
│  ├─ (dashboard)/            · E5-HU14: /empresa/mis-vacantes (ubicación exacta por confirmar)
│  ├─ (public)/
│  ├─ api/                    · route handlers de Next (contenido por confirmar)
│  ├─ fonts/
│  ├─ mis-pases/              · S3-HU02/03  (fuera del alcance /portal del SW)
│  ├─ offline/                · S1-HU01, S3-HU01, S3-HU04, S3-HU14 (respaldo)
│  ├─ portal/                 · S1-HU02/8.5 (layout), S3-HU05 (page.tsx)
│  │  ├─ admin/
│  │  ├─ beneficios/          · ruta cacheable (S3-HU04)
│  │  ├─ comunidad/           · ruta cacheable (S3-HU04)
│  │  ├─ configuracion/       · S3-HU01, S3-HU06  (privada)
│  │  ├─ empleos/             · ruta cacheable (S3-HU04)
│  │  ├─ eventos/             · ruta cacheable (S3-HU04)
│  │  ├─ institucional/
│  │  ├─ job-postings/        · E5-HU14 (estados de vacante en la vista pública)
│  │  ├─ mensajes/            · S2-HU06, S3-HU04 CA-06  (privada)
│  │  ├─ mentorias/
│  │  ├─ validacion-offline/  · carpeta nueva; ¿pantalla de S3-HU08? (confirmar)
│  │  ├─ layout.tsx · page.tsx · page.test.tsx · portal.css · resultados.ts
│  ├─ radar-preview/ · test-form/
│  ├─ globals.css · layout.tsx · manifest.ts · page.tsx
│  ├─ register-sw.ts · register-sw.test.ts
│  ├─ service-worker-register.tsx · service-worker.test.ts
│  ├─ service-worker-notification-click…(.test.ts)
│  └─ sw-extensions.test.ts
├─ features/
│  ├─ chat/
│  │  ├─ components/   ComposeRequest · ConversationPanel (+ test) · MessagesNavBadge
│  │  │                MessagesOfflineGuard · StartChatButton
│  │  ├─ hooks/        useConversations · useStartDirectChat · useUnreadSummary
│  │  └─ utils/
│  ├─ event-passes/ · events/ · home/ · job-postings/ · mentorship/ · notifications/
└─ hooks/
   └─ useServiceWorkerUpdate.ts
```

Nota: el reporte del 14/11 cita `features/chat/hooks/useSendMessage.ts`, que no aparece en la captura (hooks solo muestra tres archivos). Confirmar si se renombró.

---

## 1. Sprint 1 · Core PWA Shell

| Ruta o recurso | Archivo | Estado | HU | Qué hace |
|---|---|---|---|---|
| `/` (Home) | `src/app/page.tsx`, `src/features/home/` | Evidencia en el árbol | S1-HU02 | Banner, buscador, accesos, notificaciones, «Próximos eventos destacados» (3 columnas ≥ 1024 px, 2 en tablet, 1 en móvil) y pie de página. |
| Layout raíz | `src/app/layout.tsx`, `src/app/globals.css` | Evidencia en el árbol | S1-HU02, S1-HU8.3, S1-HU8.5 | Encabezado «Titulados UMSS», metadatos (descripción, theme-color, viewport, apple-touch-icon), tokens base y menú hamburguesa < 768 px. |
| `/manifest.webmanifest` | `src/app/manifest.ts` | Evidencia en el árbol | S1-HU8.3 | `name` «Titulados UMSS», `short_name`, `start_url`, `display: standalone`, colores, `lang` e íconos 192 y 512 (incluida variante *maskable*). |
| `/icons/*` | `public/icons/` | Sin cambios | S1-HU8.3 | Íconos de la PWA. |
| Registro del Service Worker | `src/app/register-sw.ts`, `src/app/service-worker-register.tsx` | Evidencia en el árbol | S1-HU01 | Registra `/sw.js` cuando el navegador lo soporta; sin soporte, la app funciona normal (S3-HU01 CA-05). |
| Pruebas del Service Worker | `service-worker.test.ts`, `register-sw.test.ts`, `sw-extensions.test.ts` | Evidencia en el árbol | S1-HU01 | Cobertura del registro y de los ganchos para otros equipos. |
| Páginas globales «No encontrado» y «Error» | por ubicar (`not-found.tsx`, `error.tsx`) | Por verificar | S1-HU02 CA-06 | Opción de volver al Home. |

**Alcance de verificación de QA (S1-HU8.4):** Chrome y Firefox en escritorio y móvil, sin superposiciones; sesión conservada al cambiar de navegador cuando corresponda. Falta guardar la evidencia (ver `ReporteEpica.md` (sección 10), M-07).

---

## 2. Sprint 2 · Chat 1 a 1 (parte web)

| Ruta o pieza | Archivo | Estado | HU | Qué hace |
|---|---|---|---|---|
| `/portal/mensajes` | `src/app/portal/mensajes/page.tsx` | Modificada (la tocó S3-HU04) | S2-HU03, S2-HU06, S2-HU14 | Pantalla de Mensajes con tres bandejas (Chats, Solicitudes, Rechazadas) y panel de conversación. Admite `?recipient=` (S2-HU03 CA-11) y `?conversation=` (S2-HU06 CA-09). Privada. |
| Formulario «Nuevo mensaje» | `features/chat/components/ComposeRequest.tsx` | Evidencia en el árbol | S2-HU03 | Buscador de personas (20 por página, «Ver más personas»), motivo de 1 a 500 caracteres con contador. |
| Botón «Escribir» | `features/chat/components/StartChatButton.tsx` | Evidencia en el árbol | S2-HU03 | Abre el formulario con la persona preseleccionada; si ya hay conversación, abre la existente. |
| Iniciar chat directo | `features/chat/hooks/useStartDirectChat.ts` | Evidencia en el árbol | S2-HU03 | Crea la solicitud sin duplicar y reutiliza el identificador del envío. |
| Lista de conversaciones | `features/chat/hooks/useConversations.ts` | Evidencia en el árbol | S2-HU06 | Carga, orden por actividad, bandejas y reintento. |
| Panel de conversación | `features/chat/components/ConversationPanel.tsx` (+ `.test.tsx`) | Evidencia en el árbol | S2-HU04, S2-HU05, S2-HU08, S2-HU11 a S2-HU14 | Enviar, recibir, historial por páginas de 30, eliminar, adjuntar, editar y aceptar/rechazar. |
| Contadores de no leídos | `features/chat/hooks/useUnreadSummary.ts` | Evidencia en el árbol | S2-HU07, S2-HU10, S3-HU16 | Total y últimas 5 conversaciones pendientes; refresco en vivo. |
| Botón en la barra superior | `features/chat/components/MessagesNavBadge.tsx` | Evidencia en el árbol | S2-HU09, S2-HU10 | Insignia (99+), panel con «Ver todos los mensajes», cierre con Esc o clic fuera. Se oculta sin sesión. |
| Conexión en tiempo real | por ubicar (¿`features/chat/utils/`?) | Por verificar | S2-HU01, S2-HU02 | Socket.IO autenticado, reintento de 2 s a 15 s, revalidación de sesión cada 30 s. |

---

## 3. Sprint 3 · Offline PWA y Service Worker

### 3.1 Rutas (páginas) del bloque A

| Ruta | Archivo | Estado | HU | Qué hace |
|---|---|---|---|---|
| `/portal` | `src/app/portal/page.tsx` | Modificada | S3-HU05 | Tarjeta «Estado de conexión», alerta superior sin conexión, etiqueta «En línea / Sin conexión» y aviso «Conexión restablecida». |
| `/portal/configuracion` | `src/app/portal/configuracion/page.tsx` | **Nueva** (privada) | S3-HU01, S3-HU06 | Espacio de caché usado, última actualización, versión del SW, «Actualizar caché» y aviso «Actualizar ahora / Más tarde». |
| `/offline` | `src/app/offline/page.tsx` | Modificada | S3-HU01 (CA-04), S3-HU04 (CA-05), S3-HU14 | Página de respaldo «Sin conexión a Internet» con «Reintentar conexión» y accesos a Mis QR, Eventos y el portal. |
| `/offline-secciones.html` | `public/offline-secciones.html` | **Nueva** (estática, **sin uso**) | S3-HU04 | Secciones disponibles sin conexión. Ninguna ruta ni el SW la usan: reutilizarla en S3-HU14 o eliminarla. |
| `/mis-pases` | `src/app/mis-pases/page.tsx` → `src/features/event-passes/my-qr-passes-page.tsx` | Modificada | S3-HU02, S3-HU03 | Con conexión pide los pases a la API; sin conexión muestra los guardados. Incluye el estado de sincronización. |
| `/portal/mensajes` | `src/app/portal/mensajes/page.tsx` | Modificada | S3-HU04 (CA-06) | Sin conexión muestra el bloqueo del chat (`MessagesOfflineGuard`). Privada. |
| `/portal/eventos` | `src/app/portal/eventos/page.tsx` | Sin cambios de archivo | S3-HU04 | Su listado funciona sin conexión porque `events-service.ts` lee el catálogo guardado. |
| `/events/catalog/[id]` | `src/app/(dashboard)/events/catalog/[id]/page.tsx` | Modificada | S3-HU04 | Detalle de evento visitado; inscripción y cancelación deshabilitadas sin conexión. |
| `/portal/validacion-offline` | `src/app/portal/validacion-offline/` | **Por confirmar** | S3-HU08 (posible) | Carpeta presente en el árbol; si es la pantalla de validación, actualizar el estado de S3-HU08 en el reporte. |

### 3.2 Componentes, hooks y servicios (no son rutas)

| Archivo | HU | Función |
|---|---|---|
| `src/features/event-passes/offline/offline-qr-storage.ts` | S3-HU02 | IndexedDB `umsspira-offline`, almacén `qr-passes` (índice `by-user-id`): guardar, listar, leer y borrar pases. |
| `src/features/event-passes/event-pass-qr-card.tsx`, `src/modules/events/components/EventPassCard.tsx` | S3-HU02 | Botón y estado de guardado del pase. |
| `src/features/event-passes/offline/offline-sync.ts`, `use-offline-sync.ts`, `offline-sync-status.tsx` | S3-HU03 | Sincronización al volver la red; «Este pase ya no es válido»; aviso de resultado y última actualización. |
| `src/features/event-passes/offline/offline-session.ts` | S3-HU07 | Sesión válida sin conexión hasta 7 días; borrado de datos privados; cierre pendiente. |
| `src/modules/auth/frontend/components/logout-button.tsx` | S3-HU07 | Borra primero los datos offline; sin conexión deja el cierre pendiente. |
| `src/shared/services/auth-session.ts` | S3-HU07 | `setAccessToken` registra la sesión validada. |
| `src/shared/services/events-offline-cache.ts` | S3-HU04 | IndexedDB `umsspira-hu04`, almacén `public-events`. |
| `src/shared/services/events-service.ts` | S3-HU04 | Sin conexión devuelve el catálogo guardado; con conexión lo guarda. |
| `src/features/events/cancel-registration-action.tsx`, `event-detail-page.tsx` | S3-HU04 | Acciones deshabilitadas con «Necesitas conexión para esta acción». |
| `src/features/chat/components/MessagesOfflineGuard.tsx` | S3-HU04 | Bloquea el chat sin conexión. |
| `src/shared/hooks/use-online-status.ts` | S3-HU04, S3-HU05 | Hook de estado de conexión (uno de los tres detectores; ver `ReporteEpica.md` (sección 10), M-01). |
| `src/hooks/useServiceWorkerUpdate.ts` | S3-HU06 | Detecta versión nueva del SW y permite aplicarla. |

### 3.3 Archivos públicos del Service Worker

| URL | Archivo | Nota |
|---|---|---|
| `/sw.js` | `public/sw.js` | Alcance `/portal`. Cachés: núcleo, estáticos, assets, configuración y rutas. Mensajes: `SKIP_WAITING`, `SET_DEVICE_PROFILE`, `UPDATE_CACHE`. `VERSION` = `v1.0.0`. |
| `/sw-extensions.js` | `public/sw-extensions.js` | Gancho para módulos de otros equipos (notificaciones push). Sin cambios. |
| `/manifest.webmanifest` | `src/app/manifest.ts` | Ver sección 1. |

Rutas que el SW puede dejar abrir sin conexión (`OFFLINE_ALLOWED_ROUTES`): `/portal`, `/portal/eventos`, `/portal/empleos`, `/portal/beneficios`, `/portal/comunidad`.

### 3.4 Bloque B · Mejoras S3-HU09 a S3-HU18 (lo que cambiará en el frontend)

| HU | Estado | Archivos previstos | Qué cambia |
|---|---|---|---|
| S3-HU09 | Pendiente | `app/page.tsx`, `features/home/`, `features/event-passes/` | Acceso destacado a «Mis códigos QR» (máximo 2 toques); «Guardar nuevo QR» desde lista y detalle; comparativo de pasos antes/después. |
| S3-HU10 | Pendiente | `src/shared/components/` (componente único de avisos, nombre por definir) | Carga < 300 ms, éxito, error con «Reintentar» y «Necesitas conexión para esta acción»; ícono + texto. |
| S3-HU13 | Pendiente | `features/event-passes/`, `events-offline-cache.ts` | Aviso «Algunos servicios no responden. Mostrando lo guardado en tu dispositivo». |
| S3-HU14 | **Parcial** (`/offline` ya tiene accesos) | `app/offline/page.tsx` | «Todavía no hay conexión» sin ciclo de recargas; ruta privada sin sesión pide iniciar sesión; diseño con logo, colores y barra. |
| S3-HU15 | Pendiente (Oliver) | `app/layout.tsx`, `app/portal/layout.tsx` | Un solo componente de navegación para móvil y escritorio; foco con teclado y áreas ≥ 44 px. |
| S3-HU16 | Pendiente | `MessagesNavBadge.tsx`, `useUnreadSummary.ts`, `useConversations.ts` | Contadores y línea «Mensajes nuevos». Solo con conexión. |
| S3-HU17 | Pendiente | `ConversationPanel.tsx` | Botón «Nuevos mensajes (n)», posición de lectura al volver y con teclado móvil. Solo con conexión. |
| S3-HU18 | Pendiente | límites de error por sección (`error.tsx` por segmento), servicios | Tiempo límite de 8 s y «Esta sección no está disponible. Reintentar». |

---

## 4. Épica 5 · Mejoras asignadas a epic8 (E5-HU14 y E5-HU19)

| Ruta o pieza | Archivo | Estado | HU | Qué cambia |
|---|---|---|---|---|
| `/empresa/mis-vacantes` | bajo `src/app/(dashboard)/` (confirmar) | Pendiente | E5-HU14 | Badges de estado con el vocabulario único; pausar, cerrar y dar de baja solo las propias. |
| Listado público de vacantes (`/job-postings`) | `src/app/portal/job-postings/`, `src/features/job-postings/` | Pendiente | E5-HU14, E5-HU19 | No muestra vacantes pausadas o cerradas; debe responder 200 en producción (E5-HU19 T-04). |
| Detalle público de vacante | `src/features/job-postings/` | Pendiente | E5-HU14 | Mismo texto y color de estado; postulación deshabilitada si no está disponible. |
| Mis postulaciones | `src/features/job-postings/` (confirmar) | Pendiente | E5-HU14 | Estado de la vacante con el mismo vocabulario. |
| Servicio de postulantes | `src/shared/services/applicants.ts` | Pendiente (lo cierra E5-HU15, epic4) | E5-HU19 T-02 | `NEXT_PUBLIC_USE_MOCK` en `false` por defecto; mocks solo en desarrollo. |

### Inventario de flags de mock (E5-HU19 T-02)

| Flag | Dónde se lee | Valor por defecto hoy | Valor objetivo | Pantallas afectadas |
|---|---|---|---|---|
| `NEXT_PUBLIC_USE_MOCK` | `src/shared/services/applicants.ts` | Activo (`!== "false"`) | `false` | Lista de postulantes y comparación |
| Otros | Completar desde `docs/epic3/AuditoriaMocks.md` y con `grep -rn "NEXT_PUBLIC_USE_MOCK\|USE_MOCK" apps/web/src` | — | `false` | — |

---

## 5. Pendiente de agregar cuando se fusione a `epic8`

- S3-HU14 (página de respaldo) y S3-HU15 (navegación unificada), a cargo de Oliver: completar rutas y archivos de la sección 3.4.
- S3-HU08: confirmar si la pantalla `portal/validacion-offline` es suya.
- S3-HU09, S3-HU10, S3-HU13, S3-HU16, S3-HU17 y S3-HU18: completar según se fusionen.
- E5-HU14 y E5-HU19: confirmar la ubicación exacta de `/empresa/mis-vacantes` y de «mis postulaciones».
- Verificar con una búsqueda en el repo que cada ruta de este archivo existe: `find apps/web/src/app -name "page.tsx"`.
