-- ============================================================================
-- UMSSPIRA — Usuarios QA: titulados y titulados mentores
-- ----------------------------------------------------------------------------
-- QUÉ HACE
--   Crea 6 cuentas de prueba listas para usar (3 titulados y 3 titulados
--   mentores), cada una con el perfil COMPLETO:
--     - usuario (estado ACTIVO, rol 'titulado') + cuenta_acceso (Argon2id)
--     - titulado (datos personales, CI, cod_sis, carrera)
--     - curriculum_vitae, formacion_academica, experiencia_laboral,
--       certificacion y perfil_area
--     - los mentores además: mentor, mentor_area, disponibilidad_mentor y
--       espacio_disponible_mentor (lunes a viernes)
--   NOTA: en UMSSPIRA el rol de mentor no existe como tal; un "titulado mentor"
--   es un usuario con rol 'titulado' que además tiene fila en la tabla mentor.
--
-- CÓMO EJECUTARLO
--   1. La base debe tener el esquema aplicado (migrations de Prisma).
--   2. Pegar este archivo completo en el SQL Editor de Supabase y darle "Run".
--      Se ejecuta dentro de una transacción: o se aplica todo o no se aplica nada.
--   3. Es re-ejecutable: si las cuentas ya existen, no duplica nada (usa IDs
--      fijos y ON CONFLICT DO NOTHING).
--
-- CREDENCIALES (también se imprimen en la consulta final del script)
--   +-----------------------------+----------------+--------------------+
--   | Correo                      | Contraseña     | Perfil             |
--   +-----------------------------+----------------+--------------------+
--   | qa.titulado1@umss.edu.bo    | qaTitulado1!   | Titulado           |
--   | qa.titulado2@umss.edu.bo    | qaTitulado2!   | Titulado           |
--   | qa.titulado3@umss.edu.bo    | qaTitulado3!   | Titulado           |
--   | qa.mentor1@umss.edu.bo      | qaMentor1!     | Titulado mentor    |
--   | qa.mentor2@umss.edu.bo      | qaMentor2!     | Titulado mentor    |
--   | qa.mentor3@umss.edu.bo      | qaMentor3!     | Titulado mentor    |
--   +-----------------------------+----------------+--------------------+
--
-- CONTRASEÑAS
--   Los password_hash de cuenta_acceso son Argon2id precalculados con los
--   MISMOS parámetros que usa el API (argon2id, memoryCost=65536, timeCost=3,
--   parallelism=1; ver apps/api/src/modules/auth/infrastructure/security/
--   argon2-password.hasher.ts). El login los acepta directamente.
--   Para GENERAR un hash nuevo (p. ej. para rotar una contraseña):
--     cd apps/api && node -e "require('argon2').hash('NuevaClave123!',{type:require('argon2').argon2id,memoryCost:65536,timeCost:3,parallelism:1}).then(console.log)"
--   y aplicarlo con (el incremento de version cierra las sesiones abiertas):
--     UPDATE cuenta_acceso SET password_hash = '<hash>', version = version + 1
--      WHERE id_usuario = '<usuario_id>';
--
-- CATÁLOGOS
--   Si faltan, el script crea: carrera 'Ingeniería de Sistemas', tipo_archivo
--   'PDF', las áreas de trabajo y el rol 'titulado' con sus 9 permisos. Si ya
--   existen (p. ej. tras pnpm --filter api db:seed:demo), no toca nada.
--
-- RESPALDOS DE ARCHIVOS
--   curriculum_vitae apunta a una ruta de ejemplo y las certificaciones quedan
--   en 'sin_respaldo' (igual que la semilla demo): los respaldos se suben por
--   la UI/app y así QA puede probar esos flujos desde cero.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 0. PRECAUCIÓN: si un correo ya pertenece a otra cuenta, se aborta con un
--    mensaje claro en lugar de fallar más adelante con un error de FK.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_correo TEXT;
  v_esperado UUID;
