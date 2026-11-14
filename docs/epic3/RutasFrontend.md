# Rutas Frontend - Épica 3 (Radar de Afinidad y NLP)

Informe de análisis estático del frontend de la Épica 3.

## 1. Resumen ejecutivo

| Indicador | Resultado |
|---|---|
| Rutas propias de la Épica 3 | 4: `/afinidad`, `/afinidad/egresado`, `/afinidad/reclutador` y `/radar-preview` |
| Redirecciones alias | 2: `/postulantes` y `/empresa/postulantes` hacia `/afinidad/reclutador` |
| Ruta con integración real al motor de radar | `/afinidad/egresado` |
| Rutas con datos mock | `/afinidad/reclutador` y `/radar-preview` |
| Endpoints de radar consumidos | `GET /api/v1/radar`, `POST /api/v1/radar/recalculate` y `GET /api/v1/radar/certifications/:area` |
| Endpoint de respaldo consumido | `GET /api/v1/perfil/certificaciones/:id/respaldo/enlace` y el archivo firmado público |
| Endpoint backend sin consumo frontend | `POST /api/v1/nlp/extract` |
| Endpoint frontend sin backend | `POST /affinity/config`, declarado pero no usado y no existente en la API |
| Estado local actual | `NEXT_PUBLIC_USE_AFFINITY_MOCK=true` en `apps/web/.env.local` |

La única pantalla que ejercita el cálculo real de afinidad es `/afinidad/egresado`. La vista de reclutador corresponde funcionalmente a la Épica 4 y usa un arreglo estático. `/radar-preview` es una demostración pública con datos de ejemplo. El flujo de recálculo usa 500 ms de debounce y 7000 ms de timeout; no usa los 2000 ms citados en ejemplos de diseño.

Hallazgos principales:

- El frontend declara `POST /affinity/config`, pero la API no expone ese controlador y el proxy no incluye el módulo `affinity`. La función `saveAffinityConfig` no se invoca desde la interfaz.
- El middleware permite que el rol `administrador` abra `/afinidad` y `/afinidad/egresado`, pero la API exige `radar:self:read` o `radar:self:write` y un `graduateId`. El administrador no tiene esos permisos ni scope, por lo que la vista termina en error.
- El modo mock de afinidad no cubre certificaciones: `getAreaCertifications` siempre llama al backend, incluso con `NEXT_PUBLIC_USE_AFFINITY_MOCK=true`.
- El README del módulo Radar describe áreas obsoletas (`cybersecurity` y `mobile-development`); el código y el contrato compartido usan `cybersecurity-networks` e `it-management`.
- Hay componentes y un hook sin montaje en rutas: `AffinityCalculator`, `AffinitySummaryCard`, `AffinitySiteHeader`, `AffinitySiteFooter` y `useAffinityCalculation`.

## 2. Alcance, método y fuentes

Alcance verificado:

- Rutas, layouts, páginas y redirecciones bajo `apps/web/src/app`.
- Middleware de sesión y control de acceso por rol.
- Proxy same-origin `apps/web/src/app/api/v1/[...path]/route.ts`.
- Servicios, hooks y componentes usados por las rutas de afinidad.
- Contratos HTTP publicados por los controladores de Radar, NLP y Perfil.
- Pruebas automatizadas existentes relacionadas con afinidad, radar, reclutador y respaldos.
- Convenciones descritas en `README.md`, secciones de estructura frontend y tipos compartidos.

Clasificación usada:

| Estado | Criterio |
|---|---|
| IMPLEMENTADO | La ruta existe, está montada y consume contratos reales cuando el mock está apagado. |
| IMPLEMENTADO CON MOCK | La ruta existe y es navegable, pero sus datos no provienen del backend. |
| PARCIAL | La ruta existe, pero falta una parte del flujo o la integración no está completa. |
| NO IMPLEMENTADO | El artefacto no existe o no está conectado. |



## 3. Arquitectura de rutas

Mapa de los artefactos relevantes:

```text
apps/web/src/app
├── layout.tsx
├── radar-preview
│   └── page.tsx
├── api
│   └── v1
│       └── [...path]
│           └── route.ts
└── (dashboard)
    ├── layout.tsx
    ├── afinidad
    │   ├── page.tsx
    │   ├── egresado
    │   │   └── page.tsx
    │   └── reclutador
    │       └── page.tsx
    ├── postulantes
    │   └── page.tsx
    └── empresa
        └── postulantes
            └── page.tsx
```

## 4. Inventario de rutas

| Ruta | Archivo | Tipo | Componente o efecto | Acceso frontend | Estado |
|---|---|---|---|---|---|
| `/afinidad` | `apps/web/src/app/(dashboard)/afinidad/page.tsx` | Server Component | `redirect('/afinidad/egresado')` | Titulado y administrador | IMPLEMENTADO |
| `/afinidad/egresado` | `apps/web/src/app/(dashboard)/afinidad/egresado/page.tsx` | Client Component | `GraduateAffinityView` | Titulado y administrador | IMPLEMENTADO |
| `/afinidad/reclutador` | `apps/web/src/app/(dashboard)/afinidad/reclutador/page.tsx` | Client Component | `RecruiterCandidatesView` | Empresa y administrador | IMPLEMENTADO CON MOCK |
| `/radar-preview` | `apps/web/src/app/radar-preview/page.tsx` | Server Component | `AffinityRadar` con JSON de ejemplo | Público | IMPLEMENTADO CON MOCK |
| `/postulantes` | `apps/web/src/app/(dashboard)/postulantes/page.tsx` | Server Component | `redirect('/afinidad/reclutador')` | Empresa y administrador | IMPLEMENTADO |
| `/empresa/postulantes` | `apps/web/src/app/(dashboard)/empresa/postulantes/page.tsx` | Server Component | `redirect('/afinidad/reclutador')` | Empresa y administrador | IMPLEMENTADO |
| `/api/v1/[...path]` | `apps/web/src/app/api/v1/[...path]/route.ts` | Route Handler | Proxy hacia la API interna | Según el endpoint de destino | IMPLEMENTADO |

