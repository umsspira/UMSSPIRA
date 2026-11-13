# INT-07 — Matriz de pruebas móviles y cierre de evidencias

**Proyecto:** UMSSPIRA
**Fecha de corte:** 13/11/2026
**Perfil:** Playwright `mobile-chromium-360` (360 px)
**Entorno:** Next.js `http://localhost:3001`, NestJS `http://localhost:3000`, PostgreSQL local Docker `127.0.0.1:5432`, Mailpit `http://localhost:8025`
**Rama:** `feat/G8-INT7-mobileCriticalFlows`
**Archivos de prueba:** `apps/web/e2e/mobile-titulado-flow.spec.ts`, `apps/web/e2e/mobile-titulado-cierre.spec.ts`
**Fixture sintético:** `apps/web/e2e/fixtures/int07-respaldo-prueba.pdf`

## Resumen de ejecución conjunta

**Resultado comunicado por la ejecutora:** **24 pruebas descubiertas — 20 aprobadas, 4 omitidas, 0 fallidas**.

Comando ejecutado:

```powershell
pnpm --filter web exec playwright test mobile-titulado-flow.spec.ts mobile-titulado-cierre.spec.ts --project=mobile-chromium-360
```

Las 4 pruebas omitidas corresponden a integraciones condicionadas por variables de entorno o por un expediente sintético en un estado determinado. No equivalen a pruebas fallidas ni deben contarse como aprobadas en esta ejecución.

## Matriz de cobertura y trazabilidad

| ID | Caso / criterio | Clasificación | Resultado de la última ejecución | Antecedentes y observaciones |
|---|---|---|---|---|
| INT07-M01 | Registro: carga a 360 px | UI responsive | **Pasó** | Sin desbordamiento horizontal |
| INT07-M02 | Inicio de sesión: carga a 360 px | UI responsive | **Pasó** | Sin desbordamiento horizontal |
| INT07-M03 | Recuperación: carga a 360 px | UI responsive | **Pasó** | Sin desbordamiento horizontal |
| INT07-M04 | Solicitar corrección: carga a 360 px | UI responsive | **Pasó** | Sin desbordamiento horizontal |
| INT07-M05 | Registro: campos obligatorios | Validación UI | **Pasó** | — |
| INT07-M06 | BUG-02: correo de 254 caracteres | Validación UI | **Pasó** | Acepta longitud límite admitida |
| INT07-M07 | BUG-02: correo de 255 caracteres | Validación UI | **Pasó** | Rechaza longitud fuera del límite |
| INT07-M08 | Documento: requiere sesión de registro | Control de acceso | **Pasó** | — |
| INT07-M09 | Recuperación: valida correo antes de solicitar enlace | Validación UI | **Pasó** | — |
| INT07-M10 | Recuperación: solicitud HTTP 202 a API local | Integración API | **Omitida** | **Aprobada anteriormente** con `INT07_RUN_INTEGRATION=1` |
| INT07-M11 | Registro E2E: OTP, carga PDF, entrega y constancia | E2E con PostgreSQL + Mailpit | **Omitida** | **Aprobada anteriormente** con `INT07_RUN_INTEGRATION=1` |
| INT07-M12 | Corrección pública: identidad obligatoria | Validación UI | **Pasó** | No realiza solicitud con campos incompletos |
| INT07-M13 | Corrección: token de formato inválido | Validación UI | **Pasó** | Token con `.`; no muestra editor |
| INT07-M14 | Solicitar enlace de corrección a 360 px | UI/API simulada | **Pasó** | **Mock** de API; no comprueba envío real de correo |
| INT07-M15 | Corrección real sin sesión: reemplazo PDF y reenvío | E2E con preparación manual | **Omitida** | **Aprobada anteriormente** con token nuevo y expediente observado; el mismo token puede invalidarse tras entregar |
| INT07-C01 | Activación: pantalla a 360 px | UI responsive | **Pasó** | — |
| INT07-C02 | `POST /activate/status`: UUID inválido | Contrato API | **Pasó** | Rechaza entrada inválida |
| INT07-C03 | `POST /activate/resend`: UUID inválido | Contrato API | **Pasó** | Rechaza entrada inválida |
| INT07-C04 | `POST /activate/verify`: UUID inválido | Contrato API | **Pasó** | Rechaza entrada inválida |
| INT07-C05 | `POST /registrations/activate`: UUID inválido | Contrato API | **Pasó** | Rechaza entrada inválida |
| INT07-C06 | Detalle observado sin `X-Correction-Token` | Seguridad API | **Pasó** | Bloquea consulta sin credencial de corrección |
| INT07-C07 | Reenvío observado sin `X-Correction-Token` | Seguridad API | **Pasó** | Bloquea entrega sin credencial de corrección |
| INT07-C08 | Dictamen `APROBADA` sin autenticación | Seguridad API | **Pasó** | Rechaza solicitud no autenticada |
| INT07-C09 | Aprobación administrativa + Mailpit + activación real | Integración con cambios de estado | **Omitida** | **Pendiente de validación real**; requiere expediente sintético y condiciones explícitas |

