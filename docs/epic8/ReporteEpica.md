# Reporte de la Épica 8 · PWA UMSSPIRA (Grupo 9)

**Core PWA Shell (Sprint 1) · Chat 1 a 1 (Sprint 2) · Offline PWA y Service Worker (Sprint 3)**

- Corte técnico original: rama `epic8` al 14/11/2026 (commit `87f7249f`), comparada contra `dev`. 63 commits, 32 archivos, 2961 líneas agregadas y 389 quitadas. Cero cambios en el backend.
- Revisión de esta documentación: 24/11/2026. **No se volvió a inspeccionar el repositorio**: los estados del Sprint 3 vienen del reporte del 14/11 y los de los Sprints 1 y 2 se deducen del árbol de carpetas actual y de los PDF de historias. Todo lo no comprobado está marcado como «por verificar».
- Documentos hermanos: [`RutasFrontend.md`](RutasFrontend.md) · [`RutasBackend.md`](RutasBackend.md). El plan de mejoras (sección 10) y el plan a futuro (sección 11) están al final de este reporte.

## 0. Cómo leer este documento

**Convención de IDs.** Los PDF repiten números de HU (HU-01 existe en los tres sprints y también en las mejoras de Épica 5). Para no confundirlas se usa un prefijo:

| Prefijo | Origen | Ejemplo |
|---|---|---|
| `S1-` | HU_sprint1.pdf | `S1-HU01` Service Worker y caché |
| `S2-` | HU_sprint2.pdf (chat) | `S2-HU03` Enviar solicitud de mensaje |
| `S3-` | HU_Sprint3_1.pdf (offline) | `S3-HU14` Página de respaldo |
| `E5-` | HU_mejoras.pdf (Épica 5, asignadas a epic8) | `E5-HU14` Ciclo de vida de la vacante |

**Estados usados:** `Fusionada` (en `epic8`, según el reporte) · `Evidencia en el árbol` (hay archivos que la implementan, falta confirmar con QA) · `Pendiente` · `Parcial` · `Por verificar`.

## 1. Resumen por sprint

| Sprint | Alcance | HU | Puntos | Estado general |
|---|---|---|---|---|
| 1 | Core PWA Shell: Service Worker base, Home de escritorio, manifest, compatibilidad Chrome/Firefox, responsive móvil | 5 | 29 | Evidencia en el árbol; falta evidencia de QA (matriz de navegadores) |
| 2 | Chat 1 a 1 en tiempo real y botón de mensajes en la barra superior | 14 | Sin estimar («Por definir») | Evidencia en el árbol; dueño del backend por aclarar |
| 3 · A | Núcleo offline (S3-HU01 a HU08) | 8 | 33 | 7 fusionadas, S3-HU08 pendiente |
| 3 · B | Mejoras de la épica (S3-HU09 a HU18) | 10 | 33 | Pendientes de fusionar (S3-HU14 con avance parcial) |
| 3 · C | Mejoras de Épica 5 asignadas a epic8 (E5-HU14, E5-HU19) | 2 | 5 | Pendientes (ver sección 5) |

Total Sprint 3: 66 puntos (A 33 + B 33) más 5 puntos de Épica 5.

---

## 2. Sprint 1 · Core PWA Shell

**Objetivo.** Dejar una PWA instalable con identidad visual, Home navegable en escritorio y móvil, y un Service Worker base sobre el que otros equipos puedan colgar sus módulos.

| HU | Historia | Est. | Estado | Evidencia (árbol `apps/web/src`) |
|---|---|---|---|---|
| S1-HU01 | Configuración del Service Worker y caché | 8 | Evidencia en el árbol. **Reabsorbida y ampliada por S3-HU01** | `public/sw.js`, `app/register-sw.ts`, `app/service-worker-register.tsx`, `app/service-worker.test.ts`, `app/sw-extensions.test.ts` |
| S1-HU02 | Estructura del Home en Desktop | 8 | Evidencia en el árbol | `app/page.tsx`, `app/layout.tsx`, `app/globals.css`, `features/home/` |
| S1-HU8.3 | Manifest y metadatos «Titulados UMSS» | 3 | Evidencia en el árbol | `app/manifest.ts` (sirve `/manifest.webmanifest`), metadatos en `app/layout.tsx` |
| S1-HU8.4 | Pruebas de compatibilidad (Chrome y Firefox) | 5 | **Por verificar**: es una historia de QA y no hay archivo que la pruebe | Falta la matriz de resultados (ver sección 10, M-07) |
| S1-HU8.5 | Adaptabilidad responsiva para celulares | 5 | Evidencia en el árbol | `app/layout.tsx`, `app/globals.css`, `app/portal/layout.tsx`, `app/portal/portal.css` |

**Qué quedó definido en este sprint (y que los siguientes dan por hecho):**
- Layout raíz y tokens base (colores, tipografía, espaciados) reutilizables por los demás equipos (S1-HU02 CA-08).
- Instalación de la PWA y pantalla completa: se hicieron aquí y **no se repiten** en el Sprint 3.
- El botón «Cerrar sesión» del menú móvil era un placeholder (S1-HU8.5 CA-05); su función real llegó con la autenticación y, en el Sprint 3, con el borrado de datos offline (S3-HU07).

**Diferencias con lo implementado para revisar:**
- S1-HU01 CA-02 pide *precaching con Workbox*; según el reporte, `public/sw.js` es un Service Worker escrito a mano con cinco cachés. Decidir si se acepta el cambio y se actualiza la HU, o si se migra (ver sección 10, M-10).
- S1-HU8.3 CA-02 exige íconos 192 y 512 px con variante *maskable*. No hay evidencia de que se haya comprobado con Lighthouse; S3-HU08 CA-03 lo cubre.
- Los IDs `HU-8.3`, `HU-8.4` y `HU-8.5` del PDF no siguen el formato `HU-0X`; en esta documentación quedan como `S1-HU8.3`, `S1-HU8.4` y `S1-HU8.5`.

---

## 3. Sprint 2 · Chat 1 a 1 en tiempo real

