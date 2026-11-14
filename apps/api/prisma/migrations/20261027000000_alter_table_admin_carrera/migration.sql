-- La asignación se aplica únicamente si el usuario y la carrera ya existen.
INSERT INTO public.administrador_de_carrera (id_usuario, id_carrera, estado)
SELECT usuario.usuario_id, carrera.id, 'ACTIVO'
FROM public.usuario AS usuario
CROSS JOIN public.carrera AS carrera
WHERE usuario.usuario_id = '20000000-0000-4000-8000-000000000002'::UUID
  AND carrera.id = '10000000-0000-4000-8000-000000000002'::UUID
  AND NOT EXISTS (
      SELECT 1
      FROM public.administrador_de_carrera AS asignacion
      WHERE asignacion.id_usuario = usuario.usuario_id
        AND asignacion.id_carrera = carrera.id
  );
