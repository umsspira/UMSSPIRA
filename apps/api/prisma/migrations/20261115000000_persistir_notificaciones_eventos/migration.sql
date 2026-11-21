CREATE TABLE "notificacion_evento" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "id_usuario" UUID NOT NULL,
  "id_evento" UUID,
  "titulo" VARCHAR(160) NOT NULL,
  "cuerpo" TEXT NOT NULL,
  "url" TEXT,
  "leida_en" TIMESTAMPTZ(6),
  "fecha_creacion" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notificacion_evento_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "notificacion_evento_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("usuario_id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "notificacion_evento_evento_fkey" FOREIGN KEY ("id_evento") REFERENCES "evento"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "notificacion_evento_usuario_fecha_idx"
  ON "notificacion_evento"("id_usuario", "fecha_creacion" DESC);
CREATE INDEX "notificacion_evento_usuario_leida_fecha_idx"
  ON "notificacion_evento"("id_usuario", "leida_en", "fecha_creacion" DESC);