**Objetivo.** Mensajería 1 a 1 con solicitud previa, historial, no leídos, archivos, edición y eliminación, y un botón de mensajes en la barra superior. Documento alineado con la rama `dev` del 04/11/2026.

| HU | Historia | Prioridad | Responsable | Evidencia en el árbol (`features/chat/`, inferida por nombre; confirmar) |
|---|---|---|---|---|
| S2-HU01 | Conectar al chat en tiempo real (Socket.IO) | Alta | Jorge | Conexión compartida; archivo por ubicar (¿`features/chat/utils/`?) |
| S2-HU02 | Reconectar automáticamente | Media | Oliver | Ídem S2-HU01 |
| S2-HU03 | Enviar solicitud de mensaje | Alta | María | `components/ComposeRequest.tsx`, `components/StartChatButton.tsx`, `hooks/useStartDirectChat.ts` |
| S2-HU04 | Enviar mensaje | Alta | Mishel | `components/ConversationPanel.tsx` (+ `.test.tsx`); el reporte cita `hooks/useSendMessage.ts` |
| S2-HU05 | Recibir mensaje en tiempo real | Alta | Ivan | `components/ConversationPanel.tsx` |
| S2-HU06 | Ver mis conversaciones y bandejas | Media | Franz | `hooks/useConversations.ts`, `app/portal/mensajes/` |
| S2-HU07 | Identificar mensajes nuevos | Media | Melani | `hooks/useUnreadSummary.ts` |
| S2-HU08 | Consultar mensajes anteriores | Media | José | `components/ConversationPanel.tsx` |
| S2-HU09 | Acceder a los mensajes desde la barra superior | Alta | Jorge | `components/MessagesNavBadge.tsx` |
| S2-HU10 | Ver mis mensajes pendientes desde la barra superior | Media | Oliver | `components/MessagesNavBadge.tsx`, `hooks/useUnreadSummary.ts` |
| S2-HU11 | Eliminar un mensaje que envié | Media | Mishel | `components/ConversationPanel.tsx` |
| S2-HU12 | Enviar documentos o archivos | Media | Ivan | `components/ConversationPanel.tsx` |
| S2-HU13 | Editar un mensaje que envié | Media | Franz | `components/ConversationPanel.tsx` |
| S2-HU14 | Aceptar o rechazar una solicitud (nueva) | Alta | Melani | `components/ConversationPanel.tsx` |

**Reglas del sprint que conviene tener a la vista (para QA y backend):**

| Regla | Valor | HU |
|---|---|---|
| Longitud de mensaje | 1 a 500 caracteres | S2-HU03, S2-HU04, S2-HU13 |
| Página de historial | 30 mensajes | S2-HU02, S2-HU08 |
| Página de personas en el buscador | 20 | S2-HU03 |
| Límite de solicitudes nuevas | 10 por minuto | S2-HU03 |
| Límite de escrituras | 60 por minuto | S2-HU04 |
| Archivos permitidos | PDF, JPG, PNG, DOCX, XLSX, PPTX, máximo 10 MB, sin macros | S2-HU12 |
| Reintento de conexión | Sin límite, espera de 2 s hasta 15 s | S2-HU02 |
| Revalidación de sesión | Cada 30 s (conexión abierta) | S2-HU01 |
| Refresco sin conexión en vivo | Al volver a la pestaña o cada 15 s | S2-HU02, S2-HU05 |
| Insignia de no leídos | Tope «99+» | S2-HU10 |

**Puntos que el reporte original no recogía y hay que resolver:**
1. **Dueño del chat.** S2 lo asigna al Grupo 9 (nombres propios por HU), pero el reporte del 14/11 y S3 lo tratan como «módulo de otro equipo». Las dos versiones no pueden ser ciertas a la vez: acordar el dueño (afecta quién avisa de cambios y quién arregla bugs).
2. **Estimaciones.** Todas figuran como «Por definir»; sin puntos no se puede medir velocidad del sprint.
3. **Archivo citado por el reporte (`useSendMessage.ts`)** que no aparece en la carpeta `features/chat/hooks/` de la captura: confirmar si se renombró o se movió.
4. **Texto «Mensajes no disponibles sin conexión»** (reporte, `MessagesOfflineGuard`) frente a **«El chat requiere conexión»** (S3-HU04 CA-06, S3-HU16 CA-07, S3-HU17 CA-07): unificar.

---

## 4. Sprint 3 · Offline PWA y Service Worker

**Objetivo del sprint.** En Modo Avión, el usuario abre la PWA y ve el código QR de sus pases desde lo guardado en el dispositivo (criterio US-3.2). Las notificaciones push son de otro equipo; los pases QR, eventos y chat son de otros equipos y esta épica solo los guarda y muestra sin conexión.

### 4.1 Bloque A · Núcleo offline (S3-HU01 a S3-HU08, 33 puntos)

| HU | Historia | Est. | Estado en `epic8` | PR |
|---|---|---|---|---|
| S3-HU01 | Configuración del Service Worker y caché | 5 | Fusionada | #698, #700 |
| S3-HU02 | Guardar y consultar mis códigos QR sin conexión | 5 | Fusionada | #717 |
| S3-HU03 | Sincronizar información offline | 5 | Fusionada | #761 |
| S3-HU04 | Navegar por secciones y eventos sin conexión | 4 | Fusionada | #768 |
| S3-HU05 | Visualizar estado de conexión | 2 | Fusionada | #701 |
| S3-HU06 | Gestionar actualizaciones del Service Worker | 4 | Fusionada | #796 |
| S3-HU07 | Proteger información almacenada offline | 5 | Fusionada | #724 |
| S3-HU08 | Validar el funcionamiento offline en Modo Avión | 3 | **Pendiente** | — |

**Qué se implementó**

