# Runbook de Migraciones - Sprint 3 (INT-04)

## Orden de Migraciones
- 0013: Unificar revisión (INT-03)
- 0014: Motivos múltiples (HU-16)
- 0015: Consulta de estado (HU-18)
- 0016: Reservas de trabajos OCR (HU-13.5) -> `20261113090000_create_ocr_jobs_reservas`
- 0017: Resultados OCR versionados (HU-13.4) -> `20261113090001_create_ocr_resultados_versionados`

## Comandos de Respaldo y Restauración
- Respaldo: `pg_dump -U usuario -d base_datos > backup.sql`
- Restauración: `psql -U usuario -d base_datos < backup.sql`

## Cómo revertir (si algo falla)
Si la 0015 falla, ejecutar manualmente:
`DROP TABLE "consulta_estado_solicitud";`
Si la 0014 falla, ejecutar:
`DROP TABLE "dictamen_motivo"; DROP TABLE "motivo_observacion";`
