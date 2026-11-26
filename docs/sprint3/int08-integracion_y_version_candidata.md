# INT-08 — Integrar cambios y comprobar la versión candidata

**Proyecto:** UMSSPIRA — Épica 1 — Sprint 3 — G8  
**Responsable:** Uzeda Rocha Mauricio  
**Apoyo y revisión:** Nicole Flores Choquetopa  
**Prioridad:** Alta  
**Fecha:** 25/11/2026  
**Estado de revisión documental:** Conforme (OK).  
**Alcance:** Revisión estática de la versión candidata.

## 1. Objetivo

Consolidar las mejoras y correcciones del Sprint 3, identificar los componentes reutilizables de `fix/G8-email` y establecer una versión candidata que reúna los cambios de registro, recuperación de contraseña, respaldo documental, visor y confirmación de solicitudes, manteniendo la trazabilidad de las tareas del equipo.

## 2. Inventario de cambios

La revisión de la copia `UMSSPIRA-epic1 (2).zip` permite identificar los componentes necesarios para la integración. Se toma como antecedente el inventario de MAIL-01 del 12/11/2026, realizado respecto de `epic1`.

| Commit de referencia | Cambio | Tarea | Resultado de revisión documental |
| --- | --- | --- | --- |
| `cf3c903f` | Plantilla institucional de correo | MAIL-01 | Componente identificado y presente |
| `5d5e5418` | Correo de código de registro | MAIL-02 | Implementación y pruebas identificadas |
| `eb8fe637` | Correo de recuperación | MAIL-03 | Implementación y pruebas identificadas |
| `c24d6d25` | Transporte de correo mediante Brevo | BUG-17 | Componente identificado y presente |
| `ca505804` | Recuperación del respaldo vigente | HU-17.4 / INT-03 | Componente identificado y presente |

Los cambios existentes se reconocen como trabajo heredado de sus tareas correspondientes. INT-08 no requiere duplicar estas implementaciones.

## 3. Matriz de cumplimiento documental

| Requisito | Evidencia en la copia revisada | Resultado |
| --- | --- | --- |
| Estilo institucional de correos | `account-email.ts` | OK — componente identificado |
| Verificación de registro | `issue-registration-code.use-case.ts` | OK — componente identificado |
| Recuperación de contraseña | `password-reset-mail.worker.ts` | OK — componente identificado |
| Transporte de correo | `smtp-outbox.worker.ts` | OK — componente identificado |
| Respaldo documental vigente | `prisma-observed-application.repository.ts` | OK — componente identificado |
| Visor de documentos anteriores | `previous-document-preview.tsx` | OK — componente identificado |
| Vista previa del registro | `review-document-preview.tsx` | OK — componente identificado |
| Confirmación y constancia | `confirmation-content.tsx` | OK — componente identificado |
| Historial del expediente | `application-history.service.ts`, `history-tab.tsx`, `history-timeline.tsx` | OK — componente identificado |
| Consulta pública | `apps/web/src/app/(public)/status/page.tsx` | OK — componente identificado |
| Trazabilidad y criterios de integración | Documentación del Sprint 3 | OK — documentado |

Los componentes identificados cubren el alcance funcional previsto para la revisión estática. Esta matriz no sustituye las pruebas funcionales sobre la versión integrada.

## 4. Dependencias y coordinación

| Dependencia | Evidencia de referencia | Alcance considerado |
| --- | --- | --- |
| MAIL-01 | `docs/sprint3/mail01-pr-evidence.md` | Plantilla común de correos |
| INT-02 | `docs/sprint3/int02-integrated-validation.md` | Validación integrada y OCR |
| INT-04 | `docs/sprint3/db-migrations-runbook.md` | Migraciones y respaldo |
| INT-05 | `docs/sprint3/int05-regression-results.md` | Regresión y permisos |
| INT-06 | `docs/sprint3/int06-frontend-checklist.md` | Accesibilidad y frontend |
| INT-07 | `docs/sprint3/int07-mobile-matrix.md` | Validación móvil |

Se establece la revisión de PR por alcance con Nicole, preservando las implementaciones existentes y evitando incorporar cambios ajenos a la tarea. Los conflictos, cuando existan, deben resolverse conservando las funcionalidades vigentes de la rama de destino.

## 5. Identificación de la versión candidata

| Campo | Registro |
| --- | --- |
| Identificador documental | `INT08-ZIP-20261125-8a9c8037` |
| Candidata propuesta | `RC-INT08-20261125` |
| Fuente | `UMSSPIRA-epic1 (2).zip` |
| SHA-256 de la fuente | `8a9c8037c2d9f9badb6379f0fd7f7dd4b8faa493371514dba5ca90f61a6d3431` |
| Destino previsto | `epic1` y posteriormente `dev` |
| SHA Git integrado | Registrar desde el clon del equipo |

## 6. Controles de aceptación

Los controles definidos en `.github/workflows/ci.yml` son los siguientes:

```bash
git fetch --prune origin
git diff --name-status origin/dev origin/fix/G8-email
git log --left-right --cherry-pick --oneline origin/dev...origin/fix/G8-email
git cherry -v origin/dev origin/fix/G8-email
git rev-parse HEAD
pnpm install --frozen-lockfile
pnpm lint
pnpm test
pnpm build
```

La comprobación integrada comprende el envío y reenvío del código de registro, recuperación de contraseña, visualización de respaldos, corrección de solicitudes, historial del expediente, confirmación y descarga de constancia, permisos, OCR y navegación móvil. La aceptación requiere resultados satisfactorios sobre el mismo SHA candidato.

## 7. Resultado de la revisión documental

| Control documental | Resultado |
| --- | --- |
| Inventario de mejoras y correcciones | OK |
| Identificación de componentes reutilizables | OK |
| Trazabilidad de tareas y dependencias | OK |
| Identificación de la copia candidata | OK |
| Definición de controles de integración | OK |
| Documentación del procedimiento de revisión y despliegue | OK |

### Evidencias de aceptación técnica

Los resultados anteriores corresponden exclusivamente a la revisión documental y estática. La comparación efectiva entre ramas, el SHA integrado, la aprobación del PR y los resultados de CI deberán acreditarse con los registros del equipo. La copia ZIP no permite comprobar estas operaciones. Se mantienen como observaciones de seguimiento las dos pruebas `it.todo`, la revisión autenticada de INT-06 y la prueba de aprobación/activación de INT-07; la ruta `/status` está presente en la copia actual.

El despliegue se realizará únicamente mediante el procedimiento autorizado del equipo.

## 8. Conclusión

**Resultado de la revisión documental: OK.** La versión candidata identificada reúne los componentes previstos para la integración del Sprint 3 y cuenta con un inventario, trazabilidad y procedimiento de aceptación documentados. El entregable documental de INT-08 se considera completo dentro del alcance revisado. La aceptación técnica definitiva se acredita mediante los registros de integración y pruebas del equipo.