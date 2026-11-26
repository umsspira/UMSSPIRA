ALTER TABLE "evento"
ADD COLUMN "anticipacion_recordatorio_horas" SMALLINT NOT NULL DEFAULT 24;

ALTER TABLE "evento"
ADD CONSTRAINT "evento_anticipacion_recordatorio_horas_check"
CHECK ("anticipacion_recordatorio_horas" BETWEEN 1 AND 72);
