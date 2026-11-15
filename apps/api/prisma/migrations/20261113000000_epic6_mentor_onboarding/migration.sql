-- Estado persistente del asistente de configuración del mentor.
CREATE TABLE "mentor_onboarding" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "id_mentor" UUID NOT NULL,
    "paso_actual" INTEGER NOT NULL DEFAULT 1,
    "pasos_completados" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
    "finalizado_en" TIMESTAMPTZ(6),
    "fecha_creacion" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_actualizacion" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mentor_onboarding_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "mentor_onboarding_id_mentor_key" ON "mentor_onboarding"("id_mentor");

ALTER TABLE "mentor_onboarding"
    ADD CONSTRAINT "mentor_onboarding_id_mentor_fkey"
    FOREIGN KEY ("id_mentor") REFERENCES "mentor"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION;

-- La selección de áreas es un conjunto: se eliminan duplicados históricos antes
-- de reforzar la unicidad que garantiza la idempotencia y la concurrencia.
DELETE FROM "mentor_area" AS duplicate
USING "mentor_area" AS original
WHERE duplicate."id_mentor" = original."id_mentor"
  AND duplicate."id_area" = original."id_area"
  AND duplicate."ctid" > original."ctid";

CREATE UNIQUE INDEX "mentor_area_id_mentor_id_area_key" ON "mentor_area"("id_mentor", "id_area");