BEGIN
  FOR v_correo, v_esperado IN
    SELECT t.correo, t.usuario_id FROM (VALUES
      ('qa.titulado1@umss.edu.bo', '99000000-0000-4000-8000-000000000001'::uuid),
      ('qa.titulado2@umss.edu.bo', '99000000-0000-4000-8000-000000000002'::uuid),
      ('qa.titulado3@umss.edu.bo', '99000000-0000-4000-8000-000000000003'::uuid),
      ('qa.mentor1@umss.edu.bo',   '99000000-0000-4000-8000-000000000004'::uuid),
      ('qa.mentor2@umss.edu.bo',   '99000000-0000-4000-8000-000000000005'::uuid),
      ('qa.mentor3@umss.edu.bo',   '99000000-0000-4000-8000-000000000006'::uuid)
    ) AS t(correo, usuario_id)
  LOOP
    IF EXISTS (
      SELECT 1 FROM usuario u
      WHERE u.correo = v_correo AND u.usuario_id <> v_esperado
    ) THEN
      RAISE EXCEPTION 'El correo % ya pertenece a otra cuenta; abortando.', v_correo;
    END IF;
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 1. CATÁLOGOS (solo se insertan los que falten)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  -- Carrera
  IF NOT EXISTS (SELECT 1 FROM carrera WHERE nombre = 'Ingeniería de Sistemas') THEN
    INSERT INTO carrera (id, nombre)
    VALUES ('10000000-0000-4000-8000-000000000001', 'Ingeniería de Sistemas');
  END IF;

  -- Tipo de archivo (para el CV)
  IF NOT EXISTS (SELECT 1 FROM tipo_archivo WHERE nombre = 'PDF') THEN
    INSERT INTO tipo_archivo (id, nombre)
    VALUES ('01000000-0000-4000-8000-000000000001', 'PDF');
  END IF;

  -- Áreas raíz
  IF NOT EXISTS (SELECT 1 FROM area WHERE nombre = 'Tecnología') THEN
    INSERT INTO area (id, nombre, padre_id, esta_activo, fecha_creacion)
    VALUES ('60000000-0000-4000-8000-000000000001', 'Tecnología', NULL, true, CURRENT_DATE);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM area WHERE nombre = 'Gestión') THEN
    INSERT INTO area (id, nombre, padre_id, esta_activo, fecha_creacion)
    VALUES ('60000000-0000-4000-8000-000000000002', 'Gestión', NULL, true, CURRENT_DATE);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM area WHERE nombre = 'Desarrollo de software') THEN
    INSERT INTO area (id, nombre, padre_id, esta_activo, fecha_creacion)
    VALUES ('60000000-0000-4000-8000-000000000003', 'Desarrollo de software', NULL, true, CURRENT_DATE);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM area WHERE nombre = 'Cloud/DevOps') THEN
    INSERT INTO area (id, nombre, padre_id, esta_activo, fecha_creacion)
    VALUES ('60000000-0000-4000-8000-000000000006', 'Cloud/DevOps', NULL, true, CURRENT_DATE);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM area WHERE nombre = 'Ciencia de Datos/IA') THEN
    INSERT INTO area (id, nombre, padre_id, esta_activo, fecha_creacion)
    VALUES ('60000000-0000-4000-8000-000000000007', 'Ciencia de Datos/IA', NULL, true, CURRENT_DATE);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM area WHERE nombre = 'QA') THEN
    INSERT INTO area (id, nombre, padre_id, esta_activo, fecha_creacion)
    VALUES ('60000000-0000-4000-8000-000000000008', 'QA', NULL, true, CURRENT_DATE);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM area WHERE nombre = 'Ciberseguridad') THEN
    INSERT INTO area (id, nombre, padre_id, esta_activo, fecha_creacion)
    VALUES ('60000000-0000-4000-8000-000000000009', 'Ciberseguridad', NULL, true, CURRENT_DATE);
  END IF;

  -- Áreas con padre
  IF NOT EXISTS (SELECT 1 FROM area WHERE nombre = 'Análisis de datos') THEN
    INSERT INTO area (id, nombre, padre_id, esta_activo, fecha_creacion)
    VALUES ('60000000-0000-4000-8000-000000000004', 'Análisis de datos',
            (SELECT id FROM area WHERE nombre = 'Tecnología' ORDER BY id LIMIT 1),
            true, CURRENT_DATE);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM area WHERE nombre = 'Gestión de proyectos') THEN
    INSERT INTO area (id, nombre, padre_id, esta_activo, fecha_creacion)
    VALUES ('60000000-0000-4000-8000-000000000005', 'Gestión de proyectos',
            (SELECT id FROM area WHERE nombre = 'Gestión' ORDER BY id LIMIT 1),
            true, CURRENT_DATE);
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2. ROL 'titulado' Y SUS PERMISOS (roles y permisos que exige el login)
--    Mismos códigos que apps/api/src/modules/user/domain/policies/access.policy.ts
-- ----------------------------------------------------------------------------
INSERT INTO rol_acceso (codigo, habilitado)
VALUES ('titulado', true)
ON CONFLICT DO NOTHING;

INSERT INTO permiso_acceso (codigo, habilitado)
VALUES ('user:self:read', true),
       ('auth:sessions:self', true),
       ('perfil:self:read', true),
       ('perfil:self:write', true),
       ('mentores:self:write', true),
       ('eventos:read', true),
       ('nlp:extract', true),
       ('radar:self:read', true),
       ('radar:self:write', true)
ON CONFLICT DO NOTHING;

INSERT INTO rol_permiso (rol_codigo, permiso_codigo)
SELECT 'titulado', p.codigo
FROM (VALUES ('user:self:read'),
             ('auth:sessions:self'),
             ('perfil:self:read'),
             ('perfil:self:write'),
             ('mentores:self:write'),
             ('eventos:read'),
             ('nlp:extract'),
             ('radar:self:read'),
             ('radar:self:write')) AS p(codigo)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 3. TITULADO 1 — Ana Quisbert Rojas  (qa.titulado1@umss.edu.bo / qaTitulado1!)
-- ============================================================================
INSERT INTO usuario (usuario_id, correo, nombre, rol, estado)
VALUES ('99000000-0000-4000-8000-000000000001', 'qa.titulado1@umss.edu.bo', 'Ana Quisbert Rojas', 'titulado', 'ACTIVO')
ON CONFLICT DO NOTHING;

INSERT INTO cuenta_acceso (id_usuario, password_hash, version)
VALUES ('99000000-0000-4000-8000-000000000001',
        '$argon2id$v=19$m=65536,p=1,t=3$vQkbER2vlLSYw6qePAwwtg$MP9Yp8mnBQjS4IRE+t24kBJqhRJIesFzUrFTEh1b7dw',
        1)
ON CONFLICT DO NOTHING;

INSERT INTO titulado (id, id_usuario, nombre, apellido, ci, extension_ci, cod_sis, anio_ingreso, anio_egreso, grado, expedido_en, id_carrera)
VALUES ('99000000-0000-4000-8000-000000000011', '99000000-0000-4000-8000-000000000001',
        'Ana', 'Quisbert Rojas', '9010001', 'CB', 201900101, 2018, 2023, 'Licenciatura', 'CB',
        (SELECT id FROM carrera WHERE nombre = 'Ingeniería de Sistemas' ORDER BY id LIMIT 1))
ON CONFLICT DO NOTHING;

INSERT INTO curriculum_vitae (id, id_titulado, id_tipo_archivo, ruta, valido)
VALUES ('99000000-0000-4000-8000-000000000031', '99000000-0000-4000-8000-000000000011',
        (SELECT id FROM tipo_archivo WHERE nombre = 'PDF' ORDER BY id LIMIT 1),
        'qa/cv/ana-quisbert-rojas.pdf', true)
ON CONFLICT DO NOTHING;

INSERT INTO formacion_academica (id, id_titulado, institucion, titulo, grado, anio_egreso)
VALUES ('99000000-0000-4000-8000-000000000041', '99000000-0000-4000-8000-000000000011',
        'Universidad Mayor de San Simón', 'Ingeniería de Sistemas', 'Licenciatura', 2023),
       ('99000000-0000-4000-8000-000000000042', '99000000-0000-4000-8000-000000000011',
        'Universidad Católica Boliviana', 'Diplomado en Gestión de Proyectos', 'Diplomado', 2024)