## Evidencia de ejecuciones

| Ejecución | Resultado declarado | Valor probatorio |
|---|---|---|
| Suite original, antes de incorporar cierre | 14 aprobadas | Incluye registro y recuperación habilitadas en la ejecución previa |
| Corrección real del PDF y reenvío | 1 aprobada individualmente | Verifica el flujo consumible con enlace de corrección vigente |
| `mobile-titulado-cierre.spec.ts` — bloque seguro | 8 aprobadas | Activación UI, contratos inválidos y seguridad de acceso |
| Ambos archivos juntos, sin las variables de integración | **20 aprobadas, 4 omitidas, 0 fallidas** | **Resultado final de regresión no destructiva** |

**Notas de trazabilidad:** los resultados anteriores se basan en las salidas de consola comunicadas. No se dispone aquí de un artefacto consolidado de Playwright (HTML/JUnit/CI) ni de capturas finales adjuntas. El resultado de aprobación y activación real continúa sin verificarse.

## Evidencias recomendadas para adjuntar al sprint

1. Captura de la consola de la ejecución conjunta con `20 passed / 4 skipped` y ninguna prueba fallida.
2. Captura de `8 passed` de la suite de cierre (opcional si el reporte conjunto es suficiente).
3. Captura de la ejecución individual exitosa de registro E2E (sin contraseñas, OTP ni datos sensibles).
4. Captura de la ejecución individual exitosa de corrección real (sin token ni URL de acceso).
5. Reporte HTML de Playwright o trazas solo cuando correspondan y después de revisar que no contengan tokens, correo o datos sensibles.

## Comandos de reproducción

### Regresión no destructiva

```powershell
Remove-Item Env:INT07_CORRECTION_URL -ErrorAction SilentlyContinue
Remove-Item Env:INT07_RUN_CORRECTION -ErrorAction SilentlyContinue
Remove-Item Env:INT07_RUN_INTEGRATION -ErrorAction SilentlyContinue
Remove-Item Env:INT07_CONFIRM_LOCAL_DB -ErrorAction SilentlyContinue
pnpm --filter web exec playwright test mobile-titulado-flow.spec.ts mobile-titulado-cierre.spec.ts --project=mobile-chromium-360
```

**Esperado con el estado actual:** `20 passed, 4 skipped`, siempre que los servicios locales estén activos.

### Verificación previa al commit

```powershell
git status --short
git diff --check
git diff --stat
git ls-files --others --exclude-standard
pnpm --filter web exec playwright test mobile-titulado-flow.spec.ts mobile-titulado-cierre.spec.ts --list
```

Revisar que `git status` no incluya `.env`, credenciales, correos, `playwright-report/`, `test-results/`, `trace.zip` ni archivos reales de usuarios. No hacer `git add .` indiscriminadamente.

## Limitaciones y pendientes declarados

- **INT07-C09 no ejecutada**: faltan pruebas de aprobación administrativa con autorización real, recepción de correo de activación en Mailpit y finalización de activación de cuenta.
- **Validación positiva de activación**: la suite de cierre prueba la carga de la pantalla y rechazos de UUID inválidos, pero eso **no acredita una activación correcta**.
- **Alcance móvil**: las pruebas se ejecutaron en el perfil `mobile-chromium-360`. No se han acreditado en esta matriz dispositivos reales o todos los tamaños de pantalla.
- **Persistencia de datos**: todas las integraciones con escritura deben ejecutarse exclusivamente con NestJS apuntando a PostgreSQL local; no utilizar Supabase ni expedientes reales.

## Criterio de cierre

**Cierre técnico de la regresión móvil no destructiva: logrado (20 aprobadas, 0 fallidas).**
**Cierre funcional integral de aprobación y activación: pendiente, a menos que el alcance formal de INT-07 no exija esa integración.**
