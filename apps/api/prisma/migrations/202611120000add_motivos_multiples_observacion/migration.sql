


INSERT INTO "motivo_observacion" ("codigo", "etiqueta") VALUES
  ('documento_ilegible', 'Documento ilegible o borroso'),
  ('datos_no_coinciden', 'Datos declarados no coinciden con el respaldo (nombre, CI, carrera o fechas)'),
  ('documento_incompleto', 'Documento de respaldo incompleto o formato no válido'),
  ('otro_motivo', 'Otro motivo (requiere explicación en la nota)')
ON CONFLICT ("codigo") DO NOTHING;