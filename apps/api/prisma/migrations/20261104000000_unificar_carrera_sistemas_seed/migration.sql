BEGIN;

LOCK TABLE public.carrera IN SHARE ROW EXCLUSIVE MODE;

DO $$
DECLARE
  seed_id CONSTANT uuid := '10000000-0000-4000-8000-000000000001';
  systems_names CONSTANT text[] := ARRAY[
    'ingenieria de sistemas', 'ingenieria en sistemas', 'ingenieria sistemas',
    'ing de sistemas', 'ing sistemas'
  ];
  career_ids uuid[];
  target_id uuid;
  ref record;
BEGIN
  -- Solo retirar la fila conocida de la seed si realmente representa Sistemas.
  IF NOT EXISTS (
    SELECT 1 FROM public.carrera
    WHERE id = seed_id
      AND translate(lower(regexp_replace(btrim(replace(nombre, '.', '')), '\s+', ' ', 'g')),
        'áéíóúü', 'aeiouu') = ANY(systems_names)
  ) THEN
    RETURN;
  END IF;

  SELECT array_agg(id ORDER BY id) INTO career_ids
  FROM public.carrera
  WHERE id <> seed_id
    AND translate(lower(regexp_replace(btrim(replace(nombre, '.', '')), '\s+', ' ', 'g')),
      'áéíóúü', 'aeiouu') = ANY(systems_names);

  -- Una base nueva puede tener solo el UUID de la seed; allí se conserva.
  IF coalesce(cardinality(career_ids), 0) = 0 THEN
    RETURN;
  END IF;
  IF cardinality(career_ids) <> 1 THEN
    RAISE EXCEPTION 'Hay varias carreras originales de Sistemas; no se puede elegir un destino único';
  END IF;
  target_id := career_ids[1];

  -- Descubrir todas las FK, incluidas las de tablas agregadas por otras épicas.
  FOR ref IN
    SELECT ns.nspname AS schema_name, t.relname AS table_name, a.attname AS column_name,
      cardinality(c.conkey) AS column_count
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace ns ON ns.oid = t.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
    WHERE c.contype = 'f' AND c.confrelid = 'public.carrera'::regclass
  LOOP
    IF ref.column_count <> 1 THEN
      RAISE EXCEPTION 'Referencia compuesta a carrera no contemplada: %.%', ref.schema_name, ref.table_name;
    END IF;
    EXECUTE format('UPDATE %I.%I SET %I = $1 WHERE %I = $2',
      ref.schema_name, ref.table_name, ref.column_name, ref.column_name)
      USING target_id, seed_id;
  END LOOP;

  -- Los borradores guardan la carrera en JSON y no están protegidos por una FK.
  UPDATE public.borrador_registro
  SET datos = jsonb_set(datos, '{carreraId}', to_jsonb(target_id::text), false)
  WHERE datos->>'carreraId' = seed_id::text;

  DELETE FROM public.carrera WHERE id = seed_id;
END $$;

COMMIT;