ON CONFLICT DO NOTHING;

INSERT INTO experiencia_laboral (id, id_titulado, empresa, cargo, fecha_inicio, fecha_fin)
VALUES ('99000000-0000-4000-8000-000000000061', '99000000-0000-4000-8000-000000000011',
        'NTT DATA', 'Desarrollador Junior', DATE '2023-03-01', NULL),
       ('99000000-0000-4000-8000-000000000062', '99000000-0000-4000-8000-000000000011',
        'Jalasoft', 'Pasante de Desarrollo', DATE '2021-06-01', DATE '2022-12-31')
ON CONFLICT DO NOTHING;

INSERT INTO certificacion (id, id_titulado, nombre, entidad_emisora, grado, anio_emision, estado_validacion)
VALUES ('99000000-0000-4000-8000-000000000081', '99000000-0000-4000-8000-000000000011',
        'AWS Certified Cloud Practitioner', 'Amazon Web Services', 'Profesional', 2024, 'sin_respaldo'),
       ('99000000-0000-4000-8000-000000000082', '99000000-0000-4000-8000-000000000011',
        'Scrum Master PSM I', 'Scrum.org', 'Asociado', 2023, 'sin_respaldo')
ON CONFLICT DO NOTHING;

INSERT INTO perfil_area (id, id_titulado, area_id, descripcion_profesional, fecha_creacion, fecha_actualizacion)
VALUES ('99000000-0000-4000-8000-000000000101', '99000000-0000-4000-8000-000000000011',
        (SELECT id FROM area WHERE nombre = 'Tecnología' ORDER BY id LIMIT 1),
        'Desarrollo de aplicaciones web con TypeScript y PostgreSQL.', CURRENT_DATE, CURRENT_DATE),
       ('99000000-0000-4000-8000-000000000102', '99000000-0000-4000-8000-000000000011',
        (SELECT id FROM area WHERE nombre = 'Desarrollo de software' ORDER BY id LIMIT 1),
        'Construcción de APIs REST y microservicios con Node.js.', CURRENT_DATE, CURRENT_DATE)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 4. TITULADO 2 — Bruno Mamani Choque  (qa.titulado2@umss.edu.bo / qaTitulado2!)
-- ============================================================================
INSERT INTO usuario (usuario_id, correo, nombre, rol, estado)
VALUES ('99000000-0000-4000-8000-000000000002', 'qa.titulado2@umss.edu.bo', 'Bruno Mamani Choque', 'titulado', 'ACTIVO')
ON CONFLICT DO NOTHING;

INSERT INTO cuenta_acceso (id_usuario, password_hash, version)
VALUES ('99000000-0000-4000-8000-000000000002',
        '$argon2id$v=19$m=65536,p=1,t=3$6q9pOgLz8/3i6+/uGdPKqw$j/PnT5oCqXFrDOociAeG19HBuXOqvLbonkgvW8vfYbI',
        1)
ON CONFLICT DO NOTHING;

INSERT INTO titulado (id, id_usuario, nombre, apellido, ci, extension_ci, cod_sis, anio_ingreso, anio_egreso, grado, expedido_en, id_carrera)
VALUES ('99000000-0000-4000-8000-000000000012', '99000000-0000-4000-8000-000000000002',
        'Bruno', 'Mamani Choque', '9010002', 'LP', 201700102, 2017, 2022, 'Licenciatura', 'LP',
        (SELECT id FROM carrera WHERE nombre = 'Ingeniería de Sistemas' ORDER BY id LIMIT 1))
ON CONFLICT DO NOTHING;

INSERT INTO curriculum_vitae (id, id_titulado, id_tipo_archivo, ruta, valido)
VALUES ('99000000-0000-4000-8000-000000000032', '99000000-0000-4000-8000-000000000012',
        (SELECT id FROM tipo_archivo WHERE nombre = 'PDF' ORDER BY id LIMIT 1),
        'qa/cv/bruno-mamani-choque.pdf', true)
ON CONFLICT DO NOTHING;

INSERT INTO formacion_academica (id, id_titulado, institucion, titulo, grado, anio_egreso)
VALUES ('99000000-0000-4000-8000-000000000043', '99000000-0000-4000-8000-000000000012',
        'Universidad Mayor de San Simón', 'Ingeniería de Sistemas', 'Licenciatura', 2022),
       ('99000000-0000-4000-8000-000000000044', '99000000-0000-4000-8000-000000000012',
        'Universidad Privada de Santa Cruz', 'Maestría en Ciencia de Datos', 'Maestría', 2024)
ON CONFLICT DO NOTHING;

INSERT INTO experiencia_laboral (id, id_titulado, empresa, cargo, fecha_inicio, fecha_fin)
VALUES ('99000000-0000-4000-8000-000000000063', '99000000-0000-4000-8000-000000000012',
        'Banco Mercantil Santa Cruz', 'Analista de Datos', DATE '2022-02-01', NULL),
       ('99000000-0000-4000-8000-000000000064', '99000000-0000-4000-8000-000000000012',
        'Cocha Technology', 'Analista BI', DATE '2020-05-01', DATE '2022-01-31')
ON CONFLICT DO NOTHING;

INSERT INTO certificacion (id, id_titulado, nombre, entidad_emisora, grado, anio_emision, estado_validacion)
VALUES ('99000000-0000-4000-8000-000000000083', '99000000-0000-4000-8000-000000000012',
        'Google Data Analytics', 'Google', 'Profesional', 2023, 'sin_respaldo'),
       ('99000000-0000-4000-8000-000000000084', '99000000-0000-4000-8000-000000000012',
        'SQL Avanzado', 'Platzi', 'Asociado', 2022, 'sin_respaldo')
ON CONFLICT DO NOTHING;

