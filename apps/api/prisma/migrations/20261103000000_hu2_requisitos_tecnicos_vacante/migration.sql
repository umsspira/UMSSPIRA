BEGIN;

SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '120s';

ALTER TABLE public.vacante
    ADD COLUMN IF NOT EXISTS ubicacion VARCHAR(120),
    ADD COLUMN IF NOT EXISTS area VARCHAR(100),
    ADD COLUMN IF NOT EXISTS condiciones VARCHAR(2000);

CREATE TABLE public.requisito_tecnico_vacante (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_vacante UUID NOT NULL
        REFERENCES public.vacante(id) ON DELETE CASCADE,
    competencia VARCHAR(100) NOT NULL,
    competencia_clave VARCHAR(100) NOT NULL,
    nivel VARCHAR(30) NOT NULL
        CHECK (nivel IN ('Básico', 'Intermedio', 'Avanzado', 'Experto')),
    tipo VARCHAR(20) NOT NULL
        CHECK (tipo IN ('Obligatorio', 'Deseable')),
    descripcion VARCHAR(500),
    fecha_creacion TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_requisito_tecnico_vacante_competencia
        UNIQUE (id_vacante, competencia_clave)
);

CREATE INDEX idx_requisito_tecnico_vacante_id
    ON public.requisito_tecnico_vacante (id_vacante, fecha_creacion, id);

COMMIT;
