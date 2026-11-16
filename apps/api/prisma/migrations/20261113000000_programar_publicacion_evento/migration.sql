ALTER TABLE "evento"
  ADD COLUMN "fecha_publicacion_programada" TIMESTAMPTZ(6),
  ADD COLUMN "estado_programacion" VARCHAR(20);

CREATE INDEX "evento_publicacion_programada_idx"
  ON "evento" ("estado_programacion", "fecha_publicacion_programada");
