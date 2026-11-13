# Runbook de Migraciones - Sprint 3 (INT-04)

## Orden de Migraciones
- 0013: Unificar revisión (INT-03)
- 0014: Motivos múltiples (HU-16)
- 0015: Consulta de estado (HU-18)

## Comandos de Respaldo y Restauración
- Respaldo: `pg_dump -U usuario -d base_datos > backup.sql`
- Restauración: `psql -U usuario -d base_datos < backup.sql`

## Cómo revertir (si algo falla)
Si la 0015 falla, ejecutar manualmente:
`DROP TABLE "consulta_estado_solicitud";`
Si la 0014 falla, ejecutar:
`DROP TABLE "dictamen_motivo"; DROP TABLE "motivo_observacion";`