- **S3-HU01 · Service Worker y caché.** `public/sw.js` con cinco cachés (núcleo, estáticos, assets, configuración y rutas), página `/offline` guardada en la instalación, perfiles de dispositivo (escritorio, móvil) que limitan los assets guardados y rutas privadas que nunca se guardan. Pantalla `/portal/configuracion` con espacio usado, última actualización, versión y botón «Actualizar caché».
- **S3-HU02 · QR sin conexión.** Los pases se guardan en IndexedDB (`umsspira-offline`, almacén `qr-passes`) por usuario, con botón de guardado en la tarjeta del pase. `/mis-pases` muestra los guardados cuando no hay red.
- **S3-HU03 · Sincronización.** Al volver la conexión se actualizan los pases guardados sin recargar. Un pase invalidado muestra «Este pase ya no es válido». Aviso en pantalla con resultado, hora de la última actualización y «Reintentar» si falla.
- **S3-HU04 · Navegación y eventos.** Caché de rutas permitidas (`/portal`, eventos, empleos, beneficios, comunidad), catálogo público de eventos en IndexedDB (`umsspira-hu04`), acciones que requieren Internet deshabilitadas con «Necesitas conexión para esta acción» y Mensajes bloqueado sin red.
- **S3-HU05 · Estado de conexión.** En `/portal`: tarjeta de estado, alerta superior sin conexión, etiqueta «En línea / Sin conexión» y aviso al restablecerse.
- **S3-HU06 · Actualizaciones.** El Service Worker responde `SKIP_WAITING` y `UPDATE_CACHE`; el hook `useServiceWorkerUpdate` avisa de una versión nueva con «Actualizar ahora / Más tarde».
- **S3-HU07 · Protección de datos.** Sesión válida sin conexión por 7 días como máximo; al cerrar sesión se borran primero los datos privados; sin red, el cierre queda pendiente y se revoca al volver.

### 4.2 Bloque B · Mejoras de la épica (S3-HU09 a S3-HU18, 33 puntos)

| HU | Mejora | Est. | Prior. | Estado | Notas |
|---|---|---|---|---|---|
| S3-HU09 | Reducir pasos en las tareas principales | 3 | Media | Pendiente | Falta el comparativo antes/después |
| S3-HU10 | Avisos visuales: carga, éxito y error | 3 | Alta | Pendiente | Un único componente de avisos; hoy cada pantalla tiene el suyo |
| S3-HU11 | Consultas rápidas: índices y carga perezosa | 5 | Media | Pendiente | **Requiere backend**; el reporte original decía «cero backend» |
| S3-HU12 | Modularizar el backend de la épica (María) | 5 | Media | Pendiente | **Requiere backend**; historia técnica |
| S3-HU13 | QR y eventos guardados disponibles aunque otros servicios fallen | 3 | Alta | Pendiente | Se verifica en S3-HU08 CA-06 |
| S3-HU14 | Página de respaldo para rutas no guardadas (Oliver) | 2 | Alta | **Parcial** | `/offline` ya trae los accesos rápidos (Mis QR y Eventos, «HU14 CA-04») |
| S3-HU15 | Unificar navegación móvil y escritorio (Oliver) | 3 | Media | Pendiente | Un solo componente; probar 360, 768 y 1280 px |
| S3-HU16 | Indicadores de mensajes no leídos | 3 | Media | Pendiente | Solo con conexión; se apoya en `useUnreadSummary` / `MessagesNavBadge` |
| S3-HU17 | Mantener la posición de lectura | 3 | Media | Pendiente | Solo con conexión; `ConversationPanel` |
| S3-HU18 | Una sección con fallas no bloquea el resto | 3 | Media | Pendiente | Tiempo límite propuesto: 8 s |

**Orden sugerido (del PDF):** S3-HU01 → S3-HU02 → S3-HU03, S3-HU04, S3-HU06, S3-HU07 → S3-HU13, S3-HU14 → S3-HU08 (verificación). En paralelo: S3-HU05, S3-HU09 a S3-HU12 y S3-HU15 a S3-HU18.

### 4.3 Reglas acordadas del sprint (pendientes de confirmar con el PO)
QR estático · sesión offline de 7 días · sin cola de acciones sin conexión · no se guardan mensajes ni adjuntos del chat · navegadores Chrome y Firefox (escritorio y móvil) más un Android; Safari/iOS fuera de alcance · avisos dentro de la página, no push.

---

## 5. Mejoras de Épica 5 asignadas a epic8 (solo E5-HU14 y E5-HU19)

Del documento `HU_mejoras.pdf` (Épica 5 · Estudios de Vacantes) al grupo **epic8** le tocan dos historias, **5 puntos**. Las demás (HU-09 a HU-13, HU-15 a HU-18 y HU-20) son de otros grupos y no se tratan aquí; solo se citan como dependencias. En el árbol, las carpetas relacionadas son `app/portal/job-postings/` y `features/job-postings/`.

### 5.1 E5-HU14 · Ciclo de vida de la vacante con permisos (3 puntos, ola 1)

*Como reclutador, quiero pausar, cerrar o dar de baja solo las vacantes de mi empresa, con estados claros y consistentes en toda la aplicación.* No depende de ninguna otra HU; **corrige un bug de seguridad abierto**.

| # | Dado que… | Cuando… | Entonces… | Verificación |
|---|---|---|---|---|
| CA-01 | Soy un usuario autenticado sin relación con la empresa de la vacante | Llamo a `PATCH /api/v1/vacantes/:id/cerrar` | La API responde 403 y la vacante no cambia | Test e2e negativo |
| CA-02 | Soy dueño o miembro activo de la empresa (`empresa_usuario_registros`) | Cierro mi vacante | Se cierra y queda en el estado único «cerrada» | Test e2e positivo |
| CA-03 | Un reclutador intenta editar o eliminar una vacante ajena | Envía `PATCH /:id` o `DELETE /:id` | Recibe 403 | Test e2e negativo |
| CA-04 | Una vacante está pausada o cerrada | Un egresado abre el listado público | No aparece | Test e2e + componente |
| CA-05 | Una vacante está pausada o cerrada, o venció `fecha_cierre` | Un egresado intenta postularse | La API rechaza la postulación con un código estable y la UI lo explica | Test e2e |
| CA-06 | Los módulos `job-postings` y `vacantes` usan nombres de estado distintos | Se revisa el código | Hay un solo vocabulario compartido, apoyado en `job-posting-availability.policy` | Revisión + unitarias |
| CA-07 | Hay filas con estados legados (`PUBLICADO`, `ACTIVA`, `ACTIVO`, `CERRADO`) | Se despliega | Una **migración nueva** las normaliza (nunca se editan las ya aplicadas) | Migración probada contra copia |
| CA-08 | Veo badges de estado | Abro `/empresa/mis-vacantes`, el detalle público y mis postulaciones | Usan los mismos textos y colores | Test de componente |

