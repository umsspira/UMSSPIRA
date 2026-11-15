-- HU5-S1-03: persistencia atomica de vacantes y requisitos asociados.

ALTER TABLE vacante
    ADD COLUMN IF NOT EXISTS descripcion TEXT,
    ADD COLUMN IF NOT EXISTS ubicacion VARCHAR(120),
    ADD COLUMN IF NOT EXISTS area VARCHAR(100),
    ADD COLUMN IF NOT EXISTS condiciones TEXT;

ALTER TABLE vacante
    ALTER COLUMN created_at SET DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_vacante_empresa_created_at
    ON vacante (id_empresa, created_at DESC);

CREATE OR REPLACE FUNCTION crear_vacante_con_requisitos(
    p_id_empresa UUID,
    p_titulo VARCHAR,
    p_modalidad VARCHAR,
    p_descripcion TEXT,
    p_ubicacion VARCHAR,
    p_area VARCHAR,
    p_condiciones TEXT,
    p_requisitos TEXT[]
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_id_vacante UUID;
    v_id_requerimiento UUID;
    v_requisito TEXT;
    -- Provisional para HU3; Equipo 4 definirá el catálogo oficial de estados.
    v_estado_vacante_provisional CONSTANT VARCHAR := 'Disponible';
BEGIN
    IF NOT EXISTS (SELECT 1 FROM empresa WHERE id = p_id_empresa) THEN
        RAISE EXCEPTION 'EMPRESA_NO_EXISTE' USING ERRCODE = '23503';
    END IF;

    IF cardinality(COALESCE(p_requisitos, ARRAY[]::TEXT[])) = 0 THEN
        RAISE EXCEPTION 'REQUISITOS_VACIOS' USING ERRCODE = '22023';
    END IF;

    INSERT INTO vacante (
        id_empresa,
        titulo,
        modalidad,
        estado,
        created_at,
        descripcion,
        ubicacion,
        area,
        condiciones
    )
    VALUES (
        p_id_empresa,
        BTRIM(p_titulo),
        BTRIM(p_modalidad),
        v_estado_vacante_provisional,
        NOW(),
        BTRIM(p_descripcion),
        BTRIM(p_ubicacion),
        BTRIM(p_area),
        NULLIF(BTRIM(p_condiciones), '')
    )
    RETURNING id INTO v_id_vacante;

    FOREACH v_requisito IN ARRAY p_requisitos LOOP
        IF NULLIF(BTRIM(v_requisito), '') IS NULL THEN
            RAISE EXCEPTION 'REQUISITO_INVALIDO' USING ERRCODE = '22023';
        END IF;

        INSERT INTO requerimiento_laboral (
            id_empresa,
            titulo,
            fecha_publicacion
        )
        VALUES (
            p_id_empresa,
            BTRIM(v_requisito),
            NOW()
        )
        RETURNING id INTO v_id_requerimiento;

        INSERT INTO vacante_requerimiento_laboral (
            id_vacante,
            id_requerimiento_laboral
        )
        VALUES (v_id_vacante, v_id_requerimiento);
    END LOOP;

    RETURN v_id_vacante;
END;
$$;

CREATE OR REPLACE FUNCTION agregar_requisitos_vacante(
    p_id_vacante UUID,
    p_requisitos TEXT[]
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_id_empresa UUID;
    v_id_requerimiento UUID;
    v_requisito TEXT;
BEGIN
    SELECT id_empresa
    INTO v_id_empresa
    FROM vacante
    WHERE id = p_id_vacante;

    IF v_id_empresa IS NULL THEN
        RAISE EXCEPTION 'VACANTE_NO_EXISTE' USING ERRCODE = '23503';
    END IF;

    IF cardinality(COALESCE(p_requisitos, ARRAY[]::TEXT[])) = 0 THEN
        RAISE EXCEPTION 'REQUISITOS_VACIOS' USING ERRCODE = '22023';
    END IF;

    FOREACH v_requisito IN ARRAY p_requisitos LOOP
        IF NULLIF(BTRIM(v_requisito), '') IS NULL THEN
            RAISE EXCEPTION 'REQUISITO_INVALIDO' USING ERRCODE = '22023';
        END IF;

        IF EXISTS (
            SELECT 1
            FROM vacante_requerimiento_laboral vrl
            INNER JOIN requerimiento_laboral rl
                ON rl.id = vrl.id_requerimiento_laboral
            WHERE vrl.id_vacante = p_id_vacante
              AND LOWER(BTRIM(rl.titulo)) = LOWER(BTRIM(v_requisito))
        ) THEN
            RAISE EXCEPTION 'REQUISITO_DUPLICADO' USING ERRCODE = '22023';
        END IF;

        INSERT INTO requerimiento_laboral (
            id_empresa,
            titulo,
            fecha_publicacion
        )
        VALUES (
            v_id_empresa,
            BTRIM(v_requisito),
            NOW()
        )
        RETURNING id INTO v_id_requerimiento;

        INSERT INTO vacante_requerimiento_laboral (
            id_vacante,
            id_requerimiento_laboral
        )
        VALUES (p_id_vacante, v_id_requerimiento);
    END LOOP;
END;
$$;
