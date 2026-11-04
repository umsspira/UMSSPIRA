---------------------------------------- Creación de la tabla de formación académica para la HU3-------------
CREATE TABLE IF NOT EXISTS formacion_academica (
    id SERIAL PRIMARY KEY,
    egresado_id UUID NOT NULL, -- Relación con el perfil del usuario/egresado
    institucion_educativa VARCHAR(150) NOT NULL,
    carrera_programa VARCHAR(150) NOT NULL,
    grado_nivel VARCHAR(100) NOT NULL,
    estado VARCHAR(50) NOT NULL CHECK (estado IN ('Concluido', 'En curso', 'Titulado', 'Graduado')),
    anio_inicio INT NOT NULL CHECK (anio_inicio >= 1950 AND anio_inicio <= 2100),
    anio_finalizacion INT CHECK (anio_finalizacion IS NULL OR (anio_finalizacion >= 1950 AND anio_finalizacion <= 2100)),
    actualmente_cursando BOOLEAN DEFAULT FALSE,
    descripcion TEXT,
    
    -- Validación lógica: El año de finalización no puede ser menor al año de inicio (si no está cursando actualmente)
    CONSTRAINT chk_anios_formacion CHECK (
        actualmente_cursando = TRUE OR anio_finalizacion IS NULL OR anio_finalizacion >= anio_inicio
    )
);

-- Índices para mejorar la búsqueda y rendimiento en Supabase
CREATE INDEX IF NOT EXISTS idx_formacion_egresado ON formacion_academica(egresado_id);

-- Comentarios para documentación en la base de datos
COMMENT ON TABLE formacion_academica IS 'Almacena el registro de formación académica, carreras, títulos o posgrados de los egresados (HU3).';
COMMENT ON COLUMN formacion_academica.actualmente_cursando IS 'Indica si el estudio está en curso; si es true, anio_finalizacion debe ser nulo.';