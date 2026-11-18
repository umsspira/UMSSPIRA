CREATE TABLE "recordatorio_evento" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "id_inscripcion" UUID NOT NULL,
  "id_evento" UUID NOT NULL,
  "programado_para" TIMESTAMPTZ(6) NOT NULL,
  "estado" VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
  "intentos" INTEGER NOT NULL DEFAULT 0,
  "error" TEXT,
  "enviado_en" TIMESTAMPTZ(6),
  "reintentar_en" TIMESTAMPTZ(6),
  "procesando_desde" TIMESTAMPTZ(6),
  CONSTRAINT "recordatorio_evento_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "recordatorio_evento_inscripcion_fkey" FOREIGN KEY ("id_inscripcion") REFERENCES "inscripcion_evento"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "recordatorio_evento_evento_fkey" FOREIGN KEY ("id_evento") REFERENCES "evento"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "recordatorio_evento_inscripcion_programado_key" ON "recordatorio_evento"("id_inscripcion", "programado_para");
CREATE INDEX "recordatorio_evento_estado_programado_idx" ON "recordatorio_evento"("estado", "programado_para");

CREATE TABLE "configuracion_recordatorios" (
  "id" INTEGER NOT NULL DEFAULT 1,
  "anticipacion_horas" INTEGER NOT NULL DEFAULT 24,
  "actualizada_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "configuracion_recordatorios_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "configuracion_recordatorios_id_unico" CHECK ("id" = 1),
  CONSTRAINT "configuracion_recordatorios_horas_validas" CHECK ("anticipacion_horas" BETWEEN 1 AND 720)
);

INSERT INTO "configuracion_recordatorios" ("id", "anticipacion_horas") VALUES (1, 24);

ALTER TABLE "evento" ADD COLUMN "enlace_virtual" TEXT;

CREATE TABLE "recordatorio_entrega" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "id_recordatorio" UUID NOT NULL,
  "id_dispositivo" UUID NOT NULL,
  "estado" VARCHAR(20) NOT NULL,
  "intentos" INTEGER NOT NULL DEFAULT 1,
  "error" TEXT,
  "enviado_en" TIMESTAMPTZ(6),
  CONSTRAINT "recordatorio_entrega_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "recordatorio_entrega_recordatorio_fkey" FOREIGN KEY ("id_recordatorio") REFERENCES "recordatorio_evento"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "recordatorio_entrega_dispositivo_fkey" FOREIGN KEY ("id_dispositivo") REFERENCES "dispositivo"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "recordatorio_entrega_recordatorio_dispositivo_key" ON "recordatorio_entrega"("id_recordatorio", "id_dispositivo");
