# HU-15 · T15.4: No inflación de frecuencias de términos no reconocidos en recálculos repetidos

Base verificada: `518ed0cc` (rama `feat/G3-HU15-t153-versionado-diccionario`, sobre `epic3` `b5460cfc`).
Criterio cubierto: `CA-HU15-06`.

## 1. Mecanismo

La frecuencia de un término no reconocido se guarda por titulado y por término, y cada guardado la reemplaza:

1. **Retiro de obsoletos:** `deleteMany` elimina los términos del titulado que ya no aparecen en el cálculo actual.
2. **Sin duplicados en el lote:** el repositorio agrupa los términos por nombre antes de insertar.
3. **Reemplazo, no suma:** el `INSERT` termina con `ON CONFLICT (id_titulado, termino) DO UPDATE SET frecuencia = EXCLUDED.frecuencia, fecha_deteccion = EXCLUDED.fecha_deteccion`.
4. **Respaldo en la base de datos:** el índice único `palabra_clave_no_mapeada_id_titulado_termino_key` impide dos filas para el mismo titulado y término.

Código: `apps/api/src/modules/radar/infrastructure/repositories/prisma-radar.repository.ts` (método `persist`).

## 2. Pruebas

| Prueba | Archivo | Qué demuestra |
| :--- | :--- | :--- |
| Unitaria (T15.4) | `apps/api/src/modules/radar/infrastructure/repositories/prisma-radar.repository.spec.ts` | Guardar el mismo cálculo 3 veces envía siempre el mismo payload, y el SQL reemplaza la frecuencia con `EXCLUDED.frecuencia` sin sumarla. |
| Integración (existente) | `apps/api/test/radar-batch-persistence.integration.spec.ts` | Con PostgreSQL real, volver a guardar un término reemplaza su frecuencia, conserva el `id` de la fila y retira los obsoletos. |

Comando de la prueba unitaria: `pnpm --filter api test -- prisma-radar.repository`

## 3. Alcance y límites

- La prueba unitaria usa dobles de prueba: comprueba lo que se envía a la base, no su ejecución real. La ejecución real la cubre la prueba de integración, que solo corre con `RADAR_PERSISTENCE_TEST_DATABASE_URL` apuntando a una copia local.
- Esta tarea no cambia el comportamiento del radar.
- La parte de QA (verificación manual contra una base) queda para QA.