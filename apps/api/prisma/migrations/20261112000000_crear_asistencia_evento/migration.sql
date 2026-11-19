BEGIN;

CREATE TABLE "asistencia_evento" (
    "id_inscripcion" UUID NOT NULL,
    "id_usuario_registro" UUID NOT NULL,
    "fecha_asistencia" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asistencia_evento_pkey" PRIMARY KEY ("id_inscripcion")
);

ALTER TABLE "asistencia_evento"
    ADD CONSTRAINT "asistencia_evento_id_inscripcion_fkey"
    FOREIGN KEY ("id_inscripcion") REFERENCES "inscripcion_evento"("id")
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "asistencia_evento"
    ADD CONSTRAINT "asistencia_evento_id_usuario_registro_fkey"
    FOREIGN KEY ("id_usuario_registro") REFERENCES "usuario"("usuario_id")
    ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Las asistencias privadas se consultan mediante la API, siguiendo la protección de pase_qr.
ALTER TABLE "asistencia_evento" ENABLE ROW LEVEL SECURITY;

COMMIT;
