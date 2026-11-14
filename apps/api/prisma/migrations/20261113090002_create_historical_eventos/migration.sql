-- CreateTable
CREATE TABLE "historial_evento" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "id_solicitud" UUID NOT NULL,
    "version" SMALLINT NOT NULL,
    "tipo_actor" VARCHAR(20) NOT NULL,
    "actor_id" UUID,
    "accion" VARCHAR(50) NOT NULL,
    "detalle" TEXT,
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historial_evento_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "historial_evento" ADD CONSTRAINT "historial_evento_id_solicitud_fkey" FOREIGN KEY ("id_solicitud") REFERENCES "solicitud"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "historial_evento_id_solicitud_creado_en_idx" ON "historial_evento"("id_solicitud", "creado_en" DESC);
