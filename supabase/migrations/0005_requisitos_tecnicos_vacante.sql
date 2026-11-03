CREATE TABLE IF NOT EXISTS requisito_tecnico_vacante (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_vacante UUID NOT NULL
        REFERENCES vacante(id) ON DELETE CASCADE,
    competencia VARCHAR(100) NOT NULL,
    competencia_clave VARCHAR(100) NOT NULL,
    nivel VARCHAR(30) NOT NULL
        CHECK (nivel IN ('Básico', 'Intermedio', 'Avanzado', 'Experto')),
    tipo VARCHAR(20) NOT NULL
        CHECK (tipo IN ('Obligatorio', 'Deseable')),
    descripcion VARCHAR(500),
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_requisito_tecnico_vacante_competencia
        UNIQUE (id_vacante, competencia_clave)
);

CREATE INDEX IF NOT EXISTS idx_requisito_tecnico_vacante_id
    ON requisito_tecnico_vacante (id_vacante, fecha_creacion, id);
