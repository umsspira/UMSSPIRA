-- CreateTable
CREATE TABLE "mentor_interes_personalizado" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "id_mentor" UUID NOT NULL,
    "id_area" UUID NOT NULL,
    "nombre" VARCHAR(50) NOT NULL,
    "nombre_normalizado" VARCHAR(50) NOT NULL,
    "es_personalizado" BOOLEAN NOT NULL DEFAULT true,
    "fecha_creacion" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_actualizacion" TIMESTAMPTZ(6),

    CONSTRAINT "mentor_interes_personalizado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_mentor_area_interes_norm" ON "mentor_interes_personalizado"("id_mentor", "id_area", "nombre_normalizado");

-- CreateIndex
CREATE INDEX "idx_mentor_interes_personalizado_mentor" ON "mentor_interes_personalizado"("id_mentor");

-- CreateIndex
CREATE INDEX "idx_mentor_interes_personalizado_area" ON "mentor_interes_personalizado"("id_area");

-- CreateIndex
CREATE INDEX "idx_mentor_interes_personalizado_norm" ON "mentor_interes_personalizado"("nombre_normalizado");

-- AddForeignKey
ALTER TABLE "mentor_interes_personalizado" ADD CONSTRAINT "mentor_interes_personalizado_id_mentor_fkey" FOREIGN KEY ("id_mentor") REFERENCES "mentor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentor_interes_personalizado" ADD CONSTRAINT "mentor_interes_personalizado_id_area_fkey" FOREIGN KEY ("id_area") REFERENCES "area"("id") ON DELETE CASCADE ON UPDATE CASCADE;
