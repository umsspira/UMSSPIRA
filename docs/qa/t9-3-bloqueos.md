# Bloqueos y reservas de T9.3

Este documento registra lo que no pudo cerrarse formalmente en la ejecución de T9.3. Las nueve comprobaciones de los CA-HU9-02, CA-HU9-03 y CA-HU9-04 respondieron lo esperado en el despliegue candidato; las reservas son de trazabilidad, definición y alcance de entorno. No se debilitó ningún guard, no se ejecutaron migraciones, seeds ni `--apply`, y no se modificaron permisos ni políticas de acceso.

## B1. SHA desplegado no verificable

- Criterio afectado: definición de terminado de T9.3 y registro de T9.1 (DevOps).
- Por qué no se puede cumplir: ni `/health` ni `/` exponen versión ni SHA. `/health` solo devuelve `{"status":"ok","database":"ok"}` (`apps/api/src/shared/http/controllers/health.controller.ts:12-22`) y `/` solo devuelve nombre, descripción, web y ruta de salud (`apps/api/src/shared/http/controllers/root.controller.ts:6-15`). Las cabeceras de Render no incluyen el commit. No se dispone del registro de T9.1.
- Evidencia: `curl -D - https://umsspira-api-py5b.onrender.com/health` devuelve `200`, `rndr-id` y cabeceras de seguridad, sin SHA. El SHA de `origin/dev` es `c3857e5cab54d2f8d5ca67d6846bfdffb5a6535b`, pero no es el SHA desplegado.
- Qué se necesita: que DevOps registre URL, SHA y fecha del despliegue en el artefacto de T9.1.
- Quién debe resolverlo: DevOps (T9.1).
- Qué probar al desbloquearse: repetir las nueve comprobaciones de `docs/qa/evidencia-t9-3.md` contra el SHA registrado y actualizar la fila del SHA.

## B2. Entorno no confirmado como QA

- Criterio afectado: alcance de la revalidación de T9.3.
- Por qué no se puede cumplir: el entorno probado es el candidato del equipo. `render.yaml:16` despliega la rama `dev`, `render.yaml:33` define `APP_ENV=dev` y los datos observados son ficticios de integración. No consta que sea el entorno de QA registrado por T9.1.
- Evidencia: `render.yaml:16`, `render.yaml:25` y `render.yaml:33`; cuentas de demostración ficticias de `apps/api/scripts/seed/demo-accounts.ts`.
- Qué se necesita: confirmación de DevOps de que la URL probada es el entorno de QA o, si no lo es, una URL de QA con sus cuentas.
- Quién debe resolverlo: DevOps (T9.1) y líder de QA.
- Qué probar al desbloquearse: la misma matriz de nueve comprobaciones en el entorno confirmado.

## B3. T9.2 exige aplicar faltantes y el guard bloquea `--apply` en QA

- Criterio afectado: CA-HU9-02 y, por dependencia, CA-HU9-03 y CA-HU9-04 si los permisos faltaran en otra base.
- Por qué no se puede cumplir: el script solo admite QA en `--dry-run` y bloquea `--apply`. `assertTeamPermissionTarget` agrega el proyecto QA a los destinos permitidos únicamente cuando el modo es `dry-run` (`apps/api/scripts/seed/nlp-permissions.ts:49-80`, en particular `:61-74`). La prueba `apps/api/test/nlp-permissions.spec.ts:44-65` fija esa regla y `apps/api/test/grant-nlp-permissions.spec.ts:29-35` verifica que `--apply` contra QA se rechaza antes de crear la conexión. T9.2, en cambio, requiere aplicar los faltantes. En el despliegue observado los tres permisos y las cuatro asociaciones ya estaban presentes, así que no fue necesario aplicar nada; el conflicto sigue vigente para cualquier base donde falten.
- Evidencia: `apps/api/scripts/seed/nlp-permissions.ts:49-80`, `apps/api/scripts/seed/grant-nlp-permissions.ts:16`, `:39-46`, `apps/api/test/nlp-permissions.spec.ts:44-65`, `apps/api/test/grant-nlp-permissions.spec.ts:29-35`.
- Qué se necesita: una vía autorizada distinta para aplicar los faltantes en QA, con respaldo y registro de filas.
- Quién debe resolverlo: DevOps/BD, con aprobación del dueño del módulo `user`.
- Qué probar al desbloquearse: `--dry-run` contra la base objetivo, aplicar solo los faltantes por la vía autorizada, repetir `--dry-run` sin faltantes y revalidar `/auth/me` con el titulado.