### 5.2 E5-HU19 · Datos de prueba y ambiente de demo (2 puntos, ola 2)

*Como equipo, quiero un ambiente desplegado y estable con datos de demostración realistas, para ensayar y presentar la demo sin sorpresas.* Depende de E5-HU09 (epic6, requisitos técnicos) y **bloquea E5-HU20** (epic9, documentación y demo).

| # | Tarea | Criterio de hecho |
|---|---|---|
| T-01 | Extender `db:seed:demo` (`epic-4.ts`, `epic-5.ts`) | Vacantes con requisitos técnicos, perfiles de titulado con habilidades variadas, postulaciones con y sin afinidad calculada |
| T-02 | Apagar los mocks por defecto | `NEXT_PUBLIC_USE_MOCK=false` por defecto; inventario de qué flag afecta a qué pantalla (base en `docs/epic3/AuditoriaMocks.md`) |
| T-03 | Dejar la BD de producción al día | `pnpm --filter api db:deploy` con el `DIRECT_URL` de producción aplica `20261104000000_unificar_carrera_sistemas_seed` y `20261116190000_epic5_hu001_requisitos_tecnicos` |
| T-04 | Verificar el despliegue | Render (API) y Vercel (web) arriba; el listado de vacantes responde 200 |
| T-05 | Checklist pre-demo | Login por rol, vacantes visibles, afinidad visible y postulación funcional, firmado por quien lo ejecuta |

**Riesgos propios:** T-03 toca producción; hacerlo con respaldo previo y aprobación de quien administra la BD. Si E5-HU09 aún no está fusionada, T-01 puede insertar directamente en `vacante_requisito_tecnico` (la tabla ya existe) y migrar al endpoint después.

**Aviso de nomenclatura.** `E5-HU14` no es `S3-HU14`: la primera es el ciclo de vida de vacantes y la segunda la página de respaldo offline. Los archivos de rutas ya las separan.

---

## 6. Lo que no se esperaba (hallazgos del corte del 14/11)

1. **Cambios en código de otras épicas.** Se tocaron `auth-session.ts` y `logout-button.tsx` (Autenticación), `EventPassCard.tsx`, `events-service.ts`, `cancel-registration-action.tsx` y `event-detail-page.tsx` (Eventos), y `useSendMessage.ts` y `portal/mensajes/page.tsx` (Chat). Avisar a esos equipos.
2. **Cero backend** en lo fusionado. S3-HU11 (índices) y S3-HU12 (modularizar) siguen pendientes y sí exigen backend.
3. **El Service Worker se reescribió.** `sw.js` se rehízo en unos 20 commits; su `VERSION` es `v1.0.0` (en `dev` era `v2`). Los usuarios con la versión anterior pierden sus cachés viejas al actualizar.
4. **Dos bases de datos locales y tres detectores de conexión.** IndexedDB `umsspira-offline` y `umsspira-hu04`; `use-online-status.ts`, la lógica propia de `/portal` y `use-network-status.ts` (Grupo 5) hacen casi lo mismo.
5. **Archivo sin uso.** `public/offline-secciones.html` (390 líneas) no se referencia en ningún lado.
6. **`/offline` ya trae los accesos rápidos de S3-HU14** (Mis QR y Eventos, marcados «HU14 CA-04»).
7. **Archivos generados en el repositorio.** `tsconfig.tsbuildinfo` modificado y dependencia `fake-indexeddb` con cambio en `pnpm-lock.yaml`.
8. **Mensajes de depuración.** `sw.js` y `useServiceWorkerUpdate.ts` dejan `console.log`, y `/portal/configuracion` muestra un panel de registros del Service Worker.

## 7. Riesgos y discrepancias entre documentos

| # | Riesgo o discrepancia | Impacto | Acción propuesta | Ver |
|---|---|---|---|---|
| R-01 | `/portal/configuracion` es privada y no se cachea; S3-HU01 CA-09 pide verla sin conexión con el botón deshabilitado | Falla de criterio de aceptación | Probar en Modo Avión; si falla, cachear solo el cascarón de la página | M-04 |
| R-02 | `/mis-pases` está fuera del alcance `/portal` del Service Worker | La página puede no abrir al recargar sin red: rompe el criterio US-3.2 | Ampliar el alcance o mover la ruta; es lo que debe comprobar S3-HU08 | M-03 |
| R-03 | `offline-session.ts` deja el comentario «Confirmar en access-claims.ts» sobre el campo del usuario en el token | Plazo de 7 días podría calcularse mal | Verificar el campo real | M-06 |
| R-04 | Pruebas agregadas pero no corridas para este reporte | Regresiones sin detectar | `pnpm --filter web test` antes de cada PR | M-08 |
| R-05 | Textos distintos para lo mismo (chat sin conexión, indicador de conexión) entre HU y código | QA reportará falsos fallos | Tabla de textos únicos | M-09 |
| R-06 | S1-HU01 pide Workbox; el código usa SW manual | HU desalineada con la implementación | Decidir y actualizar la HU | M-10 |
| R-07 | Dueño del chat contradictorio entre S2 y S3 | Nadie responde por los bugs del chat | Acuerdo escrito con el PO | M-11 |
| R-08 | Cambio de `VERSION` del SW de `v2` a `v1.0.0` | Podría no disparar la limpieza de cachés viejas | Política de versionado y prueba de actualización | M-05 |
| R-09 | S3-HU13/S3-HU18 dependen de interfaces de otros equipos | Bloqueo externo | Contratos de interfaz acordados | sección 11, F-06 |
| R-10 | E5-HU19 T-03 toca producción | Incidente en la BD | Respaldo + aprobación + ensayo en copia | Sección 5.2 |

