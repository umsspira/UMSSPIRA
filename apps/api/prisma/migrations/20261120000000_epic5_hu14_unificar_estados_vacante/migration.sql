-- HU-14 · Un solo vocabulario de estados para vacante: PUBLICADO | PAUSADO | CERRADO.
-- Normaliza lo que escribían por separado los módulos job-postings y vacantes
-- (PUBLICADA, ACTIVA, ACTIVO, PAUSADA, CERRADA, etc.). Los estados fuera del
-- vocabulario (p. ej. BORRADOR) no se tocan. Es idempotente.

UPDATE "vacante"
SET "estado" = CASE
    WHEN upper(btrim("estado")) IN ('PUBLICADO', 'PUBLICADA', 'ACTIVA', 'ACTIVO', 'ACTIVE', 'PUBLISHED') THEN 'PUBLICADO'
    WHEN upper(btrim("estado")) IN ('PAUSADO', 'PAUSADA', 'PAUSED') THEN 'PAUSADO'
    WHEN upper(btrim("estado")) IN ('CERRADO', 'CERRADA', 'CLOSED') THEN 'CERRADO'
  END,
  "fecha_actualizacion" = now()
WHERE upper(btrim("estado")) IN (
    'PUBLICADO', 'PUBLICADA', 'ACTIVA', 'ACTIVO', 'ACTIVE', 'PUBLISHED',
    'PAUSADO', 'PAUSADA', 'PAUSED',
    'CERRADO', 'CERRADA', 'CLOSED'
  )
  AND "estado" IS DISTINCT FROM CASE
    WHEN upper(btrim("estado")) IN ('PUBLICADO', 'PUBLICADA', 'ACTIVA', 'ACTIVO', 'ACTIVE', 'PUBLISHED') THEN 'PUBLICADO'
    WHEN upper(btrim("estado")) IN ('PAUSADO', 'PAUSADA', 'PAUSED') THEN 'PAUSADO'
    WHEN upper(btrim("estado")) IN ('CERRADO', 'CERRADA', 'CLOSED') THEN 'CERRADO'
  END;