### Opciones para la vía autorizada (no implementadas)

1. Ejecución manual de SQL por el Lead de BD, en una transacción y con respaldo previo.
   - Ventajas: no debilita el guard, es auditable y mantiene el script de solo lectura en QA.
   - Desventajas: depende de una persona, no es repetible automáticamente y exige revisar el respaldo y la reversión.
2. Extender el allowlist para permitir `--apply` en QA con doble aprobación explícita.
   - Ventajas: repetible y trazable desde el script.
   - Desventajas: cambia una regla de seguridad, exige un mecanismo de aprobación adicional y aumenta el riesgo de ejecución accidental.
3. Aplicar en una copia propia del equipo y pedir a BD que replique las filas en QA.
   - Ventajas: conserva el guard y el script actual.
   - Desventajas: no prueba la conexión real de QA y agrega un paso manual de replicación.
4. Procedimiento operativo fuera del repositorio con credenciales temporales y aprobación registrada.
   - Ventajas: no requiere cambios de código.
   - Desventajas: el procedimiento no queda versionado ni cubierto por pruebas.

La opción 1 es la de menor riesgo técnico; la 2 es la más repetible, pero requiere decisión del dueño de la política. Este documento no implementa ninguna.

## B4. Resultado esperado del administrador sin definir

- Criterio afectado: mención de la cuenta de administrador en T9.3; ningún CA define su resultado.
- Por qué no se puede cumplir: no existe un valor esperado contra el cual aprobar o fallar. El código y el despliegue asignan `nlp:extract` al administrador y no le asignan `radar:self:read` ni `radar:self:write` (`apps/api/src/modules/user/domain/policies/access.policy.ts:4-14`). El `/auth/me` del administrador respondió `200` con `nlp:extract` presente y ambos permisos de radar ausentes.
- Evidencia: comportamiento observado en la comprobación 3 de `docs/qa/evidencia-t9-3.md`; `access.policy.ts:4-14`.
- Qué se necesita: que PO/BE definan si el administrador debe tener acceso al radar, solo a NLP o ninguno de los dos.
- Quién debe resolverlo: PO con BE.
- Qué probar al desbloquearse: `/auth/me`, `GET /radar` y `POST /radar/recalculate` con el administrador contra el resultado definido.

## B5. Suite web con fallos previos ajenos a T9.3

- Criterio afectado: exigencia de dejar todas las pruebas en verde antes de cada commit.
- Por qué no se puede cumplir: `pnpm test` en la raíz reporta 11 fallos en `apps/web/src/app/(dashboard)/events/catalog/[id]/detail.test.tsx`, una suite que T9.3 no modifica. La suite de API está en verde con 118 suites y 997 pruebas.
- Evidencia: salida de `pnpm test` en la raíz; `git diff` de esta rama no contiene archivos de `apps/web`. La suite falla por un botón `Cancelar mi inscripción` que no aparece en el estado probado.
- Qué se necesita: que el equipo de web corrija o justifique la suite, o que QA acepte una excepción documentada para este PR.
- Quién debe resolverlo: equipo de web.
- Qué probar al desbloquearse: `pnpm test` completo en la raíz.

## Resumen

| Reserva | Afecta | Responsable |
| --- | --- | --- |
| B1 SHA desplegado | Cierre formal de T9.1/T9.3 | DevOps |
| B2 Entorno QA | Alcance de la evidencia | DevOps / QA |
| B3 Vía autorizada de T9.2 | CA-HU9-02 y dependientes si faltan permisos | DevOps/BD y dueño de `user` |
| B4 Resultado del administrador | Criterio no definido | PO / BE |
| B5 Suite web previa | Gate de pruebas del monorepo | Equipo web |
