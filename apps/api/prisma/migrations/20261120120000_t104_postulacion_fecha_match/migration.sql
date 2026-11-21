ALTER TABLE "postulacion"
ADD COLUMN "fecha_match" TIMESTAMPTZ(6);

-- Los porcentajes anteriores no tienen fecha de cálculo y no pueden presentarse como vigentes.
UPDATE "postulacion"
SET "porcentaje_match" = NULL;

ALTER TABLE "postulacion"
ALTER COLUMN "porcentaje_match" TYPE INTEGER
USING ROUND("porcentaje_match")::INTEGER;

ALTER TABLE "postulacion"
ADD CONSTRAINT "postulacion_match_fecha_pareados"
CHECK (("porcentaje_match" IS NULL) = ("fecha_match" IS NULL));