Rutas que no existen como páginas independientes:

- "Perfil Calculado" y "Personalizar" son pestañas de `AffinityTabs` dentro de `/afinidad/egresado`.
- "Áreas" y "Palabras clave" son paneles de `RadarInspection` y `InfluentialKeywords`, no rutas.
- No hay una página de detalle por área. La selección de área se resuelve con estado local y el parámetro no se refleja en la URL.
- No hay una página de comparación de candidatos. La comparación de la Épica 4 vive en `/afinidad/reclutador` y usa un carrusel local.

Rutas enlazadas que no pertenecen a la Épica 3:

| Ruta | Archivo | Función |
|---|---|---|
| `/profile` | `apps/web/src/app/(dashboard)/profile/page.tsx` | Enlace "Volver a mi perfil" desde la vista de afinidad. |
| `/companies` | Módulo de empresas | Enlace "Volver a mi perfil" desde `NlpSearch`. |
| `/login` | `apps/web/src/app/(public)/login/page.tsx` | Destino del middleware cuando falta la sesión. |
| `/epica-2/certificaciones/nueva?returnTo=/afinidad` | `apps/web/src/app/(dashboard)/epica-2/certificaciones/nueva/page.tsx` | Redirige a `/profile/completar` conservando `returnTo`. |
| `/profile/completar?seccion=certificaciones&returnTo=/afinidad` | Módulo de perfil | Formulario de certificaciones de la Épica 2. |

El parámetro `returnTo` se valida con `rutaDeRegreso` en `apps/web/src/modules/profile/utils/return-to.ts`. Solo acepta rutas internas que empiecen con `/` y rechaza `//` y `/\`, lo que evita redirecciones abiertas.

## 5. Fichas por ruta

### 5.1 `/afinidad`

- Archivo: `apps/web/src/app/(dashboard)/afinidad/page.tsx`.
- Tipo: Server Component sin estado.
- Comportamiento: ejecuta `redirect('/afinidad/egresado')`.
- Datos: ninguno.
- Prueba: `apps/web/src/app/(dashboard)/afinidad/page.test.tsx` verifica la redirección exacta.
- Observación: es la URL canónica expuesta en la navbar y en la tarjeta de perfil. No conserva parámetros de consulta.

### 5.2 `/afinidad/egresado`

- Archivo: `apps/web/src/app/(dashboard)/afinidad/egresado/page.tsx`.
- Tipo: Client Component que renderiza `GraduateAffinityView`.
- Contenedor: `main` con ancho máximo y padding. El header lo aporta `(dashboard)/layout.tsx`.
- Datos: `getAffinityVector`, `recalculateAffinity`, `getAreaCertifications` y `obtenerEnlaceRespaldo`.
- Estado: IMPLEMENTADO. En el entorno local opera con mock; con `NEXT_PUBLIC_USE_AFFINITY_MOCK=false` usa los endpoints reales.
- Funciones principales:
  - Carga inicial del vector y skeleton mientras no hay respuesta.
  - Estado vacío cuando las seis áreas están en cero.
  - Estado de error sobre el radar, con reintento.
  - Pestaña "Perfil Calculado" y pestaña "Personalizar".
  - Selección de área en el radar y panel de inspección.
  - Panel de certificaciones relacionadas y visor de respaldos.
  - Botón "Recalcular", diálogo de cambios pendientes y aviso de éxito.
  - Controles de simulación si `NEXT_PUBLIC_ENABLE_SIMULATION_CONTROLS=true`.
- Parámetros de ruta: ninguno.
- Observación: el título visible es "Tu afinidad profesional". La vista no recibe `graduateId` por URL; el backend lo obtiene del token.

### 5.3 `/afinidad/reclutador`

- Archivo: `apps/web/src/app/(dashboard)/afinidad/reclutador/page.tsx`.
- Tipo: Client Component que renderiza `RecruiterCandidatesView`.
- Comentario del archivo: "Modo Buscador / Reclutador (Épica 4)".
- Datos: `apps/web/src/shared/mocks/candidates-mock.json`. No hay llamada al backend.
- Búsqueda: `NlpSearch` reordena el mock con `rankCandidatesByQuery`; no envía texto a `/api/v1/nlp/extract`.
- Estado: IMPLEMENTADO CON MOCK. La funcionalidad de afinidad real de candidatos no está conectada.
- Observación: la ruta está bajo `/afinidad`, pero su alcance funcional pertenece a la Épica 4. El `TODO` de `recruiter-candidates-view.tsx` confirma que falta reemplazar el mock.

### 5.4 `/radar-preview`

- Archivo: `apps/web/src/app/radar-preview/page.tsx`.
- Tipo: Server Component.
- Datos: importa `apps/web/src/shared/mocks/affinity-vector-mock.json` en tiempo de módulo.
- Comportamiento: muestra `AffinityRadar` con las seis áreas del mock y un aviso de que los datos son de ejemplo.
- Acceso: público. No está en el `matcher` del middleware y no usa el layout del dashboard.
- Estado: IMPLEMENTADO CON MOCK.
- Observación: es una pantalla de demostración. Si se publica en producción, debe quedar claro que no representa el perfil del visitante.

### 5.5 Redirecciones alias

- `apps/web/src/app/(dashboard)/postulantes/page.tsx` redirige a `/afinidad/reclutador`.
- `apps/web/src/app/(dashboard)/empresa/postulantes/page.tsx` redirige a `/afinidad/reclutador`.
- Ambas rutas están protegidas por `decideAccess` para empresa y administrador.
- No conservan parámetros ni estado.

### 5.6 Proxy `/api/v1/[...path]`

- Archivo: `apps/web/src/app/api/v1/[...path]/route.ts`.
- Métodos exportados: `GET`, `POST`, `DELETE`, `PUT` y `PATCH`.
- Módulos permitidos: `auth`, `user`, `companies`, `job-postings`, `registrations`, `applications`, `email-verification`, `documents`, `perfil`, `events`, `mentorship`, `reports`, `surveys`, `nlp`, `radar` y `chat`.
- Rechaza con 404 si el primer segmento no está en la lista.
- Rechaza con 403 las solicitudes no `GET` o `HEAD` cuyo `Origin` no coincide con el origen actual o cuyo `Sec-Fetch-Site` es `cross-site`.
- Reenvía `authorization`, `cookie`, `content-type`, `x-csrf-token`, `x-correction-token`, `user-agent` y `origin`.
- Base de destino: `API_INTERNAL_URL`, luego `NEXT_PUBLIC_API_URL`, luego `http://localhost:3000`.
- Timeout del proxy: 15000 ms. Devuelve 503 con `BACKEND_UNAVAILABLE` si no conecta.
- Conserva `Content-Type`, `Content-Disposition`, `Set-Cookie` y `Retry-After` de la respuesta.
- No incluye el módulo `affinity`, por lo que una llamada a `/api/v1/affinity/config` respondería 404 aunque el backend la implementara después.

