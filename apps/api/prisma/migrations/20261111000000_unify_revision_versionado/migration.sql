-- 0013_unify_revision_versionado/migration.sql
ALTER TABLE "solicitud"
  ADD COLUMN "version_vigente" SMALLINT NOT NULL DEFAULT 1;

-- Backfill: la versión vigente es la máxima numero_version registrada
UPDATE "solicitud" s
SET "version_vigente" = COALESCE(
  (SELECT MAX(sv."numero_version") FROM "solicitud_version" sv WHERE sv."id_solicitud" = s."id"),
  1
);

ALTER TABLE "documento_respaldo"
  ADD COLUMN "es_vigente" BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE "dictamen"
  ADD COLUMN "version_dictaminada" SMALLINT;

CREATE INDEX "idx_solicitud_version_vigente"
  ON "solicitud" ("id", "version_vigente");