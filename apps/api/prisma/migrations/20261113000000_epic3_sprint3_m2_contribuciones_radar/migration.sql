
-- Épica 3 - Sprint 3 - Migración M2
-- T13.1: Contribuciones de keywords por área y versión del diccionario.
-- Migración aditiva: conserva registros y relaciones existentes.

ALTER TABLE "public"."calculo_radar"
    ADD COLUMN "version_diccionario" VARCHAR(50);

ALTER TABLE "public"."afinidad_radar"
    ADD COLUMN "contribuciones_keyword" JSONB;