## 6. Componentes y responsabilidades

| Componente o hook | Archivo | Usado por | Responsabilidad | Estado |
|---|---|---|---|---|
| `GraduateAffinityView` | `apps/web/src/shared/components/graduate-affinity-view.tsx` | `/afinidad/egresado` | Orquesta carga, recálculo, pestañas, radar, inspección y respaldos. | Montado |
| `AffinityTabs` | `apps/web/src/shared/components/affinity-tabs.tsx` | Vista de egresado | Alterna "Perfil Calculado" y "Personalizar". | Montado |
| `AffinitySkeleton` | `apps/web/src/shared/components/affinity-skeleton.tsx` | Vista de egresado | Placeholder de carga inicial. | Montado |
| `AffinityRadar` | `apps/web/src/shared/components/affinity-radar.tsx` | Egresado, preview y tarjeta de candidato | Gráfico de radar; variantes completa y mini. | Montado |
| `RadarInspection` | `apps/web/src/shared/components/radar-inspection.tsx` | Vista de egresado | Lista de áreas, porcentajes, variación, palabras clave y panel de certificaciones. | Montado |
| `RadarCertificationsPanel` | `apps/web/src/shared/components/radar-certifications-panel.tsx` | `RadarInspection` | Consulta certificaciones del área seleccionada. | Montado |
| `RadarBackupViewerModal` | `apps/web/src/shared/components/radar-backup-viewer-modal.tsx` | Panel de certificaciones | Pide un enlace firmado y permite abrir o descargar el respaldo. | Montado bajo demanda |
| `RecalculateButton` | `apps/web/src/shared/components/recalculate-button.tsx` | Vista de egresado | Dispara el recálculo; se deshabilita sin cambios pendientes o durante la carga. | Montado |
| `PendingChangesDialog` | `apps/web/src/shared/components/pending-changes-dialog.tsx` | Vista de egresado | Avisa cambios pendientes y ofrece recalcular o posponer. | Montado |
| `RadarErrorState` | `apps/web/src/shared/components/radar-error-state.tsx` | Vista de egresado | Mensaje de error y reintento sobre el radar. | Montado |
| `SuccessToast` | `apps/web/src/shared/components/success-toast.tsx` | Vista de egresado | Confirmación "Radar actualizado" durante 3000 ms. | Montado |
| `AffinityCustomizer` | `apps/web/src/shared/components/affinity-customizer.tsx` | Pestaña Personalizar | Muestra ponderaciones del sistema en modo solo lectura. | Montado |
| `VariationIndicator` | `apps/web/src/shared/components/variation-indicator.tsx` | Radar, inspección y ranking | Muestra el delta entre cálculo actual y anterior. | Montado |
| `InfluentialKeywords` | `apps/web/src/shared/components/affinity-influential-keywords.tsx` | `RadarInspection` | Presenta palabras clave influyentes. | Montado |
| `RecruiterCandidatesView` | `apps/web/src/shared/components/recruiter-candidates-view.tsx` | `/afinidad/reclutador` | Carrusel, búsqueda, tarjetas y desglose de evidencia con mock. | Montado |
| `NlpSearch` | `apps/web/src/shared/components/nlp-search.tsx` | Vista de reclutador | Reordena candidatos del mock; no llama a NLP. | Montado |
| `CandidateCard` | `apps/web/src/shared/components/candidate-card.tsx` | Vista de reclutador | Tarjeta con radar mini, match y respaldos simulados. | Montado |
| `EvidenceBreakdown` | `apps/web/src/shared/components/evidence-breakdown.tsx` | Vista de reclutador | Pestañas y evidencia de ejemplo. | Montado |
| `CandidatesEmptyState` | `apps/web/src/shared/components/candidates-empty-state.tsx` | Vista de reclutador | Estado sin candidatos. | Montado |
| `AffinityLinkCard` | `apps/web/src/modules/profile/ver/affinity-link-card.tsx` | Resumen del perfil | Enlace "Ver mi afinidad" a `/afinidad`; no consulta radar. | Montado |
| `AffinityCalculator` | `apps/web/src/shared/components/affinity-calculator.tsx` | Ninguna ruta | Botón de cálculo con `useAffinityCalculation`. | Sin montaje |
| `AffinitySummaryCard` | `apps/web/src/shared/components/affinity-summary-card.tsx` | Ninguna ruta | Resumen alternativo de áreas y palabras clave. | Sin montaje |
| `AffinitySiteHeader` | `apps/web/src/shared/components/affinity-site-header.tsx` | Ninguna ruta | Header alternativo de demostración. | Sin montaje |
| `AffinitySiteFooter` | `apps/web/src/shared/components/affinity-site-footer.tsx` | Ninguna ruta | Footer alternativo de demostración. | Sin montaje |
| `useAffinityCalculation` | `apps/web/src/shared/hooks/use-affinity-calculation.ts` | Solo `AffinityCalculator` | Estado de cálculo, error, reintento y descarte de respuestas tardías. | Sin montaje efectivo |

