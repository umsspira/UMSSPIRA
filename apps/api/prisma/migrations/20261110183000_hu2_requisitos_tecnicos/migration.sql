BEGIN;

SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '120s';

CREATE TABLE public.vacante_requisito_tecnico (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  id_vacante uuid NOT NULL,
  competencia_tecnica varchar(120) NOT NULL,
  competencia_normalizada varchar(120) NOT NULL,
  nivel_esperado varchar(20) NOT NULL,
  tipo varchar(20) NOT NULL,
  descripcion varchar(500),
  creado_en timestamptz(6) NOT NULL DEFAULT now(),
  actualizado_en timestamptz(6) NOT NULL DEFAULT now(),
  CONSTRAINT vacante_requisito_tecnico_pkey PRIMARY KEY (id),
  CONSTRAINT vacante_requisito_tecnico_id_vacante_fkey
    FOREIGN KEY (id_vacante) REFERENCES public.vacante(id)
    ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT uq_vacante_requisito_tecnico_competencia
    UNIQUE (id_vacante, competencia_normalizada),
  CONSTRAINT ck_vacante_requisito_tecnico_nivel
    CHECK (nivel_esperado IN ('BASICO', 'INTERMEDIO', 'AVANZADO')),
  CONSTRAINT ck_vacante_requisito_tecnico_tipo
    CHECK (tipo IN ('OBLIGATORIO', 'DESEABLE')),
  CONSTRAINT ck_vacante_requisito_tecnico_competencia_no_vacia
    CHECK (length(btrim(competencia_tecnica)) > 0),
  CONSTRAINT ck_vacante_requisito_tecnico_normalizada_no_vacia
    CHECK (length(btrim(competencia_normalizada)) > 0)
);

COMMIT;
