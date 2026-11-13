CREATE INDEX "idx_solicitud_correo_reciente"
  ON "solicitud" ("fecha_creacion" DESC)
  WHERE "estado" IS NOT NULL AND "estado" <> 'borrador';