Observaciones de arquitectura de componentes:

- La mayoría de componentes de Épica 3 vive en `shared/components`, conforme a la convención del `README.md`.
- `AffinityLinkCard` vive en `modules/profile/ver` porque pertenece al resumen del perfil, no al radar. Es una dependencia correcta de la Épica 3 hacia Perfil.
- `RadarBackupViewerModal` está en `shared/components` pero importa `obtenerEnlaceRespaldo` y `enlaceDeDescarga` desde `modules/profile/services/perfil-api`. Esto crea una dependencia de la capa compartida hacia un módulo de funcionalidad.
- `graduate-affinity-view.tsx` importa `RadarCertificationsPanel` al inicio del archivo y también lo usa como `ReactNode` dentro de `RadarInspection`. La dependencia es explícita y no genera un ciclo.
- `AffinityCustomizer` se rotula como "Personalizar", pero no permite editar ni guardar. Las ponderaciones son informativas y provienen del sistema.

## 7. Contratos HTTP y endpoints

La Épica 3 consume respuestas con sobre `{ data: ... }`. `apiFetch` devuelve directamente `body.data`; los servicios de afinidad adaptan las áreas al orden y a los identificadores de `AFFINITY_AREAS`.

| Consumidor | Método y ruta | Controlador backend | Permiso | Respuesta usada |
|---|---|---|---|---|
| `getAffinityVector` | `GET /api/v1/radar` | `GetRadarController` | `radar:self:read` y scope de titulado | Vector con seis áreas, palabras clave, `hasPendingChanges` y `previousAffinity` |
| `recalculateAffinity` | `POST /api/v1/radar/recalculate` | `RecalculateRadarController` | `radar:self:write` y scope de titulado | Vector recalculado; incluye `recalculated` |
| `getAreaCertifications` | `GET /api/v1/radar/certifications/:area` | `GetAreaCertificationsController` | `radar:self:read` y scope de titulado | `{ area, source: "current-profile", certifications }` |
| `obtenerEnlaceRespaldo` | `GET /api/v1/perfil/certificaciones/:id/respaldo/enlace` | `CreateBackupLinkController` | `perfil:self:read` | `{ url, expiraEn }` |
| Enlaces del visor | `GET /api/v1/perfil/respaldos/:id/archivo?expira=...&firma=...` | `ReadSignedBackupController` | Público con enlace firmado | Bytes del archivo, `Content-Type` y `Content-Disposition` |
| Sin consumidor frontend | `POST /api/v1/nlp/extract` | `ExtractKeywordsController` | `nlp:extract` | `{ keywords, unmapped }` |
| Sin backend | `POST /affinity/config` | No existe | No aplica | No aplica |

Detalles de contrato:

- `GET /api/v1/radar` no devuelve `recalculated`. `POST /api/v1/radar/recalculate` sí lo devuelve.
- El presentador garantiza las seis áreas en el orden de `AFFINITY_AREAS`, aunque una fila histórica no exista. Las áreas faltantes se completan en cero.
- `previousAffinity` es numérico o `null`. `weighting` es entero de 1 a 5 o `null`. `topKeywords` es siempre un arreglo.
- `GET /api/v1/radar/certifications/:area` valida `:area` con `z.enum(AFFINITY_AREAS)`. Un área inválida responde 400.
- `GET /api/v1/perfil/certificaciones/:id/respaldo/enlace` devuelve una URL relativa a `/api/v1/perfil/respaldos/...` con `expira` y `firma`.
- El archivo firmado se sirve con `Cache-Control: private, no-store`. Sin `descargar=1` usa `Content-Disposition: inline`; con `descargar=1` usa `attachment`.
- `POST /api/v1/nlp/extract` existe y el proxy lo permite, pero `NlpSearch` no lo usa. La búsqueda del reclutador es local y mock.
- `POST /affinity/config` tiene tres problemas: no existe en la API, no está en la lista de módulos del proxy y `saveAffinityConfig` no se invoca. La constante `AFFINITY_CONFIG_ENDPOINT` tampoco empieza con `/api/v1`, por lo que `apiUrl` la resolvería contra `NEXT_PUBLIC_API_URL` y no contra el proxy.

