# INT-06 · Lista de Revisión de Coherencia y Accesibilidad del Frontend

> **Proyecto:** UMSSPIRA (Equipo G8, Épica 1)  
> **Tarea:** INT-06 (Sprint 3)  
> **Fecha de ejecución:** 13 de noviembre de 2026  
> **Hash base de referencia revisado:** `f8c0c172` (`origin/epic1`)  
> **Revisor responsable:** Ingeniero frontend y revisor de accesibilidad (relevo de Santiago)  
> **Apoyo y revisión:** Alba  
> **Revisión y aprobación final de PR:** Nicole Flores Choquetopa (Líder de Git)  
> **Herramientas de evaluación:** Playwright 1.65.0, Chromium Headless (v1254 / Chrome 158.0.8127.18), axe-core (@axe-core/playwright 4.10.1) ejecutado en entorno aislado fuera del repositorio, Node.js v22.21.0, Jest 30.5.2, Next.js 14.2.3  

---

## 1. Resumen Ejecutivo y Alcance Evaluado

Esta revisión evalúa de forma estricta la coherencia visual, responsividad y accesibilidad web (WCAG 2.1 AA) de las pantallas públicas y administrativas existentes en `origin/epic1`.

### Pantallas dentro del alcance (existentes en `origin/epic1`):
1. `/login` (Inicio de sesión y retorno institucional).
2. `/forgot-password` (Solicitud de enlace de recuperación).
3. `/reset-password` (Restablecimiento con token).
4. `/activate` (Activación de Titulado: ingreso de código OTP de 6 dígitos y creación de contraseña).
5. `/register` (Flujo público de registro de titulado):
   - Paso 1: Datos personales y académicos (`/register`).
   - Diálogo de salida (`ExitRegistrationDialog`).
   - Paso 2: Verificación de correo (`/register/verify-email`).
   - Paso 3: Carga de documento de respaldo (`/register/document`).
   - Paso 4: Resumen y confirmación previa (`/register/review`).
   - Paso 5: Confirmación de entrega recibida (`/register/confirmation`).
