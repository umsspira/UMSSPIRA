# Evidencia de revision tecnica y alcance: MAIL-01

Documento de evidencia para la tarea **MAIL-01** (Sprint 3), correspondiente a la integracion y revision tecnica del estilo comun de correos de acceso institucional originado en la rama `fix/G8-email`.

---

## 1. Referencia del commit de origen y destino

- **Commit de origen:** `cf3c903fe41f5d899d401184ca35373f7521482a`
- **Rama de origen:** `origin/fix/G8-email`
- **Autor original:** Yadira Peredo <yadira.peredo.30.3s4@gmail.com>
- **Fecha original:** Tue Nov 3 23:48:54 2026 -0400
- **Asunto original:** `feat(email): compartir estilo institucional para correos de acceso`
- **Commit en nueva rama (`feat/G8-MAIL1-commonMailStyle`):** `5ccd5229`
- **Asunto en nueva rama:** `chore(api): integrar estilo comun de correos de fix-g8-email con revision`

---

## 2. Alcance real de la rama fix/G8-email

Analisis de `origin/epic1..origin/fix/G8-email` y su clasificacion por tareas:

| Commit | Resumen / Asunto | Tarea asociada | Estado en esta rama |
|---|---|---|---|
| `eb8fe637` | feat(email): aplicar plantilla a recuperacion de contrasena | MAIL-03 | Excluido (corresponde a MAIL-03) |
| `5d5e5418` | feat(email): aplicar plantilla al codigo de registro | MAIL-02 | Excluido (corresponde a MAIL-02) |
| `cf3c903f` | feat(email): compartir estilo institucional para correos de acceso | MAIL-01 | **Integrado en este commit** |
| `c24d6d25` | fix(auth): enviar recuperacion por Brevo cuando esta configurado | BUG-17 | Ya integrado previamente en `origin/epic1` |
| `ca505804` | fix(registrations): mostrar el documento vigente tras una correccion | 17.4 / INT-03 | Ya integrado previamente en `origin/epic1` |

### Aclaracion de lo que se integra y lo que queda fuera
- **Lo que se integra aqui:** Unicamente el modulo base compartido de notificaciones de cuenta (`account-email.ts`) y su suite de pruebas directas (`account-email.spec.ts`).
- **Lo que queda fuera a proposito:** Las invocaciones particulares en casos de uso de registro (`MAIL-02`), trabajadores de recuperacion de contrasena (`MAIL-03`), y cambios de infraestructura o configuracion no pertinentes a la definicion del layout comun.

---

## 3. Que se integra

Se integran los siguientes artefactos en `apps/api/src/shared/notifications/`:
1. `account-email.ts`: Contiene el layout base institucional reutilizable en formato HTML de tablas clasicas compatibles con clientes de correo, sanitizacion via `escapeHtml`, validacion de protocolo con `httpUrl`, la generacion del markup para codigos de registro (`registrationCodeHtml`) y recuperacion de contrasena (`passwordRecoveryHtml`).
2. `account-email.spec.ts`: Suite de pruebas unitarias que verifica el formateo de los digitos OTP, la presencia de la paleta institucional (`#0F172A`, `#FAF6EE`), enlaces y prevencion de inyecciones de codigo / scripts maliciosos.

No se modifico la implementacion original de la plantilla, respetando estrictamente el alcance asignado.

---

## 4. Comprobaciones estaticas y de render

| Comprobacion | Resultado | Evidencia / Detalle | Fecha |
|---|---|---|---|
| Variables de entorno | Cumple | Utiliza el parametro `origin` inyectado por el llamador (basado en `WEB_BASE_URL`, documentada en `.env.example`). No existen claves ni secretos cableados. | 2026-11-12 |
| URLs no fijas | Cumple | `apps/api/src/shared/notifications/account-email.ts`. Todas las URLs se construyen dinamicamente a partir de `origin` o se extraen del texto mediante `httpUrl` y regex sin hosts fijos ni localhost cableado en la plantilla. | 2026-11-12 |
| Lectura sin imagenes | Cumple | La etiqueta del isotipo institucional cuenta con `alt="UMSSPIRA"` y respaldo de texto en caso de fallo de carga de imagen. Los botones principales tienen contraste tipografico y se preserva el texto alternativo visible con enlaces. | 2026-11-12 |
| Render de muestra fuera de repo | Cumple | Ejecucion de render temporal en `$TEMP/` validando generacion limpia de HTML para codigos y recuperacion de contrasena con enlaces operativos. | 2026-11-12 |
| Estilo y lenguaje | Cumple | Textos oficiales en espanol, sin emojis, cumpliendo los lineamientos de redaccion institucional. | 2026-11-12 |

---

## 5. Resultados de validaciones automatizadas

- **Linter (`pnpm --filter api lint`):** Exitoso (0 errores, 0 advertencias).
- **Compilacion (`pnpm --filter api build`):** Exitosa (`nest build` finalizado correctamente con Prisma Client generado).
- **Pruebas unitarias (`pnpm --filter api test`):** 114 suites ejecutadas y aprobadas (1004 tests pasados en total, incluyendo `account-email.spec.ts`).

---

## 6. Pendientes y coordinacion

- **INT-08 (Mauricio):** Coordinar el inventario de fix/G8-email para asegurar que las tareas dependientes no reintroduzcan cambios redundantes o incompatibles.
- **MAIL-02 y MAIL-03:** Dependen de la aprobacion y disponibilidad de este estilo comun en `epic1` para el formateo de sus respectivos envios.
- **BUG-17:** Verificado en el historial de `origin/epic1` (commit `c24d6d25` ya incorporado en la rama base).

---

## 7. Enlaces de seguimiento

- **Historia de usuario / Tarea en Taiga:** pendiente
- **Pull Request:** pendiente