Transporte y autenticación:

- `apiUrl` deja intactas las rutas que empiezan con `/api/v1/` y las envía al mismo origen. El proxy las reenvía a la API interna.
- `apiFetch` agrega `Authorization` si hay token en memoria y usa `authenticatedFetch` para renovar la sesión con `POST /api/v1/auth/refresh` cuando recibe 401.
- `authenticatedFetch` envía cookies same-origin cuando no hay token. En `GET` permite el intento con cookie; en métodos de escritura exige token o CSRF.
- El proxy bloquea escrituras cross-site y reenvía `X-CSRF-Token`; la validación definitiva queda en la API.
- El servicio de radar aplica un timeout de 7000 ms a `GET`, `POST` y certificaciones. El proxy aplica 15000 ms. El límite efectivo para la vista es 7000 ms.

## 8. Estados, recálculo y flujos

Flujo de carga inicial:

1. `GraduateAffinityView` se monta con seis áreas en cero.
2. Mientras no hay vector válido ni error, muestra `AffinitySkeleton`.
3. `getAffinityVector` consulta `GET /api/v1/radar` o el mock.
4. Si la respuesta tiene `hasPendingChanges`, marca cambios pendientes y programa un recálculo con 500 ms de espera.
5. Si el vector es válido y todas las áreas son cero, muestra el estado vacío con el botón "Completar perfil".
6. Si falla la carga, muestra `RadarErrorState` y permite reintentar.

Flujo de recálculo:

1. Un cambio de perfil marca `hasPendingChanges` y abre `PendingChangesDialog`.
2. "Ahora no" solo cierra el diálogo; el estado pendiente se conserva.
3. "Recalcular" o el botón de la tarjeta llaman a `recalculateAffinity`.
4. El botón permanece deshabilitado si no hay cambios pendientes o si ya hay una solicitud en curso.
5. La vista hace `Promise.race` entre la llamada y un timeout de 7000 ms.
6. Si `recalculated` es `false`, conserva la variación y la referencia anterior, limpia el estado pendiente si no cambió la versión y muestra el aviso de éxito.
7. Si `recalculated` es `true`, actualiza las áreas, calcula los identificadores cuyo porcentaje entero cambió y muestra el aviso de éxito.
8. Si falla o vence el timeout, muestra el error, conserva los cambios pendientes y permite reintentar.

Estados de interfaz:

| Estado | Componente | Condición |
|---|---|---|
| Carga inicial | `AffinitySkeleton` | Sin vector válido y sin error |
| Actualización | Indicador "Actualizando tu afinidad..." | `isLoading` con vector válido |
| Vacío | Tarjeta "Completa tu perfil..." | Vector válido con las seis áreas en cero |
| Error | `RadarErrorState` | Error sin vector válido o error durante actualización |
| Éxito | `SuccessToast` | Recálculo exitoso, incluso si `recalculated` es `false` |
| Cambios pendientes | `PendingChangesDialog` | Cambio de perfil con `hasPendingChanges` |
| Certificaciones cargando | Texto "Cargando certificaciones..." | Panel de área seleccionada |
| Certificaciones vacías | Texto "No se encontraron certificaciones..." | Consulta exitosa sin coincidencias |
| Certificaciones con error | Texto y botón "Reintentar" | Fallo de la consulta |
| Respaldo cargando | Texto "Cargando respaldo..." | `RadarBackupViewerModal` abierto |
| Respaldo con error | Texto y botón "Reintentar" | Fallo al obtener el enlace |
| Respaldo listo | Botones "Abrir respaldo" y "Descargar" | Enlace firmado disponible |
| Búsqueda de reclutador | Botón "Buscando..." | Reordenamiento local del mock |

Constantes verificadas:

| Constante | Valor | Archivo |
|---|---|---|
| `DEBOUNCE_MS` | 500 ms | `apps/web/src/shared/hooks/use-debounced-batch.ts` |
| `RECALCULATE_TIMEOUT_MS` | 7000 ms | `apps/web/src/shared/services/affinity-service.ts` |
| `DEFAULT_RECALCULATE_TIMEOUT_MS` | 7000 ms | `apps/web/src/shared/components/graduate-affinity-view.tsx` |
| `TOAST_DURATION_MS` | 3000 ms | `apps/web/src/shared/components/success-toast.tsx` |
| `NLP_MAX_TEXT_LENGTH` | 5000 caracteres | `packages/shared-types/src/nlp.ts` |
| Timeout del proxy | 15000 ms | `apps/web/src/app/api/v1/[...path]/route.ts` |

La constante `DEBOUNCE_MS` vale 500 ms. El ejemplo de diseño que menciona 2000 ms no coincide con el código. `useDebouncedBatch` no se usa como hook en la Épica 3; solo se reutiliza su constante.

Flujo de certificaciones y respaldos:

1. El usuario selecciona un área en `AffinityRadar` o en `RadarInspection`.
2. `RadarCertificationsPanel` consulta `GET /api/v1/radar/certifications/:area`.
3. El efecto se repite si cambia el área, si cambia `calculationKey` o si el usuario reintenta.
4. Cada certificación con `hasBackup` muestra "Ver respaldo".
5. El visor pide un enlace firmado nuevo en cada apertura.
6. El botón "Descargar" agrega `descargar=1` a la URL firmada.
7. El visor cierra con el botón, con `Escape` o con clic en el fondo.