INSERT INTO perfil_area (id, id_titulado, area_id, descripcion_profesional, fecha_creacion, fecha_actualizacion)
VALUES ('99000000-0000-4000-8000-000000000103', '99000000-0000-4000-8000-000000000012',
        (SELECT id FROM area WHERE nombre = 'Tecnología' ORDER BY id LIMIT 1),
        'Procesamiento de datos y automatización de procesos con Python.', CURRENT_DATE, CURRENT_DATE),
       ('99000000-0000-4000-8000-000000000104', '99000000-0000-4000-8000-000000000012',
        (SELECT id FROM area WHERE nombre = 'Análisis de datos' ORDER BY id LIMIT 1),
        'Modelamiento y visualización de datos con SQL y Power BI.', CURRENT_DATE, CURRENT_DATE)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 5. TITULADO 3 — Carla Villarroel Soto  (qa.titulado3@umss.edu.bo / qaTitulado3!)
-- ============================================================================
INSERT INTO usuario (usuario_id, correo, nombre, rol, estado)
VALUES ('99000000-0000-4000-8000-000000000003', 'qa.titulado3@umss.edu.bo', 'Carla Villarroel Soto', 'titulado', 'ACTIVO')
ON CONFLICT DO NOTHING;

INSERT INTO cuenta_acceso (id_usuario, password_hash, version)
VALUES ('99000000-0000-4000-8000-000000000003',
        '$argon2id$v=19$m=65536,p=1,t=3$aBtlPztc11DKHyNx+nGHjw$F9ttpaiZ2IfpUymwZJrSnznKJlS7bFoTdkJ6WS0aYmE',
        1)
ON CONFLICT DO NOTHING;

INSERT INTO titulado (id, id_usuario, nombre, apellido, ci, extension_ci, cod_sis, anio_ingreso, anio_egreso, grado, expedido_en, id_carrera)
VALUES ('99000000-0000-4000-8000-000000000013', '99000000-0000-4000-8000-000000000003',
        'Carla', 'Villarroel Soto', '9010003', 'SC', 201600103, 2016, 2021, 'Licenciatura', 'SC',
        (SELECT id FROM carrera WHERE nombre = 'Ingeniería de Sistemas' ORDER BY id LIMIT 1))
ON CONFLICT DO NOTHING;

INSERT INTO curriculum_vitae (id, id_titulado, id_tipo_archivo, ruta, valido)
VALUES ('99000000-0000-4000-8000-000000000033', '99000000-0000-4000-8000-000000000013',
        (SELECT id FROM tipo_archivo WHERE nombre = 'PDF' ORDER BY id LIMIT 1),
        'qa/cv/carla-villarroel-soto.pdf', true)
ON CONFLICT DO NOTHING;

INSERT INTO formacion_academica (id, id_titulado, institucion, titulo, grado, anio_egreso)
VALUES ('99000000-0000-4000-8000-000000000045', '99000000-0000-4000-8000-000000000013',
        'Universidad Mayor de San Simón', 'Ingeniería de Sistemas', 'Licenciatura', 2021),
       ('99000000-0000-4000-8000-000000000046', '99000000-0000-4000-8000-000000000013',
        'Universidad Católica Boliviana', 'Gestión de TI', 'Maestría', 2023)
ON CONFLICT DO NOTHING;

INSERT INTO experiencia_laboral (id, id_titulado, empresa, cargo, fecha_inicio, fecha_fin)
VALUES ('99000000-0000-4000-8000-000000000065', '99000000-0000-4000-8000-000000000013',
        'Emergios', 'Project Manager', DATE '2022-01-01', NULL),
       ('99000000-0000-4000-8000-000000000066', '99000000-0000-4000-8000-000000000013',
        'Siegfried', 'Analista de Sistemas', DATE '2021-02-01', DATE '2021-12-31')
ON CONFLICT DO NOTHING;

INSERT INTO certificacion (id, id_titulado, nombre, entidad_emisora, grado, anio_emision, estado_validacion)
VALUES ('99000000-0000-4000-8000-000000000085', '99000000-0000-4000-8000-000000000013',
        'Project Management Professional (PMP)', 'PMI', 'Profesional', 2023, 'sin_respaldo'),
       ('99000000-0000-4000-8000-000000000086', '99000000-0000-4000-8000-000000000013',
        'ITIL Foundation', 'Axelos', 'Asociado', 2022, 'sin_respaldo')
ON CONFLICT DO NOTHING;

INSERT INTO perfil_area (id, id_titulado, area_id, descripcion_profesional, fecha_creacion, fecha_actualizacion)
VALUES ('99000000-0000-4000-8000-000000000105', '99000000-0000-4000-8000-000000000013',
        (SELECT id FROM area WHERE nombre = 'Gestión' ORDER BY id LIMIT 1),
        'Coordinación de equipos de trabajo y seguimiento de proyectos TI.', CURRENT_DATE, CURRENT_DATE),
       ('99000000-0000-4000-8000-000000000106', '99000000-0000-4000-8000-000000000013',
        (SELECT id FROM area WHERE nombre = 'Gestión de proyectos' ORDER BY id LIMIT 1),
        'Metodologías ágiles y gestión del alcance, tiempo y costo.', CURRENT_DATE, CURRENT_DATE)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 6. TITULADO MENTOR 1 — Diego Apaza Condori  (qa.mentor1@umss.edu.bo / qaMentor1!)
-- ============================================================================
INSERT INTO usuario (usuario_id, correo, nombre, rol, estado)
VALUES ('99000000-0000-4000-8000-000000000004', 'qa.mentor1@umss.edu.bo', 'Diego Apaza Condori', 'titulado', 'ACTIVO')
ON CONFLICT DO NOTHING;

INSERT INTO cuenta_acceso (id_usuario, password_hash, version)
VALUES ('99000000-0000-4000-8000-000000000004',
        '$argon2id$v=19$m=65536,p=1,t=3$0lmn5RjOQrFGl2ss4xKSKg$a5cn9IOacFkZCuozE8XObzNdirRGSKfrwZIzxyDafkM',
        1)
ON CONFLICT DO NOTHING;

