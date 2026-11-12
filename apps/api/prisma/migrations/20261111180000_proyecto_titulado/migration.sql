-- HU-19 Proyectos y portafolio: proyectos del titulado (nombre, enlace https y descripción corta)
-- Migración aditiva: solo crea la tabla, no toca datos existentes.

-- CreateTable
CREATE TABLE "proyecto" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "id_titulado" UUID NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "url" VARCHAR(2048) NOT NULL,
    "descripcion" VARCHAR(300),
    "fecha_creacion" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_actualizacion" TIMESTAMPTZ(6),

    CONSTRAINT "proyecto_pkey" PRIMARY KEY ("id"),
    -- El enlace siempre es https (la API valida además que sea una URL válida)
    CONSTRAINT "proyecto_url_https_check" CHECK ("url" LIKE 'https://%')
);

-- CreateIndex: listar los proyectos de un titulado del más reciente al más antiguo
CREATE INDEX "proyecto_id_titulado_fecha_creacion_idx" ON "proyecto"("id_titulado", "fecha_creacion" DESC);

-- AddForeignKey: al borrar el titulado se borran sus proyectos
ALTER TABLE "proyecto" ADD CONSTRAINT "proyecto_id_titulado_fkey" FOREIGN KEY ("id_titulado") REFERENCES "titulado"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Solo el backend accede a la tabla; sin acceso directo desde la Data API
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
