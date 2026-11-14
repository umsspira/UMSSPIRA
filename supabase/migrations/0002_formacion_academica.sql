-- HU3: Registrar formación académica.
-- Requiere que las tablas egresado e carrera ya existan.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS formacion_academica (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_egresado UUID NOT NULL REFERENCES egresado(id) ON DELETE CASCADE,
    id_carrera UUID REFERENCES carrera(id),
    tipo_formacion VARCHAR(20) NOT NULL,
    institucion VARCHAR(150) NOT NULL,
    titulo VARCHAR(150) NOT NULL,
    nivel_academico VARCHAR(50) NOT NULL,
    estado VARCHAR(20) NOT NULL,
    anio_inicio SMALLINT NOT NULL,
    anio_fin SMALLINT,
    anio_egreso SMALLINT,
    descripcion VARCHAR(250),
    fecha_creacion TIMESTAMP DEFAULT NOW()
);

-- Añade las columnas que faltan si la tabla ya existía.
ALTER TABLE formacion_academica
    ADD COLUMN IF NOT EXISTS id_carrera UUID REFERENCES carrera(id);

ALTER TABLE formacion_academica
    ADD COLUMN IF NOT EXISTS tipo_formacion VARCHAR(20);

ALTER TABLE formacion_academica
    ADD COLUMN IF NOT EXISTS nivel_academico VARCHAR(50);

ALTER TABLE formacion_academica
    ADD COLUMN IF NOT EXISTS estado VARCHAR(20);

ALTER TABLE formacion_academica
    ADD COLUMN IF NOT EXISTS anio_inicio SMALLINT;

ALTER TABLE formacion_academica
    ADD COLUMN IF NOT EXISTS anio_fin SMALLINT;

ALTER TABLE formacion_academica
    ADD COLUMN IF NOT EXISTS descripcion VARCHAR(250);

ALTER TABLE formacion_academica
    ADD COLUMN IF NOT EXISTS fecha_creacion TIMESTAMP DEFAULT NOW();

ALTER TABLE formacion_academica
    ADD COLUMN IF NOT EXISTS anio_egreso SMALLINT;

-- Permite registrar estudios que todavía están en curso.
ALTER TABLE formacion_academica
    ALTER COLUMN anio_egreso DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_formacion_academica_egresado
    ON formacion_academica(id_egresado);