INSERT INTO titulado (id, id_usuario, nombre, apellido, ci, extension_ci, cod_sis, anio_ingreso, anio_egreso, grado, expedido_en, id_carrera)
VALUES ('99000000-0000-4000-8000-000000000014', '99000000-0000-4000-8000-000000000004',
        'Diego', 'Apaza Condori', '9010004', 'CB', 201500104, 2015, 2020, 'Licenciatura', 'CB',
        (SELECT id FROM carrera WHERE nombre = 'Ingeniería de Sistemas' ORDER BY id LIMIT 1))
ON CONFLICT DO NOTHING;

INSERT INTO curriculum_vitae (id, id_titulado, id_tipo_archivo, ruta, valido)
VALUES ('99000000-0000-4000-8000-000000000034', '99000000-0000-4000-8000-000000000014',
        (SELECT id FROM tipo_archivo WHERE nombre = 'PDF' ORDER BY id LIMIT 1),
        'qa/cv/diego-apaza-condori.pdf', true)
ON CONFLICT DO NOTHING;

INSERT INTO formacion_academica (id, id_titulado, institucion, titulo, grado, anio_egreso)
VALUES ('99000000-0000-4000-8000-000000000047', '99000000-0000-4000-8000-000000000014',
        'Universidad Mayor de San Simón', 'Ingeniería de Sistemas', 'Licenciatura', 2020),
       ('99000000-0000-4000-8000-000000000048', '99000000-0000-4000-8000-000000000014',
        'Universidad Católica Boliviana', 'Especialización en Arquitectura de Software', 'Especialización', 2022)
ON CONFLICT DO NOTHING;

INSERT INTO experiencia_laboral (id, id_titulado, empresa, cargo, fecha_inicio, fecha_fin)
VALUES ('99000000-0000-4000-8000-000000000067', '99000000-0000-4000-8000-000000000014',
        'Globant', 'Tech Lead', DATE '2021-03-01', NULL),
       ('99000000-0000-4000-8000-000000000068', '99000000-0000-4000-8000-000000000014',
        'NTT DATA', 'Desarrollador Full Stack', DATE '2018-01-01', DATE '2021-02-28')
ON CONFLICT DO NOTHING;

INSERT INTO certificacion (id, id_titulado, nombre, entidad_emisora, grado, anio_emision, estado_validacion)
VALUES ('99000000-0000-4000-8000-000000000087', '99000000-0000-4000-8000-000000000014',
        'AWS Solutions Architect', 'Amazon Web Services', 'Profesional', 2022, 'sin_respaldo'),
       ('99000000-0000-4000-8000-000000000088', '99000000-0000-4000-8000-000000000014',
        'Certified Kubernetes Administrator (CKA)', 'CNCF', 'Profesional', 2023, 'sin_respaldo')
ON CONFLICT DO NOTHING;

INSERT INTO perfil_area (id, id_titulado, area_id, descripcion_profesional, fecha_creacion, fecha_actualizacion)
VALUES ('99000000-0000-4000-8000-000000000107', '99000000-0000-4000-8000-000000000014',
        (SELECT id FROM area WHERE nombre = 'Tecnología' ORDER BY id LIMIT 1),
        'Arquitectura de aplicaciones web escalables y buenas prácticas.', CURRENT_DATE, CURRENT_DATE),
       ('99000000-0000-4000-8000-000000000108', '99000000-0000-4000-8000-000000000014',
        (SELECT id FROM area WHERE nombre = 'Desarrollo de software' ORDER BY id LIMIT 1),
        'Desarrollo full stack con TypeScript, Node.js y PostgreSQL.', CURRENT_DATE, CURRENT_DATE)
ON CONFLICT DO NOTHING;

-- Perfil de mentoría de Diego
INSERT INTO mentor (id, id_titulado, descripcion, informacion_relevante, foto_perfil, experiencia, esta_activo, anios_exp, fecha_creacion, fecha_actualizacion)
VALUES ('99000000-0000-4000-8000-000000000024', '99000000-0000-4000-8000-000000000014',
        'Mentor en desarrollo de software y arquitectura de aplicaciones web.',
        'Orientación para el primer empleo, portafolio técnico y preparación de entrevistas.',
        'https://i.pravatar.cc/300?img=12',
        'Desarrollo de aplicaciones web con TypeScript, Node.js y PostgreSQL.',
        true, 6, CURRENT_DATE, CURRENT_DATE)
ON CONFLICT DO NOTHING;

INSERT INTO mentor_area (id, id_mentor, id_area, fecha_creacion)
VALUES ('99000000-0000-4000-8000-000000000121', '99000000-0000-4000-8000-000000000024',
        (SELECT id FROM area WHERE nombre = 'Tecnología' ORDER BY id LIMIT 1), CURRENT_DATE),
       ('99000000-0000-4000-8000-000000000122', '99000000-0000-4000-8000-000000000024',
        (SELECT id FROM area WHERE nombre = 'Desarrollo de software' ORDER BY id LIMIT 1), CURRENT_DATE)
ON CONFLICT DO NOTHING;

INSERT INTO disponibilidad_mentor (id, id_mentor, estado, hora_inicio, hora_fin, fecha_creacion, fecha_actualizacion)
VALUES ('99000000-0000-4000-8000-000000000131', '99000000-0000-4000-8000-000000000024',
        'DISPONIBLE', TIME '10:00:00', TIME '12:00:00', CURRENT_DATE, CURRENT_DATE),
       ('99000000-0000-4000-8000-000000000132', '99000000-0000-4000-8000-000000000024',
        'DISPONIBLE', TIME '18:00:00', TIME '20:00:00', CURRENT_DATE, CURRENT_DATE)
ON CONFLICT DO NOTHING;