Flujo de reclutador:

1. `RecruiterCandidatesView` carga `candidates-mock.json`.
2. `NlpSearch` mantiene un texto de búsqueda inicial y reordena el mock con `rankCandidatesByQuery`.
3. `CandidateCard` muestra un radar mini y el porcentaje de match.
4. `EvidenceBreakdown` muestra pestañas y evidencia de ejemplo.
5. No hay paginación del servidor, ni filtros del backend, ni llamada a NLP.

## 9. Autenticación, roles y permisos

Middleware:

- Archivo: `apps/web/src/middleware.ts`.
- `matcher` incluye `/afinidad`, `/afinidad/:path*`, `/empresa/postulantes`, `/empresa/postulantes/:path*`, `/postulantes` y `/postulantes/:path*`.
- `/radar-preview` no está en el matcher.
- Sin cookie `umsspira_refresh`, redirige a `/login`.
- Con cookie, consulta `GET /api/v1/auth/session` con timeout de 5000 ms.
- Si la sesión responde 401 o 403, elimina `umsspira_token`, `umsspira_refresh`, `umsspira_csrf` y `umsspira_role`, y redirige al login.
- Si la sesión no responde o falla, devuelve 503 con "No se pudo verificar la sesión. Inténtalo nuevamente."
- Si el rol no es `administrador`, `empresa` o `titulado`, redirige al login.
- Aplica `decideAccess` y agrega `Cache-Control: no-store` a la respuesta.

Matriz de acceso frontend:

| Ruta | Titulado | Empresa | Administrador | Público |
|---|---|---|---|---|
| `/afinidad` | Permitido | Redirige a `/companies` | Permitido | Redirige a `/login` |
| `/afinidad/egresado` | Permitido | Redirige a `/companies` | Permitido | Redirige a `/login` |
| `/afinidad/reclutador` | Redirige a `/portal` | Permitido | Permitido | Redirige a `/login` |
| `/radar-preview` | Permitido | Permitido | Permitido | Permitido |
| `/postulantes` | Redirige a `/portal` | Permitido | Permitido | Redirige a `/login` |
| `/empresa/postulantes` | Redirige a `/portal` | Permitido | Permitido | Redirige a `/login` |

Matriz de permisos backend:

| Endpoint | Titulado | Empresa | Administrador |
|---|---|---|---|
| `GET /api/v1/radar` | `radar:self:read` y scope de titulado | Sin permiso | Sin permiso y sin scope de titulado |
| `POST /api/v1/radar/recalculate` | `radar:self:write` y scope de titulado | Sin permiso | Sin permiso y sin scope de titulado |
| `GET /api/v1/radar/certifications/:area` | `radar:self:read` y scope de titulado | Sin permiso | Sin permiso y sin scope de titulado |
| `POST /api/v1/nlp/extract` | `nlp:extract` | Sin permiso | `nlp:extract` |
| `GET /api/v1/perfil/certificaciones/:id/respaldo/enlace` | `perfil:self:read` | Sin permiso | Sin permiso |
| `GET /api/v1/perfil/respaldos/:id/archivo` | Enlace firmado | Enlace firmado | Enlace firmado |

Hallazgo de autorización:

`decideAccess` permite al administrador entrar a `/afinidad` y `/afinidad/egresado`, pero `ROLE_PERMISSIONS.administrador` no incluye `radar:self:read` ni `radar:self:write`, y `requireGraduateScope` exige `actor.scopes.graduateId`. La vista cargaría el layout y luego mostraría `RadarErrorState` por 401 o 403. La decisión de producto debe ser una de estas:

- Retirar al administrador de las rutas de afinidad del titulado.
- Darle un modo de lectura administrativo con un `graduateId` explícito y auditoría.
- Mantener la restricción y mostrar un mensaje específico de "no disponible para administración" en lugar del error genérico del radar.

Aspectos de seguridad verificados:

- El `graduateId` del radar sale del token, no de un parámetro de URL.
- El listado de certificaciones filtra por el titulado autenticado.
- El archivo de respaldo usa enlace firmado con expiración y no entrega bytes sin firma.
- `returnTo` rechaza URLs externas y variantes con `//`.
- El proxy bloquea escrituras cross-site y no reenvía cabeceras arbitrarias.
- `Cache-Control: no-store` se aplica a la verificación de sesión y al proxy.

## 10. Mocks, configuración y entorno

Variables de entorno:

