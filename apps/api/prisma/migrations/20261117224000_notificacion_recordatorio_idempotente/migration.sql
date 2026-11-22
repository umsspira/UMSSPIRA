ALTER TABLE "notificacion_evento"
ADD COLUMN "id_recordatorio" UUID;

ALTER TABLE "notificacion_evento"
ADD CONSTRAINT "notificacion_evento_recordatorio_fkey"
FOREIGN KEY ("id_recordatorio") REFERENCES "recordatorio_evento"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "notificacion_evento_recordatorio_usuario_key"
ON "notificacion_evento"("id_recordatorio", "id_usuario");