## 8. Definition of Done de la épica

- [ ] S3-HU08 pasa en Chrome y Firefox (escritorio y móvil) y en un Android; Lighthouse confirma manifest, SW registrado y respuesta sin conexión.
- [ ] `pnpm --filter web test` y `pnpm --filter api test` en verde; lint y build sin errores.
- [ ] Sin `console.log` ni panel de logs del SW en producción.
- [ ] Una sola base IndexedDB y un solo detector de conexión (o decisión documentada de no hacerlo).
- [ ] E5-HU14: tests negativos de autorización en verde y vocabulario de estados único.
- [ ] E5-HU19: BD de producción al día, listado de vacantes con 200 y checklist pre-demo firmado.
- [ ] Este reporte, `RutasFrontend.md` y `RutasBackend.md` actualizados con lo fusionado.

## 9. Pendiente por sprint

- **Sprint 1:** matriz de compatibilidad (S1-HU8.4) y decisión sobre Workbox.
- **Sprint 2:** estimaciones, dueño del chat, ubicar el archivo de conexión en tiempo real.
- **Sprint 3:** S3-HU08 y las mejoras S3-HU09 a S3-HU18 (incluidas S3-HU14 y S3-HU15 de Oliver y S3-HU12 de María).
- **Épica 5:** E5-HU14 y E5-HU19.

Al fusionar cada una, actualizar este reporte y los archivos de rutas.

---

## 10. Plan de mejoras

Qué corregir y mejorar **sobre lo ya construido y lo que falta cerrar** en los Sprints 1 a 3, más las dos historias de Épica 5 asignadas a epic8. Lo que todavía no se hace y pertenece a «más adelante» está en la sección 11 de este reporte.

Fecha: 24/11/2026. Fuente: este reporte (hallazgos y riesgos), PDF de historias de los tres sprints y `HU_mejoras.pdf` (solo E5-HU14 y E5-HU19).

**Cómo leer:** Prioridad **P1** = bloquea el criterio de aceptación del sprint o es un riesgo de seguridad/datos; **P2** = deuda que se paga en esta épica; **P3** = limpieza. Esfuerzo en horas aproximadas de una persona (**S** ≤ 2 h, **M** ≤ 1 día, **L** > 1 día); son estimaciones del documento, no del equipo. «Responsable» queda «por asignar» salvo donde las HU ya nombran a alguien.

### 10.1 Vista rápida

| ID | Mejora | Sprint | Prior. | Esfuerzo | Responsable | Riesgo que cierra |
|---|---|---|---|---|---|---|
| M-03 | Alcance del SW para `/mis-pases` | 3 | **P1** | M | por asignar | R-02 |
| M-04 | `/portal/configuracion` sin conexión | 3 | **P1** | M | por asignar | R-01 |
| M-16 | E5-HU14: permisos y estados de vacante | E5 | **P1** | M | por asignar | Bug de seguridad |
| M-17 | E5-HU19: datos, mocks y despliegue de demo | E5 | **P1** | M | por asignar | R-10 |
| M-05 | Versionado del SW y limpieza de cachés | 3 | P1 | S | por asignar | R-08 |
| M-06 | Confirmar el campo del token en `offline-session.ts` | 3 | P1 | S | por asignar | R-03 |
| M-08 | Correr pruebas y dejar CI en verde | 1-3 | P1 | S | por asignar | R-04 |
| M-01 | Un solo detector de conexión | 3 | P2 | M | por asignar | Hallazgo 4 |
| M-02 | Una sola base IndexedDB | 3 | P2 | L | por asignar | Hallazgo 4 |
| M-09 | Tabla de textos únicos | 2-3 | P2 | S | por asignar | R-05 |
| M-10 | Decisión Workbox o SW manual | 1 | P2 | S | por asignar | R-06 |
| M-11 | Dueño del chat | 2 | P2 | S | PO + líderes | R-07 |
| M-07 | Matriz de compatibilidad y evidencia | 1 | P2 | M | QA | S1-HU8.4 |
| M-12 | Quitar `console.log` y panel de logs | 3 | P2 | S | por asignar | Hallazgo 8 |
| M-13 | Usar o eliminar `offline-secciones.html` | 3 | P3 | S | Oliver (con S3-HU14) | Hallazgo 5 |
| M-14 | Sacar `tsconfig.tsbuildinfo` del repo | 3 | P3 | S | por asignar | Hallazgo 7 |
| M-15 | Avisar a los equipos cuyo código se tocó | 3 | P2 | S | por asignar | Hallazgo 1 |

---

### 10.2 Detalle por mejora

#### Sprint 3 · Offline (lo más urgente)

**M-03 · Alcance del Service Worker para `/mis-pases`** (P1)
- *Problema:* el SW tiene alcance `/portal`, pero `/mis-pases` está fuera; los QR están en IndexedDB, pero la página puede no cargar al recargar sin red. Rompe el criterio del sprint (US-3.2).
- *Opciones:* (a) servir `/sw.js` con la cabecera `Service-Worker-Allowed: /` y ampliar el alcance cuidando `PRIVATE_ROUTE_PREFIXES`; (b) mover `/mis-pases` bajo `/portal`; (c) cachear solo el cascarón de la ruta. Recomendada: (a) o (b), según lo que acuerde Eventos, que es dueño de la ruta.
- *Hecho cuando:* en Modo Avión, tras recargar en `/mis-pases`, se ve el QR guardado (prueba de S3-HU08 CA-01).

**M-04 · `/portal/configuracion` sin conexión** (P1)
- *Problema:* es privada y no se guarda; S3-HU01 CA-09 pide abrirla sin conexión con «Actualizar caché» deshabilitado y «Necesitas conexión para esta acción».
- *Propuesta:* cachear solo el cascarón (HTML sin datos del usuario) y resolver los datos desde IndexedDB; mantener los datos privados fuera de caché.
- *Hecho cuando:* la pantalla abre en Modo Avión, muestra espacio usado y versión, y el botón sale deshabilitado.

