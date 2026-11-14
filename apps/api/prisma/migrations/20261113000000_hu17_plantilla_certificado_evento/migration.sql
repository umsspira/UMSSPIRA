BEGIN;

CREATE TABLE "plantilla_certificado_evento" (
    "id" UUID NOT NULL,
    "id_evento" UUID NOT NULL,
    "id_usuario" UUID NOT NULL,
    "nombre" VARCHAR(255) NOT NULL,
    "mime" VARCHAR(50) NOT NULL,
    "contenido" BYTEA NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "estado" VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
    "fecha_creacion" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_activacion" TIMESTAMPTZ(6),

    CONSTRAINT "plantilla_certificado_evento_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "plantilla_certificado_evento_id_evento_estado_idx"
    ON "plantilla_certificado_evento"("id_evento", "estado");

CREATE INDEX "plantilla_certificado_evento_id_usuario_idx"
    ON "plantilla_certificado_evento"("id_usuario");

-- Un evento tiene como máximo una plantilla ACTIVA y una PENDIENTE a la vez.
-- Esto evita duplicados ante cargas o confirmaciones simultáneas.
CREATE UNIQUE INDEX "plantilla_certificado_evento_activa_key"
    ON "plantilla_certificado_evento"("id_evento") WHERE "estado" = 'ACTIVA';

CREATE UNIQUE INDEX "plantilla_certificado_evento_pendiente_key"
    ON "plantilla_certificado_evento"("id_evento") WHERE "estado" = 'PENDIENTE';

ALTER TABLE "plantilla_certificado_evento"
    ADD CONSTRAINT "plantilla_certificado_evento_id_evento_fkey"
    FOREIGN KEY ("id_evento") REFERENCES "evento"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "plantilla_certificado_evento"
    ADD CONSTRAINT "plantilla_certificado_evento_id_usuario_fkey"
    FOREIGN KEY ("id_usuario") REFERENCES "usuario"("usuario_id")
    ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE "plantilla_certificado_evento"
    ADD CONSTRAINT "plantilla_certificado_evento_estado_check"
    CHECK ("estado" IN ('PENDIENTE', 'ACTIVA', 'REEMPLAZADA'));

ALTER TABLE "plantilla_certificado_evento"
    ADD CONSTRAINT "plantilla_certificado_evento_size_check"
    CHECK ("size_bytes" > 0 AND "size_bytes" <= 5242880 AND octet_length("contenido") = "size_bytes");

-- Solo la API accede a los bytes y comprueba que el evento pertenezca al administrador.
ALTER TABLE "plantilla_certificado_evento" ENABLE ROW LEVEL SECURITY;

COMMIT;