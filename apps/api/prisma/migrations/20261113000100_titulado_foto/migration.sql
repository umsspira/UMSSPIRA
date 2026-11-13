-- HU-16: foto de perfil del titulado (una por titulado, JPG de hasta 5 MB)
-- CreateTable
CREATE TABLE "titulado_foto" (
    "id_titulado" UUID NOT NULL,
    "mime" VARCHAR(50) NOT NULL,
    "contenido" BYTEA NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "fecha_subida" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "titulado_foto_pkey" PRIMARY KEY ("id_titulado")
);

-- AddForeignKey
ALTER TABLE "titulado_foto" ADD CONSTRAINT "titulado_foto_id_titulado_fkey" FOREIGN KEY ("id_titulado") REFERENCES "titulado"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- Solo la API accede a la tabla, sin acceso directo desde la Data API
ALTER TABLE public.titulado_foto ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.titulado_foto FROM PUBLIC;
DO $$
DECLARE role_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon','authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname=role_name) THEN
      EXECUTE format('REVOKE ALL ON TABLE public.titulado_foto FROM %I', role_name);
    END IF;
  END LOOP;
END $$;