| Variable | Valor en `.env.example` | Efecto |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3000` | Base de la API para las rutas que no empiezan con `/api/v1/`. |
| `NEXT_PUBLIC_USE_AFFINITY_MOCK` | `false` | Activa los mocks de afinidad. En producción debe ser `false`. |
| `NEXT_PUBLIC_ENABLE_SIMULATION_CONTROLS` | `false` | Muestra "Simular Actualización" y "Simular Timeout". |
| `API_INTERNAL_URL` | No definida | Base interna usada por el middleware y el proxy. Si falta, usa `NEXT_PUBLIC_API_URL`. |
| `NEXT_PUBLIC_DEMO_MODE` | No definida | Afecta el envío de tokens en `apiFetch`; no es exclusiva de la Épica 3. |

Mocks disponibles:

| Archivo | Contenido | Consumidor |
|---|---|---|
| `apps/web/src/shared/mocks/affinity-vector-mock.json` | Vector de seis áreas | `getAffinityVector`, `calculateAffinityVector` y `radar-preview` |
| `apps/web/src/shared/mocks/affinity-snapshots-mock.json` | Tres snapshots rotativos | `recalculateAffinity` en modo mock |
| `apps/web/src/shared/mocks/affinity-config-mock.json` | Ponderaciones por área | `getAffinityConfig` en modo mock |
| `apps/web/src/shared/mocks/candidates-mock.json` | Candidatos, áreas y evidencia | `RecruiterCandidatesView` y `NlpSearch` |

Comportamiento con mock activo:

- `getAffinityVector` devuelve el vector de ejemplo sin espera.
- `calculateAffinityVector` espera 1000 ms y devuelve el vector con `calculatedAt` actual.
- `recalculateAffinity` espera 1000 ms, rota entre tres snapshots y actualiza `calculatedAt`.
- `getAffinityConfig` usa el mock de configuración y ordena los ejes según `AFFINITY_AREAS`.
- `getAreaCertifications` no consulta el flag de mock. Siempre llama a `GET /api/v1/radar/certifications/:area`. En un entorno sin backend, el panel de certificaciones muestra error aunque el resto de la vista use mock.
- `RadarBackupViewerModal` siempre usa el endpoint real de Perfil.
- La búsqueda del reclutador usa el mock sin espera artificial y sin llamada de red.

Comportamiento con mock apagado:

- `getAffinityVector` llama a `GET /api/v1/radar` y adapta las áreas.
- `recalculateAffinity` llama a `POST /api/v1/radar/recalculate`.
- `getAffinityConfig` no llama a `/affinity/config`. Construye los ejes a partir de `weighting` del vector.
- `saveAffinityConfig` llamaría a `POST /affinity/config`, pero no se usa.
- `getAreaCertifications` llama al endpoint real.
- Los errores 401 se convierten en "Tu sesion expiro. Inicia sesion nuevamente" en `apiFetch`; los demás estados se convierten en `ApiError` con el mensaje de la API. La vista de afinidad, de todos modos, muestra su mensaje genérico "No se pudo actualizar tu radar".

## 11. Pruebas y verificación

Pruebas existentes relacionadas:

| Archivo | Cobertura |
|---|---|
| `apps/web/src/app/(dashboard)/afinidad/page.test.tsx` | Redirección de `/afinidad` a `/afinidad/egresado`. |
| `apps/web/src/shared/components/graduate-affinity-view.test.tsx` | Carga, error, reintento, recálculo, cambios pendientes, vacío, variación y simulación. |
| `apps/web/src/shared/services/affinity-service.test.ts` | Mock, endpoints reales, timeout de 7000 ms, rotación de snapshots y errores HTTP. |
| `apps/web/src/shared/services/affinity-service-qa.test.ts` | Casos de QA del contrato de afinidad. |
| `apps/web/src/shared/components/radar-certifications-panel.test.tsx` | Carga, error, vacío, reintento y selección de certificaciones. |
| `apps/web/src/shared/components/radar-backup-viewer-modal.test.tsx` | Enlace firmado, apertura, descarga, error y cierre. |
| `apps/web/src/shared/components/radar-inspection.test.tsx` | Lista de áreas, selección, palabras clave y certificaciones. |
| `apps/web/src/shared/components/affinity-radar.test.tsx` | Render del radar, variantes y datos. |
| `apps/web/src/shared/components/variation-indicator.test.tsx` | Cálculo y formato de variación. |
| `apps/web/src/shared/components/recalculate-button.test.tsx` | Habilitación y deshabilitación del botón. |
| `apps/web/src/shared/components/pending-changes-dialog.test.tsx` | Apertura, foco, Escape y acciones. |
| `apps/web/src/shared/components/radar-error-state.test.tsx` | Mensaje y reintento. |
| `apps/web/src/shared/components/success-toast.test.tsx` | Aviso y cierre automático. |
| `apps/web/src/shared/components/affinity-skeleton.test.tsx` | Placeholder de carga. |
| `apps/web/src/shared/components/affinity-customizer.test.tsx` | Ponderaciones en solo lectura. |
| `apps/web/src/shared/components/affinity-influential-keywords.test.tsx` | Palabras clave. |
| `apps/web/src/shared/components/candidate-card.test.tsx` | Tarjeta de candidato y radar mini. |
| `apps/web/src/shared/components/evidence-breakdown.test.tsx` | Pestañas y evidencia. |
| `apps/web/src/shared/components/nlp-search.test.tsx` | Búsqueda local y reordenamiento. |
| `apps/web/src/shared/components/candidates-empty-state.test.tsx` | Estado vacío del reclutador. |
| `apps/web/src/shared/components/radar-real-data.test.tsx` | Integración de datos reales del radar. |
| `apps/web/src/shared/components/t3.6-certificacion-aws-radar.e2e.test.tsx` | Caso AWS y radar. El nombre usa puntos, no kebab-case. |
| `apps/web/src/modules/auth/frontend/services/route-access.test.ts` | Acceso a `/afinidad`, `/afinidad/egresado` y `/afinidad/reclutador`. |
| `apps/web/src/middleware.test.ts` | Sesión, redirecciones, cookies y 503. |
| `apps/web/src/app/api/v1/[...path]/route.test.ts` | Proxy de radar, NLP, archivos y errores. |
| `apps/web/src/modules/profile/ver/affinity-link-card.test.tsx` | Enlace "Ver mi afinidad". |


## 12. Hallazgos, riesgos y recomendaciones

| Severidad | Hallazgo | Evidencia | Recomendación |
|---|---|---|---|
| Alta | `POST /affinity/config` no existe en la API y no está en el proxy. | `affinity-service.ts:19`, `:172-181`; `route.ts:4-8` | Eliminar `saveAffinityConfig` y la constante, o implementar el endpoint y agregar `affinity` a la lista de módulos. |
| Alta | El administrador puede abrir la afinidad del titulado, pero la API lo rechaza. | `route-access.ts:82-92`; `access.policy.ts`; `graduate-scope.ts:8-13` | Decidir el modo administrativo y ajustar middleware, permisos y mensaje de error. |
| Media | El mock de afinidad no cubre certificaciones ni respaldos. | `affinity-service.ts:234-239`; `radar-certifications-panel.tsx:20-27` | Agregar mock de certificaciones o condicionar el panel al modo real. |
| Media | La vista de reclutador es de Épica 4 y no consume backend. | `recruiter-candidates-view.tsx:11`; `nlp-search.tsx:49-54` | Mover la ruta a la Épica 4 y conectar `POST /api/v1/nlp/extract` cuando exista el contrato de candidatos. |
| Media | El README del módulo Radar describe áreas obsoletas. | `apps/api/src/modules/radar/README.md:12-13` | Actualizar el README a `cybersecurity-networks` e `it-management`. |
| Media | `/radar-preview` es público y usa datos de ejemplo. | `radar-preview/page.tsx:1-18`; `middleware.ts:65-72` | Mantenerlo solo en desarrollo o protegerlo con una bandera de entorno. |
| Baja | Componentes y hook sin montaje efectivo. | `affinity-calculator.tsx`, `affinity-summary-card.tsx`, `affinity-site-header.tsx`, `affinity-site-footer.tsx`, `use-affinity-calculation.ts` | Eliminarlos o integrarlos en una ruta concreta. |
| Baja | Identificadores en español en código de la Épica 3. | `graduate-affinity-view.tsx:44,46,52`; `affinity-areas.ts:13,22,29` | Renombrar a inglés: `months`, `year`, `CERTIFICATION_ROUTE`, `LABEL_TO_AREA_ID`, `normalize`, `isOfficialArea`. |
| Baja | Emojis en comentarios de navegación. | `navbar/navigation.ts:62,66` | Eliminarlos si se aplica la regla de "sin emojis" a todo el código. |
| Baja | Nombre de prueba con puntos. | `t3.6-certificacion-aws-radar.e2e.test.tsx` | Renombrar con kebab-case, por ejemplo `t3-6-certificacion-aws-radar.e2e.test.tsx`. |
| Baja | Páginas de afinidad marcadas como Client Component sin necesidad. | `egresado/page.tsx:1`; `reclutador/page.tsx:1` | Convertirlas en Server Components que rendericen el componente cliente. |
| Baja | No hay `loading.tsx`, `error.tsx` ni `not-found.tsx` bajo `afinidad`. | `apps/web/src/app/(dashboard)/afinidad` | Mantener el manejo local o agregar boundaries de ruta si se busca consistencia con otras secciones. |
| Baja | `EvidenceBreakdown` usa `any` y evidencia de ejemplo. | `evidence-breakdown.tsx:9-14` | Tipar `candidateData` y reemplazar la evidencia estática cuando exista el backend de la Épica 4. |

Checklist de convenciones:

| Convención | Resultado | Detalle |
|---|---|---|
| TypeScript obligatorio | Cumple | Todas las rutas y componentes de la Épica 3 usan `.ts` o `.tsx`. |
| Archivos y carpetas en kebab-case | Cumple con una excepción | La prueba `t3.6-certificacion-aws-radar.e2e.test.tsx` usa puntos. |
| Rutas dinámicas en minúsculas y una palabra | Cumple | `[...path]` es el único segmento dinámico del frontend. |
| `index.ts` solo como barril | Cumple | `navbar/index.ts` y `shared-types/index.ts` solo reexportan. |
| Código en inglés | Cumple parcialmente | Hay identificadores en español en la vista y en utilidades de áreas. |
| Textos de UI y comentarios en español | Cumple | La UI y los comentarios están en español. |
| Sin emojis | Cumple en UI, falla en comentarios | La UI de afinidad no tiene emojis; `navigation.ts` sí tiene emojis en comentarios. |
| Componentes compartidos en `shared/components` | Cumple con observación | `AffinityLinkCard` está en `modules/profile/ver` por pertenecer a Perfil. |
| Endpoints existentes y consumidos correctamente | Falla parcialmente | `POST /affinity/config` no existe y no se usa; `POST /api/v1/nlp/extract` existe y no se consume. |
| Pruebas de componentes y servicios | Cumple | Hay cobertura amplia de radar, afinidad, reclutador y respaldos. |

Pendientes de verificación:

- Ejecutar la suite web completa en esta rama y comparar con los fallos preexistentes documentados en QA.
- Probar con `NEXT_PUBLIC_USE_AFFINITY_MOCK=false` y una sesión de titulado real.
- Probar el rol administrador en `/afinidad/egresado` y confirmar el 403.
- Abrir y descargar un respaldo PDF y uno JPG reales.
- Confirmar que `POST /affinity/config` no existe en el entorno desplegado y decidir si se elimina o se implementa.
- Confirmar si `/radar-preview` debe existir en producción.