**M-05 · Versionado del SW y limpieza de cachés** (P1)
- *Problema:* `VERSION` pasó de `v2` (en `dev`) a `v1.0.0`; si el esquema de nombres de caché no cambió, la limpieza de cachés viejas puede no dispararse; y S3-HU06 CA-05/CA-06 exigen borrar lo obsoleto sin tocar la sesión ni los QR.
- *Propuesta:* comparar versiones con semver (no igualdad de texto), nombrar las cachés con la versión y borrar en `activate` las que no coincidan; nunca tocar IndexedDB desde esa limpieza.
- *Hecho cuando:* una prueba instala `v2` → actualiza a `v1.0.0` y comprueba que las cachés viejas desaparecen y los QR siguen.

**M-06 · Campo del token en `offline-session.ts`** (P1)
- *Problema:* comentario «Confirmar en access-claims.ts». Si el campo es incorrecto, el plazo de 7 días (S3-HU07 CA-06/CA-07) puede fallar.
- *Hecho cuando:* se confirma el campo real, se elimina el comentario y hay un test con una sesión de 6 días (muestra QR) y otra de 8 días (pide iniciar sesión).

**M-12 · Quitar mensajes de depuración** (P2)
- Quitar los `console.log` de `sw.js` y `useServiceWorkerUpdate.ts`; el panel de registros de `/portal/configuracion` pasa a un flag de desarrollo (`NEXT_PUBLIC_SW_DEBUG`, apagado por defecto).
- *Hecho cuando:* en producción no hay logs ni panel; regla de lint `no-console` activa.

**M-01 · Un solo detector de conexión** (P2)
- Hoy: `use-online-status.ts`, lógica propia de `/portal` y `use-network-status.ts` (Grupo 5). Consolidar en `use-online-status.ts`, exportarlo y migrar los otros dos (el de Grupo 5 se coordina con ese equipo).
- *Hecho cuando:* una sola implementación y las pantallas de S3-HU05 con la misma prueba.

**M-02 · Una sola base IndexedDB** (P2)
- Hoy: `umsspira-offline` (QR) y `umsspira-hu04` (eventos públicos). Unificar en una con almacenes `qr-passes` y `public-events`, versión de esquema y **migración que copie los datos de la base vieja** antes de borrarla (sin perder QR ni sesión).
- *Riesgo:* es la única mejora que toca datos del usuario; hacerla con prueba de migración (`fake-indexeddb`) y probar S3-HU06 CA-06.
- *Hecho cuando:* los tests de almacenamiento, sesión y sincronización pasan con una sola base.

**M-09 · Tabla de textos únicos** (P2)
| Situación | Texto en la HU | Texto en el código (reporte) | Propuesta |
|---|---|---|---|
| Chat sin conexión | «El chat requiere conexión» (S3-HU04, S3-HU16, S3-HU17) | «Mensajes no disponibles sin conexión» | Usar el de la HU |
| Indicador sin conexión | «Estás navegando sin conexión» (S3-HU05) | etiqueta «Sin conexión» y alerta | Alerta con el texto de la HU; la etiqueta corta puede quedar |
| Acción bloqueada | «Necesitas conexión para esta acción» | igual | Mantener |
| Pase no guardado | «Este pase requiere conexión» (S3-HU02) | no mencionado | Verificar que existe |
| Falla de sincronización | «No se pudo actualizar. Reintentar» (S3-HU03) | «Reintentar» | Completar el texto |
Centralizar en un archivo de textos junto al componente de avisos de S3-HU10.

**M-13 · `public/offline-secciones.html`** (P3): 390 líneas sin referencia. Reusar su contenido en la página de respaldo (S3-HU14) o borrarlo. *Hecho cuando:* no queda ningún archivo huérfano.

**M-14 · Archivos generados** (P3): agregar `tsconfig.tsbuildinfo` a `.gitignore` y retirarlo del repositorio; revisar que el cambio de `pnpm-lock.yaml` solo agregue `fake-indexeddb` (dev).

**M-15 · Avisar a otros equipos** (P2): mensaje corto a Autenticación, Eventos y Chat con la lista del hallazgo 1 y el enlace al PR. *Hecho cuando:* cada equipo confirma la revisión.

#### Sprints 1 y 2

**M-07 · Matriz de compatibilidad y evidencia** (P2, S1-HU8.4)
- Armar una tabla de los 20 criterios × 4 entornos (Chrome/Firefox × escritorio/móvil) más un Android; guardar capturas en `docs/epic8/evidencias/` y registrar versión del navegador y fecha. Reutilizar el resultado para S3-HU08 CA-02 y S3-HU15 CA-04 (360, 768 y 1280 px).

**M-10 · Workbox o Service Worker manual** (P2, S1-HU01)
- S1-HU01 CA-02 pide Workbox; el código es manual. Decidir: (a) aceptar el SW manual y **editar la HU** (más simple, ya funciona y está probado); (b) migrar a Workbox (menos código propio, más dependencia). Recomendada: (a), anotando el motivo. *Hecho cuando:* HU y código dicen lo mismo.

**M-11 · Dueño del chat** (P2, Sprint 2)
- S2 asigna el chat al Grupo 9; S3 y el reporte lo dan por de otro equipo. Acordar por escrito quién responde por bugs y quién aprueba cambios (S3-HU16 y S3-HU17 lo modifican). Además, asignar estimaciones (hoy «Por definir»).

#### Transversal

**M-08 · Pruebas y CI** (P1)
- Correr `pnpm --filter web test` y `pnpm --filter api test`, más lint y build, antes de cada PR. Los tests nuevos (almacenamiento, sesión offline, catálogo de eventos, cierre de sesión) no se habían ejecutado para el reporte.
- *Hecho cuando:* CI en verde y el resultado pegado en la descripción del PR.

---

### 10.3 Mejoras de Épica 5 asignadas a epic8

#### M-16 · E5-HU14 · Ciclo de vida de la vacante con permisos (P1, 3 pts, ola 1)
Detalle completo en la sección 5.1 y `RutasBackend.md` (sección 4.1).

