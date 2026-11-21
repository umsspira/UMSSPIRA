ALTER TABLE "postulacion"
ADD COLUMN "fecha_match" TIMESTAMPTZ(6);

-- Asocia fecha_match con created_at para preservar los porcentajes calculados previamente sin violar el CHECK.
UPDATE "postulacion"
SET "fecha_match" = COALESCE("created_at", NOW())
WHERE "porcentaje_match" IS NOT NULL
  AND "fecha_match" IS NULL;

ALTER TABLE "postulacion"
ALTER COLUMN "porcentaje_match" TYPE INTEGER
USING ROUND("porcentaje_match")::INTEGER;

ALTER TABLE "postulacion"
ADD CONSTRAINT "postulacion_match_fecha_pareados"
CHECK (("porcentaje_match" IS NULL) = ("fecha_match" IS NULL));
