-- HU 6.21 / BUG-003. Conservar los UUID de las especialidades y los vínculos
-- existentes de mentor_area al corregir la jerarquía del catálogo.
BEGIN;

LOCK TABLE public.area, public.mentor_area, public.mentor_interes_personalizado
  IN SHARE ROW EXCLUSIVE MODE;

CREATE TEMP TABLE bug003_catalog (
  id uuid PRIMARY KEY,
  nombre text NOT NULL,
  padre_id uuid
) ON COMMIT DROP;

INSERT INTO bug003_catalog (id, nombre, padre_id) VALUES
  ('60000000-0000-4000-8000-000000000011', 'Backend', NULL),
  ('60000000-0000-4000-8000-000000000012', 'Frontend', NULL),
  ('60000000-0000-4000-8000-000000000013', 'Bases de datos', NULL),
  ('60000000-0000-4000-8000-000000000014', 'APIs REST', '60000000-0000-4000-8000-000000000011'),
  ('60000000-0000-4000-8000-000000000015', 'Node.js', '60000000-0000-4000-8000-000000000011'),
  ('60000000-0000-4000-8000-000000000016', 'React', '60000000-0000-4000-8000-000000000012'),
  ('60000000-0000-4000-8000-000000000018', 'PostgreSQL', '60000000-0000-4000-8000-000000000013'),
  ('60000000-0000-4000-8000-000000000051', 'Spring Boot', '60000000-0000-4000-8000-000000000011'),
  ('60000000-0000-4000-8000-000000000052', 'Laravel', '60000000-0000-4000-8000-000000000011'),
  ('60000000-0000-4000-8000-000000000053', 'Golang', '60000000-0000-4000-8000-000000000011'),
  ('60000000-0000-4000-8000-000000000054', 'Microservicios', '60000000-0000-4000-8000-000000000011'),
  ('60000000-0000-4000-8000-000000000055', 'Accesibilidad web', '60000000-0000-4000-8000-000000000012'),
  ('60000000-0000-4000-8000-000000000056', 'Diseño de interfaces', '60000000-0000-4000-8000-000000000012'),
  ('60000000-0000-4000-8000-000000000057', 'Rendimiento web', '60000000-0000-4000-8000-000000000012'),
  ('60000000-0000-4000-8000-000000000058', 'Angular', '60000000-0000-4000-8000-000000000012'),
  ('60000000-0000-4000-8000-000000000059', 'Modelado de datos', '60000000-0000-4000-8000-000000000013'),
  ('60000000-0000-4000-8000-000000000060', 'Optimización de consultas', '60000000-0000-4000-8000-000000000013'),
  ('60000000-0000-4000-8000-000000000061', 'MySQL', '60000000-0000-4000-8000-000000000013');

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.area a JOIN bug003_catalog c ON a.id = c.id
    WHERE lower(btrim(a.nombre)) IS DISTINCT FROM lower(c.nombre)
       OR a.esta_activo IS DISTINCT FROM true
  ) THEN
    RAISE EXCEPTION 'BUG-003: UUID del catálogo ocupado o área inactiva';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.area a JOIN bug003_catalog c
      ON lower(btrim(a.nombre)) = lower(c.nombre)
     AND a.id <> c.id
     AND a.padre_id IS NOT DISTINCT FROM c.padre_id
  ) THEN
    RAISE EXCEPTION 'BUG-003: nombre equivalente con otro UUID en el área destino';
  END IF;
END $$;

-- El antiguo tópico «Backend/Frontend/Bases de datos» pasa a ser área.
-- Su selección histórica se conserva como interés personalizado del mentor.
INSERT INTO public.mentor_interes_personalizado
  (id_mentor, id_area, nombre, nombre_normalizado)
SELECT ma.id_mentor, a.id, a.nombre, lower(btrim(a.nombre))
FROM public.mentor_area ma
JOIN public.area a ON a.id = ma.id_area AND a.padre_id IS NOT NULL
JOIN bug003_catalog c ON c.id = a.id AND c.padre_id IS NULL
WHERE ma.id_mentor IS NOT NULL
ON CONFLICT (id_mentor, id_area, nombre_normalizado) DO NOTHING;

INSERT INTO public.area (id, nombre, padre_id, esta_activo, fecha_creacion)
SELECT id, nombre, NULL, true, CURRENT_DATE
FROM bug003_catalog WHERE padre_id IS NULL
ON CONFLICT (id) DO UPDATE SET padre_id = NULL;

-- Quien tenía APIs REST, Node.js, React o PostgreSQL conserva el tópico y
-- recibe también la nueva área raíz para que siga siendo editable.
INSERT INTO public.mentor_area (id_mentor, id_area, fecha_creacion)
SELECT DISTINCT ma.id_mentor, c.padre_id, CURRENT_DATE
FROM public.mentor_area ma
JOIN bug003_catalog c ON c.id = ma.id_area
WHERE c.id IN (
  '60000000-0000-4000-8000-000000000014',
  '60000000-0000-4000-8000-000000000015',
  '60000000-0000-4000-8000-000000000016',
  '60000000-0000-4000-8000-000000000018'
) AND ma.id_mentor IS NOT NULL
ON CONFLICT (id_mentor, id_area) DO NOTHING;

INSERT INTO public.area (id, nombre, padre_id, esta_activo, fecha_creacion)
SELECT id, nombre, padre_id, true, CURRENT_DATE
FROM bug003_catalog WHERE padre_id IS NOT NULL
ON CONFLICT (id) DO UPDATE SET padre_id = EXCLUDED.padre_id;

COMMIT;
