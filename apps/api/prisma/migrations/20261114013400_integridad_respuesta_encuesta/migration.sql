BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "encuesta"
    WHERE "condicion_laboral" IS NOT NULL
       OR "cargo" IS NOT NULL
       OR "empresa" IS NOT NULL
       OR "area" IS NOT NULL
       OR "modalidad" IS NOT NULL
       OR "salario_mensual" IS NOT NULL
       OR "tiempo_insercion" IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'encuesta contiene respuestas en columnas heredadas; respaldar o migrar esos datos a respuesta_encuesta antes de retirar las columnas';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "respuesta_encuesta" r
    LEFT JOIN "encuesta" e ON e."id" = r."id_encuesta"
    WHERE e."id" IS NULL
  ) THEN
    RAISE EXCEPTION 'respuesta_encuesta contiene id_encuesta sin encuesta correspondiente';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "respuesta_encuesta" r
    LEFT JOIN "titulado" t ON t."id" = r."id_titulado"
    WHERE t."id" IS NULL
  ) THEN
    RAISE EXCEPTION 'respuesta_encuesta contiene id_titulado sin titulado correspondiente';
  END IF;
END $$;

ALTER TABLE "respuesta_encuesta"
  ALTER COLUMN "condicion_laboral" TYPE BOOLEAN
  USING CASE lower(btrim("condicion_laboral"))
    WHEN 'trabaja' THEN TRUE
    WHEN 'no trabaja' THEN FALSE
    ELSE "condicion_laboral"::BOOLEAN
  END,
  ADD COLUMN "edicion_usada" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "fecha_actualizacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "encuesta"
  DROP COLUMN "condicion_laboral",
  DROP COLUMN "cargo",
  DROP COLUMN "empresa",
  DROP COLUMN "area",
  DROP COLUMN "modalidad",
  DROP COLUMN "salario_mensual",
  DROP COLUMN "tiempo_insercion";

ALTER TABLE "respuesta_encuesta"
  ADD CONSTRAINT "respuesta_encuesta_id_encuesta_fkey"
    FOREIGN KEY ("id_encuesta") REFERENCES "encuesta"("id")
    ON DELETE NO ACTION ON UPDATE NO ACTION,
  ADD CONSTRAINT "respuesta_encuesta_id_titulado_fkey"
    FOREIGN KEY ("id_titulado") REFERENCES "titulado"("id")
    ON DELETE NO ACTION ON UPDATE NO ACTION;

CREATE INDEX "idx_respuesta_encuesta_fecha_envio"
  ON "respuesta_encuesta"("fecha_envio");

COMMIT;
