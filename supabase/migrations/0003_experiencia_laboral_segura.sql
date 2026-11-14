-- Adds the Supabase Auth -> usuario -> egresado identity mapping without
-- deleting or reassigning existing portal records.
ALTER TABLE usuario
    ADD COLUMN IF NOT EXISTS auth_user_id UUID
    REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_usuario_auth_user_id
    ON usuario(auth_user_id)
    WHERE auth_user_id IS NOT NULL;

ALTER TABLE egresado
    ADD COLUMN IF NOT EXISTS id_usuario UUID
    REFERENCES usuario(usuario_id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_egresado_id_usuario
    ON egresado(id_usuario)
    WHERE id_usuario IS NOT NULL;

ALTER TABLE experiencia_laboral
    ADD COLUMN IF NOT EXISTS descripcion TEXT;

ALTER TABLE experiencia_laboral
    ADD COLUMN IF NOT EXISTS tipo_empleo VARCHAR(80)
    NOT NULL DEFAULT 'No especificado';

ALTER TABLE experiencia_laboral
    ADD COLUMN IF NOT EXISTS es_actual BOOLEAN
    NOT NULL DEFAULT FALSE;

ALTER TABLE experiencia_laboral
    ADD COLUMN IF NOT EXISTS fecha_actualizacion TIMESTAMPTZ
    NOT NULL DEFAULT NOW();

-- Before this flag existed, a missing end date was the only indication that
-- an experience was ongoing.
UPDATE experiencia_laboral
SET es_actual = TRUE
WHERE fecha_fin IS NULL
  AND es_actual = FALSE;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'experiencia_laboral_fecha_fin_valida'
          AND conrelid = 'experiencia_laboral'::regclass
    ) THEN
        ALTER TABLE experiencia_laboral
            ADD CONSTRAINT experiencia_laboral_fecha_fin_valida
            CHECK (fecha_fin IS NULL OR fecha_fin >= fecha_inicio);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'experiencia_laboral_actual_sin_fecha_fin'
          AND conrelid = 'experiencia_laboral'::regclass
    ) THEN
        ALTER TABLE experiencia_laboral
            ADD CONSTRAINT experiencia_laboral_actual_sin_fecha_fin
            CHECK (
                (es_actual AND fecha_fin IS NULL)
                OR (NOT es_actual AND fecha_fin IS NOT NULL)
            );
    END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_experiencia_laboral_egresado
    ON experiencia_laboral(id_egresado);

CREATE OR REPLACE FUNCTION public.usuario_puede_acceder_experiencia(
    p_id_egresado UUID,
    p_escritura BOOLEAN DEFAULT FALSE
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM egresado e
        JOIN usuario u ON u.usuario_id = e.id_usuario
        WHERE e.id = p_id_egresado
          AND u.auth_user_id = auth.uid()
          AND (
              NOT p_escritura
              OR COALESCE(LOWER(u.rol), '') IN ('admin', 'egresado')
          )
    );
$$;

REVOKE ALL ON FUNCTION public.usuario_puede_acceder_experiencia(UUID, BOOLEAN)
    FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.usuario_puede_acceder_experiencia(UUID, BOOLEAN)
    TO authenticated;

ALTER TABLE experiencia_laboral ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS experiencia_laboral_select_propia
    ON experiencia_laboral;
CREATE POLICY experiencia_laboral_select_propia
    ON experiencia_laboral
    FOR SELECT TO authenticated
    USING (public.usuario_puede_acceder_experiencia(id_egresado));

DROP POLICY IF EXISTS experiencia_laboral_insert_propia
    ON experiencia_laboral;
CREATE POLICY experiencia_laboral_insert_propia
    ON experiencia_laboral
    FOR INSERT TO authenticated
    WITH CHECK (
        public.usuario_puede_acceder_experiencia(id_egresado, TRUE)
    );

DROP POLICY IF EXISTS experiencia_laboral_update_propia
    ON experiencia_laboral;
CREATE POLICY experiencia_laboral_update_propia
    ON experiencia_laboral
    FOR UPDATE TO authenticated
    USING (public.usuario_puede_acceder_experiencia(id_egresado, TRUE))
    WITH CHECK (
        public.usuario_puede_acceder_experiencia(id_egresado, TRUE)
    );

DROP POLICY IF EXISTS experiencia_laboral_delete_propia
    ON experiencia_laboral;
CREATE POLICY experiencia_laboral_delete_propia
    ON experiencia_laboral
    FOR DELETE TO authenticated
    USING (public.usuario_puede_acceder_experiencia(id_egresado, TRUE));

GRANT SELECT, INSERT, UPDATE, DELETE
    ON TABLE experiencia_laboral TO authenticated;