-- Espacios semanales de Diego (lunes a viernes, 18:00-20:00)
INSERT INTO espacio_disponible_mentor (id, id_mentor, dia_semana, horario_inicio, horario_fin, esta_activo, fecha_creacion, fecha_actualizacion)
VALUES ('99000000-0000-4000-8000-000000000141', '99000000-0000-4000-8000-000000000024', 1, TIME '18:00:00', TIME '20:00:00', true, CURRENT_DATE, CURRENT_DATE),
       ('99000000-0000-4000-8000-000000000142', '99000000-0000-4000-8000-000000000024', 2, TIME '18:00:00', TIME '20:00:00', true, CURRENT_DATE, CURRENT_DATE),
       ('99000000-0000-4000-8000-000000000143', '99000000-0000-4000-8000-000000000024', 3, TIME '18:00:00', TIME '20:00:00', true, CURRENT_DATE, CURRENT_DATE),
       ('99000000-0000-4000-8000-000000000144', '99000000-0000-4000-8000-000000000024', 4, TIME '18:00:00', TIME '20:00:00', true, CURRENT_DATE, CURRENT_DATE),
       ('99000000-0000-4000-8000-000000000145', '99000000-0000-4000-8000-000000000024', 5, TIME '18:00:00', TIME '20:00:00', true, CURRENT_DATE, CURRENT_DATE)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 7. TITULADA MENTORA 2 — Elena Rocha Vargas  (qa.mentor2@umss.edu.bo / qaMentor2!)
-- ============================================================================
INSERT INTO usuario (usuario_id, correo, nombre, rol, estado)
VALUES ('99000000-0000-4000-8000-000000000005', 'qa.mentor2@umss.edu.bo', 'Elena Rocha Vargas', 'titulado', 'ACTIVO')
ON CONFLICT DO NOTHING;

INSERT INTO cuenta_acceso (id_usuario, password_hash, version)
VALUES ('99000000-0000-4000-8000-000000000005',
        '$argon2id$v=19$m=65536,p=1,t=3$Cx1fLX4r8V6+1TsPsFzoYA$XfZw+L7ziy5OECpOdiY56Rh2hUF6CKIrnZDL74c7k2Q',
        1)
ON CONFLICT DO NOTHING;

INSERT INTO titulado (id, id_usuario, nombre, apellido, ci, extension_ci, cod_sis, anio_ingreso, anio_egreso, grado, expedido_en, id_carrera)
VALUES ('99000000-0000-4000-8000-000000000015', '99000000-0000-4000-8000-000000000005',
        'Elena', 'Rocha Vargas', '9010005', 'TJ', 201600105, 2016, 2021, 'Licenciatura', 'TJ',
        (SELECT id FROM carrera WHERE nombre = 'Ingeniería de Sistemas' ORDER BY id LIMIT 1))
ON CONFLICT DO NOTHING;

INSERT INTO curriculum_vitae (id, id_titulado, id_tipo_archivo, ruta, valido)
VALUES ('99000000-0000-4000-8000-000000000035', '99000000-0000-4000-8000-000000000015',
        (SELECT id FROM tipo_archivo WHERE nombre = 'PDF' ORDER BY id LIMIT 1),
        'qa/cv/elena-rocha-vargas.pdf', true)
ON CONFLICT DO NOTHING;

INSERT INTO formacion_academica (id, id_titulado, institucion, titulo, grado, anio_egreso)
VALUES ('99000000-0000-4000-8000-000000000049', '99000000-0000-4000-8000-000000000015',
        'Universidad Mayor de San Simón', 'Ingeniería de Sistemas', 'Licenciatura', 2021),
       ('99000000-0000-4000-8000-000000000050', '99000000-0000-4000-8000-000000000015',
        'Universidad Mayor de San Simón', 'Diplomado en Testing de Software', 'Diplomado', 2023)
ON CONFLICT DO NOTHING;

INSERT INTO experiencia_laboral (id, id_titulado, empresa, cargo, fecha_inicio, fecha_fin)
VALUES ('99000000-0000-4000-8000-000000000069', '99000000-0000-4000-8000-000000000015',
        'Softtek', 'QA Engineer', DATE '2021-05-01', NULL),
       ('99000000-0000-4000-8000-000000000070', '99000000-0000-4000-8000-000000000015',
        'Emergios', 'Tester Funcional', DATE '2019-08-01', DATE '2021-04-30')
ON CONFLICT DO NOTHING;

INSERT INTO certificacion (id, id_titulado, nombre, entidad_emisora, grado, anio_emision, estado_validacion)
VALUES ('99000000-0000-4000-8000-000000000089', '99000000-0000-4000-8000-000000000015',
        'ISTQB Certified Tester Foundation Level', 'ISTQB', 'Asociado', 2022, 'sin_respaldo'),
       ('99000000-0000-4000-8000-000000000090', '99000000-0000-4000-8000-000000000015',
        'ICAgile Certified Professional', 'ICAgile', 'Profesional', 2023, 'sin_respaldo')
ON CONFLICT DO NOTHING;

INSERT INTO perfil_area (id, id_titulado, area_id, descripcion_profesional, fecha_creacion, fecha_actualizacion)
VALUES ('99000000-0000-4000-8000-000000000109', '99000000-0000-4000-8000-000000000015',
        (SELECT id FROM area WHERE nombre = 'QA' ORDER BY id LIMIT 1),
        'Diseño de casos de prueba, automatización y aseguramiento de la calidad.', CURRENT_DATE, CURRENT_DATE),
       ('99000000-0000-4000-8000-000000000110', '99000000-0000-4000-8000-000000000015',
        (SELECT id FROM area WHERE nombre = 'Cloud/DevOps' ORDER BY id LIMIT 1),
        'Integración y entrega continua con contenedores y servicios en la nube.', CURRENT_DATE, CURRENT_DATE)
ON CONFLICT DO NOTHING;

-- Perfil de mentoría de Elena
INSERT INTO mentor (id, id_titulado, descripcion, informacion_relevante, foto_perfil, experiencia, esta_activo, anios_exp, fecha_creacion, fecha_actualizacion)
VALUES ('99000000-0000-4000-8000-000000000025', '99000000-0000-4000-8000-000000000015',
        'Mentora en aseguramiento de la calidad de software y testing.',
        'Orientación sobre certificaciones ISTQB y trabajo en equipos remotos.',
        'https://i.pravatar.cc/300?img=45',
        'Diseño de estrategias de prueba y automatización con Selenium y Cypress.',
        true, 5, CURRENT_DATE, CURRENT_DATE)
