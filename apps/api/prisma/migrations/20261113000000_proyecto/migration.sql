-- HU-19: proyectos y portafolio del titulado
-- CreateTable
CREATE TABLE "proyecto" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "id_titulado" UUID NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "enlace" VARCHAR(500) NOT NULL,
    "descripcion" VARCHAR(500) NOT NULL,
    "tecnologias" VARCHAR(300),
    "fecha_creacion" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proyecto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "proyecto_id_titulado_idx" ON "proyecto"("id_titulado");

-- AddForeignKey
ALTER TABLE "proyecto" ADD CONSTRAINT "proyecto_id_titulado_fkey" FOREIGN KEY ("id_titulado") REFERENCES "titulado"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- Solo la API accede a la tabla, sin acceso directo desde la Data API
ALTER TABLE public.proyecto ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.proyecto FROM PUBLIC;
DO $$
DECLARE role_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon','authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname=role_name) THEN
      EXECUTE format('REVOKE ALL ON TABLE public.proyecto FROM %I', role_name);
    END IF;
  END LOOP;
END $$;