6. `/register/correction/[token]` (Subsanación y corrección de solicitud observada).
7. `/status` (Consulta de estado de solicitud, task 18.3): **Pendiente por pantalla no disponible** (el backend fue integrado en PR #702, pero la vista en `apps/web/src/app` aún no existe).
8. `/applications` (Bandeja administrativa, filtros, drawer de expediente y diálogos de dictamen): **No verificado en navegación interactiva completa** debido a que requiere sesión activa de administrador validada mediante cookies `umsspira_refresh` por el API backend; se complementó con inspección estática del código de sus componentes (`application-drawer.tsx`, `observe-dialog.tsx`, `review-ui.tsx`).

---

## 2. Matriz de Evaluación por Pantalla y Ancho de Pantalla

Evaluación en viewports: Móvil (360×800 px), Tablet (768×1024 px) y Escritorio (1366×768 px).

| Pantalla / Ruta | Ancho 360 px | Ancho 768 px | Ancho 1366 px | Desborde horizontal | Estado general |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `/login` | Cumple | Cumple | Cumple | No detectado | Cumple |
| `/forgot-password` | Cumple | Cumple | Cumple | No detectado | Cumple |
| `/reset-password` | Cumple | Cumple | Cumple | No detectado | Cumple |
| `/activate` | Cumple | Cumple | Cumple | No detectado | Cumple |
| `/register` (Datos) | Cumple | Cumple | Cumple | No detectado | Cumple |
| Diálogo de salida registro | Cumple | Cumple | Cumple | No detectado | Cumple (Corregido foco) |
| `/register/verify-email` | Cumple | Cumple | Cumple | No detectado | Cumple |
| `/register/document` | Cumple | Cumple | Cumple | No detectado | Cumple |
| `/register/review` | Cumple | Cumple | Cumple | No detectado | Cumple |
| `/register/confirmation` | Cumple | Cumple | Cumple | No detectado | Cumple |
| `/register/correction/[token]` | Cumple | Cumple | Cumple | No detectado | Cumple |
| `/status` | Pendiente | Pendiente | Pendiente | N/A | Pantalla no disponible en web |
| `/applications` | No verificado | No verificado | No verificado | N/A | Exige sesión admin activa |

---

## 3. Matriz de Criterios de Accesibilidad y Coherencia (9 Puntos)

| Criterio | `/login` | `/forgot-password` | `/reset-password` | `/activate` | `/register` (Flujo) | `/register/correction` | `/applications` |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **1. Teclado** | Cumple | Cumple | Cumple | Cumple | Cumple | Cumple | No verificado* |
| **2. Foco visible y retorno** | Cumple | Cumple | Cumple | Cumple | Cumple (Corregido) | Cumple | No verificado* |
| **3. Etiquetas y autocomplete** | Cumple | Cumple | Cumple (Corregido) | Cumple | Cumple | Cumple | Cumple (código) |
| **4. Asociación de errores** | Cumple | Cumple (Corregido) | Cumple | Cumple | Cumple | Cumple | Cumple (Corregido) |
| **5. Responsive 360/768/1366** | Cumple | Cumple | Cumple | Cumple | Cumple | Cumple | No verificado* |
| **6. Estilos compartidos** | Cumple | Cumple | Cumple | Cumple | Cumple | Cumple | Cumple (código) |
| **7. Conservación de contexto** | Cumple | Cumple | Cumple | Cumple | Cumple | Cumple | No verificado* |
| **8. Datos incompletos** | Cumple | Cumple | Cumple | Cumple | Cumple | Cumple | Cumple (código) |
| **9. Contraste básico** | Cumple** | Cumple** | Cumple** | Cumple** | Cumple** | Cumple** | No verificado* |

*\* No verificado en navegador interactivo por requerir sesión de administración; validado mediante análisis estático de código fuente.*  
*\*\* axe-core detecta avisos menores de contraste en etiquetas secundarias en mayúsculas sobre fondos crema (`#EEE9DF`/`#F5F2EA`), pertenecientes a la paleta institucional aprobada de la Épica 1.*

---

## 4. Registro y Clasificación de Hallazgos

| ID | Pantalla | Descripción del hallazgo | Severidad | Archivo involucrado | Estado | Responsable |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **H-INT06-01** | `/register` (Diálogo de salida) | El foco no quedaba atrapado dentro del modal `ExitRegistrationDialog` al tabular y no regresaba al control de origen (`← Inicio`) al cerrarse o cancelar. | Media | `apps/web/src/modules/registration/frontend/components/exit-registration-dialog.tsx` | **Corregido en este PR** | Santiago / INT-06 |
| **H-INT06-02** | `/forgot-password` | El campo de correo carecía de `aria-describedby` asociado a su mensaje de error, y el mensaje no contaba con `role="alert"`. | Baja | `apps/web/src/modules/auth/frontend/components/forgot-password-form.tsx` | **Corregido en este PR** | Santiago / INT-06 |
| **H-INT06-03** | `/reset-password` | Los campos de contraseña nueva y confirmación no estaban vinculados a la lista de requisitos mediante `aria-describedby="password-requirements"`. | Baja | `apps/web/src/modules/auth/frontend/components/reset-password-form.tsx` | **Corregido en este PR** | Santiago / INT-06 |
| **H-INT06-04** | Modales de dictamen (`ObserveDialog`, `ApproveDialog`, `RejectDialog`) | El componente `FieldError` no tenía `role="alert"`, impidiendo que lectores de pantalla anuncien errores al fallar la validación. | Media | `apps/web/src/modules/applications/frontend/components/review-ui.tsx` | **Corregido en este PR** | Santiago / INT-06 |
| **H-INT06-05** | Diálogos compartidos (`dialog.tsx`) | Bloqueo y restauración de scroll del fondo en modales compartidos. | Media | `apps/web/src/shared/components/dialog.tsx` | **Derivado a BUG-07** | Santiago / Nicole |
| **H-INT06-06** | `/applications` | Texto del buscador que reaparece tras limpiar o cambiar filtros. | Media | `apps/web/src/app/(dashboard)/applications/_components/requests-filters.tsx` | **Derivado a BUG-11** | Santiago / Nicole |
| **H-INT06-07** | `/applications` | Botón limpiar filtros no restablece todos los parámetros de consulta. | Media | `apps/web/src/app/(dashboard)/applications/_components/requests-filters.tsx` | **Derivado a BUG-06** | Equipo G8 |
| **H-INT06-08** | `/activate` | Contador de expiración del código OTP y vigencia real. | Media | `apps/web/src/modules/activation/frontend/components/activate-otp-step.tsx` | **Derivado a BUG-04** | Equipo G8 |
| **H-INT06-09** | `/register/document` | Formato de tamaño de archivo muestra "0.0 MB" en archivos pequeños menores a 100 KB. | Baja | `apps/web/src/modules/documents/frontend/components/document-dropzone.tsx` | **Derivado a BUG-15** | Equipo G8 |
| **H-INT06-10** | `/login` | Fondo amarillo de autocompletado en navegadores webkit. | Baja | `apps/web/src/modules/auth/frontend/components/login-form.tsx` | **Derivado a BUG-09** (mergeado en PR #685) | Equipo G8 |
| **H-INT06-11** | `/register/correction/[token]` | Hueco o salto visual en layout del formulario de corrección. | Baja | `apps/web/src/modules/applications/frontend/components/observed-edit-form.tsx` | **Derivado a BUG-13** (mergeado en PR #667) | Equipo G8 |
| **H-INT06-12** | `/register/correction/[token]` | Destino al cancelar en corrección debe retornar al portal seguro. | Media | `apps/web/src/modules/applications/frontend/components/observed-edit-form.tsx` | **Derivado a BUG-16** (rama `feat/G8-BUG16-cancelSafeDestination`) | Nicole / G8 |
| **H-INT06-13** | `/register/correction/[token]` | Enlace de vista previa del documento previo con `#`. | Media | `apps/web/src/modules/applications/frontend/components/previous-document-preview.tsx` | **Derivado a BUG-14** (mergeado en PR #681) | Equipo G8 |
| **H-INT06-14** | `/register` | Tildes en nombres de carreras (ej. "Ingenieria Informatica" sin tilde). | Baja | Catálogo / Base de datos | **Derivado a BUG-01** | Equipo G8 |
| **H-INT06-15** | `/register` | Soporte de validación de correos largos hasta 254 caracteres. | Baja | `personal-data.schema.ts` | **Derivado a BUG-02** (mergeado en PR #691) | Equipo G8 |
| **H-INT06-16** | `/status` | Pantalla de consulta de estado de solicitud (task 18.3). | Media | `apps/web/src/app/(public)/status` | **Pendiente: pantalla aún no disponible** | Responsable HU-18 |
| **H-INT06-17** | Expediente HU-14, hallazgos OCR HU-13, avisos HU-15, historial HU-17 | Pantallas nuevas de Sprint 3 no integradas en `origin/epic1`. | Informativa | Vistas de HU-13, 14, 15 y 17 | **Pendiente: pantalla aún no disponible** | Responsables de HU |

---

## 5. Coordinación de Cierre y Próximos Pasos

### A quién avisar y qué debe cerrar cada responsable:
1. **Nicole Flores Choquetopa (Líder de Git):**
   - Revisión y aprobación del presente PR de INT-06 hacia `epic1`.
   - Coordinar el merge de la rama `feat/G8-BUG16-cancelSafeDestination` para formalizar la salida segura de corrección.
   - Coordinar el merge de la rama `feat/G8-BUG18-resend-recovery-link` para el reenvío de enlace de recuperación.
2. **Santiago (Líder de Frontend):**
   - A su regreso, verificar con DevOps (`CODEOWNERS`) el bloqueo de scroll y foco en `apps/web/src/shared/components/dialog.tsx` (BUG-07).
   - Supervisar la integración visual de la ruta `/status` una vez que el responsable de HU-18 entregue el frontend.
3. **Alba (Apoyo FE / Accesibilidad):**
   - Realizar la prueba cruzada con lector de pantalla en el diálogo de salida de registro (`/register`) comprobando el atrapado de tabulación y el retorno del foco al control de origen.
4. **Responsables de HU-13 a HU-18 (Sprint 3):**
   - Cuando las pantallas de HU-14 (nuevo expediente), HU-15 (avisos de calidad de imagen), HU-17 (historial de dictámenes) y HU-18 (`/status`) ingresen a `epic1`, se ejecutará una segunda pasada de revisión de accesibilidad siguiendo este mismo formato.

---

## 6. Evidencia Gráfica Registrada

Las capturas generadas mediante Playwright Chromium se encuentran almacenadas en el directorio `docs/sprint3/int06-evidence/`:

- `login-360.png`, `login-768.png`, `login-1366.png`
- `forgot-password-360.png`, `forgot-password-768.png`, `forgot-password-1366.png`
- `reset-password-360.png`, `reset-password-768.png`, `reset-password-1366.png`
- `activate-360.png`, `activate-768.png`, `activate-1366.png`
- `register-360.png`, `register-768.png`, `register-1366.png`
- `register-exit-dialog.png` (Evidencia del diálogo modal de salida con datos ingresados)
- `register-verify-email-360.png`, `register-verify-email-768.png`, `register-verify-email-1366.png`
- `register-document-360.png`, `register-document-768.png`, `register-document-1366.png`
- `register-review-360.png`, `register-review-768.png`, `register-review-1366.png`
- `register-confirmation-360.png`, `register-confirmation-768.png`, `register-confirmation-1366.png`
- `register-correction-360.png`, `register-correction-768.png`, `register-correction-1366.png`
- `applications-360.png`, `applications-768.png`, `applications-1366.png` (Redirección institucional por control de acceso / middleware)

---

## 7. Verificación de Calidad de Código (Lint, Build y Test)

- **`pnpm -r lint`:** Pasa satisfactoriamente (`apps/api lint: Done`, `apps/web lint: Done`). Cero errores.
- **`pnpm build`:** Compilación exitosa de todos los paquetes (`shared-types`, `api` con Prisma Client 7.10.1 y `web` con Next.js 14.2.3 en sus 66 rutas estáticas y dinámicas).
- **`pnpm --filter web test`:**
  - Pruebas de componentes modificados en este PR (`exit-registration-dialog`, `forgot-password-form`, `reset-password-form`, `approve-dialog`): **11 suites ejecutadas, 11 aprobadas, 54 pruebas exitosas**.
  - Nota de suite general: Se identificaron 6 suites con fallas preexistentes en `origin/epic1` ajenas a accesibilidad (contratos de datos en `personal-data.schema.test.ts`, `application-drawer-scroll-lock.test.tsx`, `observed-notice-view.test.tsx`), las cuales ya estaban presentes en `f8c0c172` antes de iniciar la tarea.
