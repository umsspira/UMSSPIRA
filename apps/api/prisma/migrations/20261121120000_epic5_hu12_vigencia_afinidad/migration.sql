ALTER TABLE "postulacion"
  ADD COLUMN "hash_entrada" VARCHAR(64),
  ADD COLUMN "estado_match" VARCHAR(24),
  ADD COLUMN "hash_en_calculo" VARCHAR(64),
  ADD COLUMN "reclamo_match_id" UUID,
  ADD COLUMN "reclamo_match_hasta" TIMESTAMPTZ(6);

ALTER TABLE "postulacion"
  ADD CONSTRAINT "postulacion_estado_match_check"
  CHECK ("estado_match" IS NULL OR "estado_match" IN ('ready', 'profile-incomplete', 'no-requirements'));

ALTER TABLE "postulacion"
  ADD CONSTRAINT "postulacion_hash_entrada_check"
  CHECK ("hash_entrada" IS NULL OR "hash_entrada" ~ '^[0-9a-f]{64}$');

ALTER TABLE "postulacion"
  ADD CONSTRAINT "postulacion_estado_match_consistente_check"
  CHECK (
    "estado_match" IS NULL
    OR ("estado_match" = 'ready' AND "porcentaje_match" IS NOT NULL AND "fecha_match" IS NOT NULL AND "hash_entrada" IS NOT NULL)
    OR ("estado_match" IN ('profile-incomplete', 'no-requirements') AND "porcentaje_match" IS NULL AND "fecha_match" IS NULL AND "hash_entrada" IS NOT NULL)
  );

-- Las filas históricas sin estado técnico siguen siendo compatibles.
ALTER TABLE "postulacion"
  ADD CONSTRAINT "postulacion_porcentaje_match_rango_check"
  CHECK ("estado_match" IS NULL OR "porcentaje_match" IS NULL OR "porcentaje_match" BETWEEN 0 AND 100);

ALTER TABLE "postulacion"
  ADD CONSTRAINT "postulacion_reclamo_match_check"
  CHECK (
    ("hash_en_calculo" IS NULL AND "reclamo_match_id" IS NULL AND "reclamo_match_hasta" IS NULL)
    OR ("hash_en_calculo" IS NOT NULL AND "hash_en_calculo" ~ '^[0-9a-f]{64}$' AND "reclamo_match_id" IS NOT NULL AND "reclamo_match_hasta" IS NOT NULL)
  );
