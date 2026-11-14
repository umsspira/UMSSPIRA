BEGIN;

CREATE TABLE public.empresa_invitacion (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    id_empresa UUID NOT NULL,
    correo VARCHAR(254) NOT NULL,
    rol VARCHAR(20) NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    token_hash TEXT NOT NULL,
    creado_por UUID NOT NULL,
    creado_en TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    expira_en TIMESTAMPTZ(6) NOT NULL,
    aceptado_en TIMESTAMPTZ(6),

    CONSTRAINT empresa_invitacion_pkey PRIMARY KEY (id),
    CONSTRAINT chk_empresa_invitacion_correo CHECK (length(btrim(correo)) > 0),
    CONSTRAINT chk_empresa_invitacion_fechas CHECK (expira_en > creado_en),
    CONSTRAINT empresa_invitacion_estado_check
        CHECK (estado IN ('pendiente', 'aceptada', 'cancelada', 'vencida')),
    CONSTRAINT empresa_invitacion_rol_check
        CHECK (rol IN ('administrador', 'reclutador')),
    CONSTRAINT empresa_invitacion_id_empresa_fkey
        FOREIGN KEY (id_empresa) REFERENCES public.empresa(id)
        ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT empresa_invitacion_creado_por_fkey
        FOREIGN KEY (creado_por) REFERENCES public.usuario(usuario_id)
        ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX empresa_invitacion_token_hash_key
    ON public.empresa_invitacion(token_hash);
CREATE INDEX idx_empresa_invitacion_empresa
    ON public.empresa_invitacion(id_empresa);
CREATE INDEX idx_empresa_invitacion_estado
    ON public.empresa_invitacion(id_empresa, estado);

-- Este índice parcial con expresión se conserva en SQL; no equivale a @@unique en Prisma.
CREATE UNIQUE INDEX idx_empresa_invitacion_pendiente
    ON public.empresa_invitacion(id_empresa, lower(correo))
    WHERE estado = 'pendiente';

CREATE TABLE public.empresa_usuario (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    id_empresa UUID NOT NULL,
    id_usuario UUID NOT NULL,
    rol VARCHAR(20) NOT NULL DEFAULT 'reclutador',
    estado VARCHAR(20) NOT NULL DEFAULT 'activo',
    fecha_asignacion TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    fecha_desactivacion TIMESTAMPTZ(6),

    CONSTRAINT empresa_usuario_pkey PRIMARY KEY (id),
    CONSTRAINT chk_e4_usuario_estado CHECK (estado IN ('activo', 'inactivo')),
    CONSTRAINT chk_e4_usuario_rol CHECK (rol IN ('administrador', 'reclutador')),
    CONSTRAINT chk_e4_usuario_fecha
        CHECK (fecha_desactivacion IS NULL OR fecha_desactivacion >= fecha_asignacion),
    CONSTRAINT empresa_usuario_id_empresa_fkey
        FOREIGN KEY (id_empresa) REFERENCES public.empresa(id)
        ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT empresa_usuario_id_usuario_fkey
        FOREIGN KEY (id_usuario) REFERENCES public.usuario(usuario_id)
        ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX uq_e4_empresa_usuario
    ON public.empresa_usuario(id_empresa, id_usuario);
CREATE INDEX idx_e4_empresa_usuario_estado
    ON public.empresa_usuario(id_empresa, estado);
CREATE INDEX idx_e4_empresa_usuario_usuario
    ON public.empresa_usuario(id_usuario);

-- Conserva los propietarios actuales y añade su membresía sin cambiar empresa.id_usuario.
INSERT INTO public.empresa_usuario (id_empresa, id_usuario, rol, estado)
SELECT id, id_usuario, 'administrador', 'activo'
FROM public.empresa
WHERE id_usuario IS NOT NULL
ON CONFLICT (id_empresa, id_usuario) DO NOTHING;

COMMIT;
