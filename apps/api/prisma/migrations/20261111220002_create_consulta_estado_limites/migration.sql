CREATE TABLE "consulta_estado_solicitud" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "correo_normalizado" VARCHAR(255) NOT NULL,
    "origen_hash" VARCHAR(64) NOT NULL,
    "id_solicitud" UUID,
    "resultado" VARCHAR(30) NOT NULL,
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "consulta_estado_solicitud_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "consulta_estado_solicitud" 
  ADD CONSTRAINT "consulta_estado_solicitud_id_solicitud_fkey" 
  FOREIGN KEY ("id_solicitud") REFERENCES "solicitud"("id") 
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "idx_ces_correo_ventana" ON "consulta_estado_solicitud"("correo_normalizado", "creado_en" DESC);
CREATE INDEX "idx_ces_origen_ventana" ON "consulta_estado_solicitud"("origen_hash", "creado_en" DESC);

CREATE INDEX "idx_solicitud_correo_reciente"
  ON "solicitud" ("fecha_creacion" DESC)
  WHERE "estado" IS NOT NULL AND "estado" <> 'borrador';