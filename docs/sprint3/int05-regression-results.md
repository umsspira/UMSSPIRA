# INT-05: Resultados de Pruebas de Regresión de Permisos y Límites del Servidor

- **Responsable:** Flores Mamani Daniel Teodoro
- **Apoyo y revisión:** Flores Choquetopa Nicole Marisol
- **Rama:** `feat/G8-INT5-serverPermissionsRegression`
- **Fecha de corte Semana 1:** Viernes 13/11/2026

## 1. Cobertura Ejecutada (Semana 1)

| Escenario | Archivo de prueba | Resultado |
| :--- | :--- | :--- |
| Filtrado de bandeja por carrera autorizada (`scopedApplication`) | `permissions-by-career.e2e-spec.ts` | Aprobado |
| Bloqueo de lectura de expediente y documento de otra carrera (`404`) | `permissions-by-career.e2e-spec.ts` | Aprobado |
| Bloqueo de emisión de dictamen sobre carrera no autorizada (`404`) | `permissions-by-career.e2e-spec.ts` | Aprobado |
| Rechazo de entradas inválidas en dictamen y consulta de estado (`400`) | `permissions-by-career.e2e-spec.ts` | Aprobado |
| Respuesta pública uniforme (`202`) y límites/cooldown en `status-query` sin crear dictamen ni activar cuentas | `permissions-by-career.e2e-spec.ts` | Aprobado |
| Concurrencia de dictamen (`SELECT ... FOR UPDATE`) y encolado único de correo | `review-concurrency.e2e-spec.ts` | Aprobado |
| Múltiples motivos sin duplicados y una explicación en `OBSERVADA` (`16.1`) | `review-concurrency.e2e-spec.ts` | Aprobado |
| Límite vigente de 2 observaciones por solicitud | `review-concurrency.e2e-spec.ts` | Aprobado |
| Límite vigente de 5 rechazos acumulados por identidad (C.I.) | `review-concurrency.e2e-spec.ts` | Aprobado |
| Protección de versión desactualizada en corrección observada (`INT-03`) | `review-concurrency.e2e-spec.ts` | Aprobado |
| Reintento de notificaciones en cola sin duplicar dictamen | `review-concurrency.e2e-spec.ts` | Aprobado |

## 2. Casos Diferidos a Semana 2 (`test.fixme` según plan de corte)

Conforme al alcance acotado de cierre de Semana 1, quedan registrados como `test.fixme` para activación tras el merge de sus dependencias el Lunes 16/11:

1. **HU-14.4 (`review-concurrency.e2e-spec.ts`):** Rechazo explícito en el endpoint de dictamen cuando `expectedRevision` del cliente difiere de la versión vigente en PostgreSQL.
2. **HU-17.2 (`permissions-by-career.e2e-spec.ts`):** Denegación de consulta del historial cronológico de eventos a administradores sin alcance sobre la carrera del expediente.