ON CONFLICT DO NOTHING;

INSERT INTO mentor_area (id, id_mentor, id_area, fecha_creacion)
VALUES ('99000000-0000-4000-8000-000000000123', '99000000-0000-4000-8000-000000000025',
        (SELECT id FROM area WHERE nombre = 'QA' ORDER BY id LIMIT 1), CURRENT_DATE),
       ('99000000-0000-4000-8000-000000000124', '99000000-0000-4000-8000-000000000025',
        (SELECT id FROM area WHERE nombre = 'Cloud/DevOps' ORDER BY id LIMIT 1), CURRENT_DATE)
ON CONFLICT DO NOTHING;

INSERT INTO disponibilidad_mentor (id, id_mentor, estado, hora_inicio, hora_fin, fecha_creacion, fecha_actualizacion)
VALUES ('99000000-0000-4000-8000-000000000133', '99000000-0000-4000-8000-000000000025',
        'DISPONIBLE', TIME '16:00:00', TIME '18:00:00', CURRENT_DATE, CURRENT_DATE),
       ('99000000-0000-4000-8000-000000000134', '99000000-0000-4000-8000-000000000025',
        'DISPONIBLE', TIME '19:00:00', TIME '21:00:00', CURRENT_DATE, CURRENT_DATE)
ON CONFLICT DO NOTHING;

-- Espacios semanales de Elena (lunes a viernes, 19:00-21:00)
INSERT INTO espacio_disponible_mentor (id, id_mentor, dia_semana, horario_inicio, horario_fin, esta_activo, fecha_creacion, fecha_actualizacion)
VALUES ('99000000-0000-4000-8000-000000000146', '99000000-0000-4000-8000-000000000025', 1, TIME '19:00:00', TIME '21:00:00', true, CURRENT_DATE, CURRENT_DATE),
       ('99000000-0000-4000-8000-000000000147', '99000000-0000-4000-8000-000000000025', 2, TIME '19:00:00', TIME '21:00:00', true, CURRENT_DATE, CURRENT_DATE),
       ('99000000-0000-4000-8000-000000000148', '99000000-0000-4000-8000-000000000025', 3, TIME '19:00:00', TIME '21:00:00', true, CURRENT_DATE, CURRENT_DATE),
       ('99000000-0000-4000-8000-000000000149', '99000000-0000-4000-8000-000000000025', 4, TIME '19:00:00', TIME '21:00:00', true, CURRENT_DATE, CURRENT_DATE),
       ('99000000-0000-4000-8000-000000000150', '99000000-0000-4000-8000-000000000025', 5, TIME '19:00:00', TIME '21:00:00', true, CURRENT_DATE, CURRENT_DATE)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 8. TITULADO MENTOR 3 — Fabio Salazar Méndez  (qa.mentor3@umss.edu.bo / qaMentor3!)
-- ============================================================================
INSERT INTO usuario (usuario_id, correo, nombre, rol, estado)
VALUES ('99000000-0000-4000-8000-000000000006', 'qa.mentor3@umss.edu.bo', 'Fabio Salazar Méndez', 'titulado', 'ACTIVO')
ON CONFLICT DO NOTHING;

INSERT INTO cuenta_acceso (id_usuario, password_hash, version)
VALUES ('99000000-0000-4000-8000-000000000006',
        '$argon2id$v=19$m=65536,p=1,t=3$vAsqeiwV7DjrE7apKbZ7KQ$tCFQGjI5xaTztgn8ydVtUUuAD/ctZnptcErZkxp7YhE',
        1)
ON CONFLICT DO NOTHING;

INSERT INTO titulado (id, id_usuario, nombre, apellido, ci, extension_ci, cod_sis, anio_ingreso, anio_egreso, grado, expedido_en, id_carrera)
VALUES ('99000000-0000-4000-8000-000000000016', '99000000-0000-4000-8000-000000000006',
        'Fabio', 'Salazar Méndez', '9010006', 'PT', 201400106, 2014, 2019, 'Licenciatura', 'PT',
        (SELECT id FROM carrera WHERE nombre = 'Ingeniería de Sistemas' ORDER BY id LIMIT 1))
ON CONFLICT DO NOTHING;

INSERT INTO curriculum_vitae (id, id_titulado, id_tipo_archivo, ruta, valido)
VALUES ('99000000-0000-4000-8000-000000000036', '99000000-0000-4000-8000-000000000016',
        (SELECT id FROM tipo_archivo WHERE nombre = 'PDF' ORDER BY id LIMIT 1),
        'qa/cv/fabio-salazar-mendez.pdf', true)
ON CONFLICT DO NOTHING;

INSERT INTO formacion_academica (id, id_titulado, institucion, titulo, grado, anio_egreso)
VALUES ('99000000-0000-4000-8000-000000000051', '99000000-0000-4000-8000-000000000016',
        'Universidad Mayor de San Simón', 'Ingeniería de Sistemas', 'Licenciatura', 2019),
       ('99000000-0000-4000-8000-000000000052', '99000000-0000-4000-8000-000000000016',
        'Universidad Privada Boliviana', 'Maestría en Ciencia de Datos', 'Maestría', 2022)
ON CONFLICT DO NOTHING;

INSERT INTO experiencia_laboral (id, id_titulado, empresa, cargo, fecha_inicio, fecha_fin)
VALUES ('99000000-0000-4000-8000-000000000071', '99000000-0000-4000-8000-000000000016',
        'Yocholabs', 'Ingeniero de Datos', DATE '2022-06-01', NULL),
       ('99000000-0000-4000-8000-000000000072', '99000000-0000-4000-8000-000000000016',
        'NTT DATA', 'Desarrollador Backend', DATE '2019-02-01', DATE '2022-05-31')
ON CONFLICT DO NOTHING;

