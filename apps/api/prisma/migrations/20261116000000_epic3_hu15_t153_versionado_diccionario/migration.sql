
-- Épica 3 - Sprint 3
-- HU-15 / T15.3: Versionado del diccionario NLP.
-- Registro de versiones publicadas mediante seed controlado.

CREATE TABLE "public"."radar_diccionario_version" (
    "version" VARCHAR(50) NOT NULL,
    "fingerprint" VARCHAR(64) NOT NULL,
    "fecha_aplicacion" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "descripcion" TEXT,

    CONSTRAINT "radar_diccionario_version_pkey"
        PRIMARY KEY ("version"),

    CONSTRAINT "radar_diccionario_version_fingerprint_check"
        CHECK ("fingerprint" ~ '^[0-9a-f]{64}$')
);
