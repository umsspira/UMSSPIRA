-- HU-16 T16.2: almacenamiento privado del CV en PostgreSQL.
ALTER TABLE "curriculum_vitae"
  ADD COLUMN "nombre" VARCHAR(255),
  ADD COLUMN "contenido" BYTEA,
  ADD COLUMN "size_bytes" INTEGER,
  ADD COLUMN "fecha_subida" TIMESTAMPTZ(6);