INSERT INTO certificacion (id, id_titulado, nombre, entidad_emisora, grado, anio_emision, estado_validacion)
VALUES ('99000000-0000-4000-8000-000000000091', '99000000-0000-4000-8000-000000000016',
        'TensorFlow Developer Certificate', 'Google', 'Profesional', 2023, 'sin_respaldo'),
       ('99000000-0000-4000-8000-000000000092', '99000000-0000-4000-8000-000000000016',
        'Azure Data Engineer Associate', 'Microsoft', 'Profesional', 2022, 'sin_respaldo')
ON CONFLICT DO NOTHING;

INSERT INTO perfil_area (id, id_titulado, area_id, descripcion_profesional, fecha_creacion, fecha_actualizacion)
VALUES ('99000000-0000-4000-8000-000000000111', '99000000-0000-4000-8000-000000000016',
        (SELECT id FROM area WHERE nombre = 'Ciencia de Datos/IA' ORDER BY id LIMIT 1),
        'Modelos de machine learning y procesamiento de datos con Python.', CURRENT_DATE, CURRENT_DATE),
       ('99000000-0000-4000-8000-000000000112', '99000000-0000-4000-8000-000000000016',
        (SELECT id FROM area WHERE nombre = 'Ciberseguridad' ORDER BY id LIMIT 1),
        'Seguridad en aplicaciones y análisis de vulnerabilidades.', CURRENT_DATE, CURRENT_DATE)
ON CONFLICT DO NOTHING;

-- Perfil de mentoría de Fabio
INSERT INTO mentor (id, id_titulado, descripcion, informacion_relevante, foto_perfil, experiencia, esta_activo, anios_exp, fecha_creacion, fecha_actualizacion)
VALUES ('99000000-0000-4000-8000-000000000026', '99000000-0000-4000-8000-000000000016',
        'Mentor en ciencia de datos, inteligencia artificial y ciberseguridad.',
        'Orientación para proyectos de datos, portafolio y especialización profesional.',
        'https://i.pravatar.cc/300?img=68',
        'Ingeniería de datos y modelos de aprendizaje automático con Python y TensorFlow.',
        true, 7, CURRENT_DATE, CURRENT_DATE)
ON CONFLICT DO NOTHING;

INSERT INTO mentor_area (id, id_mentor, id_area, fecha_creacion)
VALUES ('99000000-0000-4000-8000-000000000125', '99000000-0000-4000-8000-000000000026',
        (SELECT id FROM area WHERE nombre = 'Ciencia de Datos/IA' ORDER BY id LIMIT 1), CURRENT_DATE),
       ('99000000-0000-4000-8000-000000000126', '99000000-0000-4000-8000-000000000026',
        (SELECT id FROM area WHERE nombre = 'Ciberseguridad' ORDER BY id LIMIT 1), CURRENT_DATE)
ON CONFLICT DO NOTHING;

INSERT INTO disponibilidad_mentor (id, id_mentor, estado, hora_inicio, hora_fin, fecha_creacion, fecha_actualizacion)
VALUES ('99000000-0000-4000-8000-000000000135', '99000000-0000-4000-8000-000000000026',
        'DISPONIBLE', TIME '09:00:00', TIME '11:00:00', CURRENT_DATE, CURRENT_DATE),
       ('99000000-0000-4000-8000-000000000136', '99000000-0000-4000-8000-000000000026',
        'DISPONIBLE', TIME '15:00:00', TIME '17:00:00', CURRENT_DATE, CURRENT_DATE)
ON CONFLICT DO NOTHING;

-- Espacios semanales de Fabio (lunes a viernes, 15:00-17:00)
INSERT INTO espacio_disponible_mentor (id, id_mentor, dia_semana, horario_inicio, horario_fin, esta_activo, fecha_creacion, fecha_actualizacion)
VALUES ('99000000-0000-4000-8000-000000000151', '99000000-0000-4000-8000-000000000026', 1, TIME '15:00:00', TIME '17:00:00', true, CURRENT_DATE, CURRENT_DATE),
       ('99000000-0000-4000-8000-000000000152', '99000000-0000-4000-8000-000000000026', 2, TIME '15:00:00', TIME '17:00:00', true, CURRENT_DATE, CURRENT_DATE),
       ('99000000-0000-4000-8000-000000000153', '99000000-0000-4000-8000-000000000026', 3, TIME '15:00:00', TIME '17:00:00', true, CURRENT_DATE, CURRENT_DATE),
       ('99000000-0000-4000-8000-000000000154', '99000000-0000-4000-8000-000000000026', 4, TIME '15:00:00', TIME '17:00:00', true, CURRENT_DATE, CURRENT_DATE),
       ('99000000-0000-4000-8000-000000000155', '99000000-0000-4000-8000-000000000026', 5, TIME '15:00:00', TIME '17:00:00', true, CURRENT_DATE, CURRENT_DATE)
ON CONFLICT DO NOTHING;

COMMIT;

-- ----------------------------------------------------------------------------
-- 9. RESUMEN: credenciales QA creadas (correo + contraseña para el equipo)
-- ----------------------------------------------------------------------------
SELECT u.correo                                  AS "Correo",
       CASE u.correo
         WHEN 'qa.titulado1@umss.edu.bo' THEN 'qaTitulado1!'
         WHEN 'qa.titulado2@umss.edu.bo' THEN 'qaTitulado2!'
         WHEN 'qa.titulado3@umss.edu.bo' THEN 'qaTitulado3!'
         WHEN 'qa.mentor1@umss.edu.bo'   THEN 'qaMentor1!'
         WHEN 'qa.mentor2@umss.edu.bo'   THEN 'qaMentor2!'
         WHEN 'qa.mentor3@umss.edu.bo'   THEN 'qaMentor3!'
       END                                        AS "Contraseña",
       t.nombre || ' ' || t.apellido              AS "Nombre completo",
       CASE WHEN m.id IS NULL THEN 'Titulado' ELSE 'Titulado mentor' END AS "Perfil",
       u.estado                                   AS "Estado"
FROM usuario u
JOIN titulado t ON t.id_usuario = u.usuario_id
LEFT JOIN mentor m ON m.id_titulado = t.id
WHERE u.correo LIKE 'qa.%@umss.edu.bo'
ORDER BY u.correo;
