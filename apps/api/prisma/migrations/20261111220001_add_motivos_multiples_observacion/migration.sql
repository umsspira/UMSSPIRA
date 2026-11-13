
-- Crear tabla de motivos
CREATE TABLE "motivo_observacion" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(50) NOT NULL,
    "etiqueta" VARCHAR(255) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "motivo_observacion_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "motivo_observacion_codigo_key" ON "motivo_observacion"("codigo");

-- Crear tabla puente dictamen_motivo
CREATE TABLE "dictamen_motivo" (
    "id_dictamen" UUID NOT NULL,
    "id_motivo" INTEGER NOT NULL,
    CONSTRAINT "dictamen_motivo_pkey" PRIMARY KEY ("id_dictamen","id_motivo")
);
ALTER TABLE "dictamen_motivo" ADD CONSTRAINT "dictamen_motivo_id_dictamen_fkey" FOREIGN KEY ("id_dictamen") REFERENCES "dictamen"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dictamen_motivo" ADD CONSTRAINT "dictamen_motivo_id_motivo_fkey" FOREIGN KEY ("id_motivo") REFERENCES "motivo_observacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Insertar los motivos que te pasó el equipo
INSERT INTO "motivo_observacion" ("codigo", "etiqueta") VALUES
  ('documento_ilegible', 'Documento ilegible o borroso'),
  ('datos_no_coinciden', 'Datos declarados no coinciden con el respaldo (nombre, CI, carrera o fechas)'),
  ('documento_incompleto', 'Documento de respaldo incompleto o formato no válido'),
  ('otro_motivo', 'Otro motivo (requiere explicación en la nota)')
ON CONFLICT ("codigo") DO NOTHING;