| Paso | Qué | Cierra |
|---|---|---|
| 1 | Escribir primero el test que demuestra el bug (un ajeno cierra una vacante ajena) | Seguridad |
| 2 | `@RequirePermissions('empresas:self:write')` y verificación de empresa en `PATCH /vacantes/:id/cerrar`, con re-filtro por empresa en el repositorio | Seguridad |
| 3 | Un solo vocabulario de estados compartido por `job-postings` y `vacantes` | Deriva de estados |
| 4 | Migración nueva para normalizar estados legados | Datos |
| 5 | Regla única de disponibilidad (pausada, cerrada o vencida no aparece ni acepta postulaciones) | Consistencia |
| 6 | Unificar badges en `/empresa/mis-vacantes`, detalle público y mis postulaciones | UX |
| 7 | Tests negativos: un reclutador no cierra ni edita vacantes ajenas | Calidad |

#### M-17 · E5-HU19 · Datos de prueba y ambiente de demo (P1, 2 pts, ola 2)
Detalle completo en la sección 5.2 y `RutasBackend.md` (sección 4.2).

| Paso | Qué | Dependencia |
|---|---|---|
| 1 | Extender `db:seed:demo` (vacantes con requisitos, perfiles variados, postulaciones con y sin afinidad) | E5-HU09 (epic6); si no está, insertar directo en `vacante_requisito_tecnico` |
| 2 | `NEXT_PUBLIC_USE_MOCK=false` por defecto e inventario de flags | E5-HU15 (epic4) retira el mock de `applicants.ts` |
| 3 | `db:deploy` en producción (2 migraciones faltantes), con respaldo y aprobación | — |
| 4 | Verificar Render y Vercel (`/job-postings` responde 200) | Paso 3 |
| 5 | Checklist pre-demo firmado | Pasos 1 a 4 |

---

### 10.4 Calendario sugerido

Las dependencias reales mandan sobre la fecha; no hay fechas del PO en los documentos, así que se ordena por olas.

| Ola | Contenido | Por qué en este orden |
|---|---|---|
| 1 | M-16 (E5-HU14), M-08, M-06, M-05, M-03, M-04 | Seguridad y criterio US-3.2; no dependen de nadie |
| 2 | M-17 (E5-HU19), M-12, M-15, M-09, M-10, M-11 | Preparan la demo y limpian lo que otros verán |
| 3 | M-01, M-02, M-07, M-13, M-14 | Consolidación y evidencia, con la base ya estable |
| Cierre | S3-HU08 (verificación final) | Necesita todo lo anterior (depende de S3-HU13 y S3-HU14) |

### 10.5 Cómo medir que mejoró

| Indicador | Hoy | Meta |
|---|---|---|
| Criterios de S3-HU08 que pasan | 0 de 6 (pendiente) | 6 de 6 en Chrome, Firefox y Android |
| Detectores de conexión | 3 | 1 |
| Bases IndexedDB | 2 | 1 |
| `console.log` en el SW de producción | Varios | 0 |
| Tests negativos de autorización de vacantes (E5-HU14) | 0 | ≥ 1 por cada ruta (cerrar, editar, eliminar) |
| Migraciones sin aplicar en producción | 2 | 0 |
| Tiempo de respuesta de pases, eventos y sincronización (S3-HU11) | Sin línea base | -30 % frente a la línea base (meta propuesta) |

---

## 11. Plan a futuro

Qué queda **fuera de los Sprints 1 a 3** y conviene hacer después. Todo lo de este documento es una **propuesta del equipo**: nada está comprometido ni estimado con el PO. Lo que corrige lo ya construido está en la sección 10 de este reporte.

Fecha: 24/11/2026. Se parte de las reglas del Sprint 3: QR estático, sesión offline de 7 días, sin cola de acciones, sin chat en caché, Safari/iOS fuera de alcance y notificaciones push a cargo de otro equipo.

### 11.1 Mapa de ideas

| ID | Idea | Valor para el usuario | Depende de | Prior. propuesta |
|---|---|---|---|---|
| F-01 | Soporte Safari/iOS | Egresados con iPhone también usan la PWA | Decisión del PO | Alta |
| F-02 | Integración con notificaciones push | Aviso de eventos y mensajes con la app cerrada | Equipo de notificaciones; `sw-extensions.js` | Alta |
| F-03 | Cola de acciones sin conexión (*background sync*) | Inscribirse o guardar un QR sin red y que se envíe al volver | Cambio de regla «sin cola» | Media |
| F-04 | QR rotativo | Más seguridad en el acceso a eventos | Equipo de pases (S3-HU02 asume QR estático) | Media |
| F-05 | Cifrar los datos locales | Protege QR y pases si roban el dispositivo | S3-HU07 | Media |
| F-06 | Contratos de interfaz con otros equipos | Que S3-HU13 y S3-HU18 no dependan de código interno ajeno | Pases, Eventos, Chat | Alta |
| F-07 | Pruebas E2E automáticas en CI (Modo Avión) | Detectar regresiones sin probar a mano | S3-HU08 | Alta |
| F-08 | Lighthouse y presupuesto de rendimiento en CI | Evitar que la PWA empeore | S3-HU08 CA-03 | Media |
| F-09 | Telemetría de uso offline | Saber cuántos usan Modo Avión y qué falla | Política de privacidad | Baja |
| F-10 | Chat parcialmente disponible sin conexión | Leer lo último sin red | Cambio de regla «sin chat en caché» | Baja |
| F-11 | Estrategia de vida de la caché | Caducidad y tope de espacio por perfil de dispositivo | S3-HU01, S3-HU06 | Media |
| F-12 | Accesibilidad (WCAG AA) con auditoría | Uso con lector de pantalla y teclado | S3-HU15 | Media |
| F-13 | Épica 5: seguimiento de E5-HU14 | Auditoría de cambios de estado de vacantes y cierre automático por fecha | E5-HU14 | Media |
| F-14 | Épica 5: demo reproducible | Reiniciar el ambiente de demo con un comando | E5-HU19 | Media |

---

