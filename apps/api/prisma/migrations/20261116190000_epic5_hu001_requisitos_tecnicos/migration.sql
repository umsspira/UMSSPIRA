BEGIN;

CREATE TABLE IF NOT EXISTS public.vacante_requisito_tecnico (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    id_vacante UUID NOT NULL,
    nombre TEXT NOT NULL,
    nombre_normalizado TEXT NOT NULL,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT vacante_requisito_tecnico_pkey PRIMARY KEY (id),
    CONSTRAINT vacante_requisito_tecnico_id_vacante_fkey
        FOREIGN KEY (id_vacante) REFERENCES public.vacante(id)
        ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_vacante_requisito_tecnico_vacante_normalizado
    ON public.vacante_requisito_tecnico (id_vacante, nombre_normalizado);

COMMIT;
