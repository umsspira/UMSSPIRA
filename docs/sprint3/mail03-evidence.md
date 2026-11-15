# Evidencia de validacion tecnica y alcance: MAIL-03

Documento de evidencia para la tarea **MAIL-03** (Sprint 3), correspondiente a la documentacion, validacion y aplicacion de la plantilla institucional para el correo de recuperacion de contrasena originado en la rama `fix/G8-email`.

---

## 1. Referencia del commit de origen y destino

- **Commit de origen:** `eb8fe637a0aad99d59c4b7e5516376c9604bc6ce`
- **Rama de origen:** `origin/fix/G8-email`
- **Autor original:** Yadira Peredo <yadira.peredo.30.3s4@gmail.com>
- **Fecha original:** Tue Nov 3 23:49:30 2026 -0400
- **Asunto original:** `feat(email): aplicar plantilla a recuperacion de contrasena`
- **Commit en nueva rama (`feat/G8-MAIL3-recoveryMailTemplate`):** `4f2d877e`
- **Asunto en nueva rama:** `feat(api): integrar plantilla de recuperacion con enlace alternativo y vigencia`

---

## 2. Que se integra y que no de eb8fe637

| Archivo | Estado en esta tarea | Justificacion |
|---|---|---|
| `apps/api/src/modules/auth/infrastructure/notifications/password-reset-mail.worker.ts` | **Integrado** | Aplica `passwordRecoveryHtml(text, WEB_BASE_URL)` y envia HTML en Nodemailer y Brevo REST. Propio de recuperacion (MAIL-03). |
| `apps/api/src/modules/auth/infrastructure/notifications/password-reset-mail.worker.spec.ts` | **Integrado** | Pruebas unitarias que validan el despacho de `htmlContent` / `html` en Brevo y Nodemailer. |
| `apps/api/src/shared/notifications/account-email.ts` | Previamente integrado en `origin/epic1` | La funcion `passwordRecoveryHtml` y el layout comun provienen del commit `cf3c903f` integrado via `MAIL-01` (`5ccd5229` / PR #684). No requirio modificaciones adicionales. |
| `apps/api/src/shared/notifications/account-email.spec.ts` | Previamente integrado en `origin/epic1` | Suite de pruebas del layout y `passwordRecoveryHtml` ya presente en `origin/epic1`. |
| `issue-registration-code.use-case.ts` y spec | **Excluido** | Pertenece a la tarea `MAIL-02` (codigo de registro). No forma parte del commit `eb8fe637`. |
| `registrations.providers.ts` | **Excluido** | Pertenece a la tarea `MAIL-02`. |
| `smtp-outbox.worker.ts` | **Excluido** | Pertenece a la tarea `BUG-17` (Daniel). |

---

## 3. Tabla de validacion de condiciones de aceptacion

Validacion tecnica efectuada sobre el entorno de ejecucion y renderizado:

| Condicion | Resultado | Evidencia / Detalle | Fecha |
|---|---|---|---|
| Accion principal | Cumple | Boton renderizado con enlace a `{WEB_BASE_URL}/reset-password?token=...`. Hallazgo: el rotulo del boton es "Crear nueva contraseña" en lugar de "Cambiar contraseña" (se preserva diseno original sin alteraciones no autorizadas). | 2026-11-12 |
| Enlace alternativo | Cumple | La URL completa se imprime en el parrafo visible (`overflow-wrap: anywhere;`), permitiendo su copiado manual completo sin truncamiento ni escapes invalidos (`&amp;`, `%2B`). | 2026-11-12 |
| Vigencia del enlace | Cumple | El texto encolado indica explicitamente "Vence en 60 minutos". Dicho valor proviene de `RECOVERY_LINK_MINUTES` definido en `apps/api/src/modules/auth/domain/policies/password-recovery.policy.ts` (linea 1), garantizando sincronizacion con la politica de dominio. | 2026-11-12 |
| Ignorar solicitudes ajenas | Cumple | El parrafo incluye "Si no fuiste tú, ignora este correo: tu contraseña no cambiará." generado en `recoveryMailBody` (`apps/api/src/modules/auth/application/use-cases/request-password-recovery.use-case.ts`, linea 26), visible tanto en texto plano como en el cuerpo HTML. Adicionalmente, el layout incorpora el pie de seguridad institucional. | 2026-11-12 |
| URL publica correcta | Cumple | Construido dinamicamente mediante `WEB_BASE_URL` inyectado por `ConfigService` (`http://localhost:3001` como fallback de entorno local). La ruta `/reset-password` existe en `apps/web/src/app/(public)/reset-password/page.tsx` y el logo existe en `apps/web/public/assets/events/umsspira-logo-desktop.png`. El valor final para produccion debe ser confirmado por DevOps. | 2026-11-12 |
| Seguridad basica | Cumple | Sanitizacion contra scripting en `escape()` de `account-email.ts` y verificacion de protocolo seguro (`https:` / `http:`) en `httpUrl()`. Se comprueba en `account-email.spec.ts` ("escapa contenido variable y no crea enlaces ejecutables"). | 2026-11-12 |
| Texto y estilo | Cumple | Redaccion en espanol, sin emojis ni caracteres incompatibles, con `alt="UMSSPIRA"` en la imagen institucional y estilos inline en tablas clasicas compatibles con clientes de correo. | 2026-11-12 |
| Renderizado en movil (375 px) | Cumple | Verificado mediante renderizado headless (ancho 375 px). La estructura fluida `max-width: 632px` y `overflow-wrap: anywhere` previene desbordamientos horizontales; el boton, enlace y parrafos conservan legibilidad. | 2026-11-12 |
| Imagenes bloqueadas | Cumple | Al suprimir la carga de imagenes externas, el encabezado mantiene el texto alternativo y contraste tipografico, sin depender de `background-image` para la legibilidad de la accion ni del enlace. | 2026-11-12 |

---

## 4. Reporte HU-12 bug 3

- **Estado en repositorio:** Reporte visual no encontrado como documento explicito en el repositorio; referenciado en la planificacion oficial de Sprint 3. Pendiente de adjuntar por Nicole.
- **Puntos cubiertos:** La incorporacion del HTML responsivo con tablas compatibles, boton visible de reseteo, enlace de contingencia copiable y texto de vigencia resuelve las deficiencias visuales del correo plano reportadas en la HU-12.

---

## 5. Correcciones aplicadas en esta tarea

- **Ninguna:** El worker y la funcion `passwordRecoveryHtml` cumplieron satisfactoriamente con todos los criterios de aceptacion sin requerir correcciones en el codigo.

---

## 6. Resultado de validaciones automatizadas

- **Linter (`pnpm --filter api lint`):** Exitoso (0 errores, 0 advertencias).
- **Compilacion (`pnpm --filter api build`):** Exitosa (`nest build` finalizado correctamente con Prisma Client generado).
- **Pruebas unitarias (`pnpm --filter api test`):** 114 suites ejecutadas y aprobadas (1004 tests pasados en total).

---

## 7. Coordinacion con BUG-17

- **Alcance de BUG-17 (Daniel):** Verificacion del transporte, outbox SMTP y despacho real con el proveedor transaccional (Brevo / SMTP).
- **Alcance de MAIL-03 (Nicole):** Integracion de la plantilla HTML, formato del enlace alternativo, texto de advertencia, vigencia y renderizado responsivo.
- **Evidencia de envio real:** Pendiente de BUG-17 (Daniel).

---

## 8. Enlaces de seguimiento

- **Historia de usuario / Tarea en Taiga:** pendiente
- **Pull Request:** pendiente