### 11.2 Propuestas con más detalle

#### F-01 · Safari/iOS
- Hoy fuera de alcance. Safari limita el almacenamiento de PWA y no permite algunas APIs.
- Pasos: matriz de compatibilidad con iOS (extiende M-07), revisar *Add to Home Screen*, límites de IndexedDB y de caché, y decidir qué funciones se degradan.
- Hecho cuando: S3-HU08 pasa en un iPhone real o la limitación queda documentada.

#### F-02 · Notificaciones push
- La épica ya deja el gancho `public/sw-extensions.js` (S3-HU01 CA-06) y la carpeta `features/notifications/` existe; en `src/app` hay pruebas del clic en notificación.
- Pasos: acordar el contrato (permisos, tema, carga útil) con el equipo dueño; mantener los avisos del Sprint 3 como avisos en página, sin mezclarlos con push.
- Riesgo: que el módulo push modifique el núcleo del SW. Se previene con una prueba que falle si cambia `sw.js` sin pasar por el gancho.

#### F-03 · Cola de acciones sin conexión
- Hoy las acciones que necesitan servidor se **deshabilitan** (S3-HU04 CA-04). Una cola permitiría encolarlas.
- Requisitos: idempotencia en el servidor (la misma lógica de «mismo identificador de envío» que usa el chat en S2-HU04 CA-06), manejo de conflictos y mensajes claros de resultado.
- Empezar por una sola acción de bajo riesgo (guardar un QR) y medir antes de ampliar.

#### F-04 · QR rotativo
- S3-HU02 asume QR estático; con QR rotativo no se puede mostrar sin conexión igual que el original.
- Alternativa: QR firmado con ventana de validez larga o un código de respaldo. Decide el equipo de pases y el PO.

#### F-05 · Cifrado local
- WebCrypto con una clave derivada de la sesión; se borra al cerrar sesión (S3-HU07 CA-02).
- Pros: protege si otra persona abre el navegador. Contras: más complejidad y riesgo de perder datos si falla la clave. Evaluar primero con un modelo de amenazas breve.

#### F-06 · Contratos de interfaz con otros equipos
- S3-HU13 (CA-01 a CA-05) y S3-HU18 (CA-04) piden obtener datos de otros módulos mediante una interfaz o adaptador.
- Entregable: un documento por equipo (Pases, Eventos, Chat) con la forma de los datos, el tiempo límite (propuesta: 8 s) y qué pasa si falla.

#### F-07 · E2E en CI
- Automatizar el flujo de S3-HU08 (iniciar sesión → guardar QR → Modo Avión → recargar → ver QR) con Playwright en Chromium, y añadir Firefox. Android queda manual.
- Hecho cuando: el flujo corre en cada PR sin tocar la BD real (`APP_ENV=test`).

#### F-08 · Lighthouse en CI
- Fijar un umbral de la categoría PWA y de rendimiento; fallar el PR si baja. Reutilizar el informe de S3-HU08 CA-03 como línea base.

#### F-11 · Vida de la caché
- Definir caducidad por tipo (estáticos, rutas, eventos), tope de espacio por perfil (escritorio/móvil, ya existen en el SW) y qué se descarta primero cuando falta espacio. Mostrar el uso en `/portal/configuracion` (ya existe el espacio usado).

#### F-13 y F-14 · Seguimiento de Épica 5
- **F-13:** tabla de auditoría de cambios de estado de vacante (quién, cuándo, de qué a qué) y un proceso que cierre vacantes vencidas por `fecha_cierre`, apoyado en la regla de disponibilidad de E5-HU14.
- **F-14:** un comando único que reinicie el ambiente de demo (migraciones + seed + verificación), con un *smoke test* de post-despliegue que compruebe el checklist de E5-HU19 y falle si `/job-postings` no responde 200.

---

### 11.3 Propuesta de hoja de ruta

Sin fechas porque dependen del PO y de otros equipos; se ordena por olas.

| Ola | Tema | Contenido |
|---|---|---|
| A · Cierre de la épica | Terminar lo comprometido | S3-HU08 y mejoras S3-HU09 a S3-HU18; E5-HU14 y E5-HU19; ola 1 y 2 de la sección 10 |
| B · Confianza | Automatizar y medir | F-07, F-08, F-06 y la ola 3 de la sección 10 |
| C · Alcance | Llegar a más usuarios y casos | F-01 (Safari/iOS), F-02 (push), F-12 (accesibilidad), F-11 |
| D · Capacidades nuevas | Cambiar reglas del sprint | F-03 (cola), F-04 (QR rotativo), F-05 (cifrado), F-10 (chat offline) |
| Continuo | Observación | F-09 (telemetría), F-13, F-14 |

### 11.4 Decisiones que necesitamos del PO

1. ¿El QR del pase es estático o rotativo? (define F-04 y la validez de S3-HU02)
2. ¿Cuántos días puede usarse la sesión sin conexión? (propuesta: 7)
3. ¿Se validan Safari/iOS más adelante? (F-01)
4. ¿Se permite encolar acciones sin conexión? (F-03)
6. ¿Meta de mejora de tiempos en S3-HU11 (propuesta: 30 %) y tiempo límite de consulta en S3-HU13/18 (propuesta: 8 s)?
7. ¿Quién es el dueño del chat? (ver sección 10, M-11)
8. Para Épica 5: ¿403 o 404 al tocar una vacante ajena, y los nombres definitivos de los estados? (E5-HU14)

### 11.5 Riesgos a vigilar

| Riesgo | Efecto | Mitigación |
|---|---|---|
| Otros equipos cambian sus APIs | Se rompe lo guardado sin conexión | F-06 y pruebas de contrato |
| Cambios de reglas (cola, cifrado) sin validar con el PO | Retrabajo | Decisiones de la sección 4 antes de empezar |
| El SW crece con módulos de otros | Cachés inconsistentes | Gancho `sw-extensions.js` y prueba que protege el núcleo |
| Falta de dispositivos reales (iPhone, Android) | Fallas que no se ven en escritorio | Calendario de pruebas en dispositivos y matriz M-07 |



