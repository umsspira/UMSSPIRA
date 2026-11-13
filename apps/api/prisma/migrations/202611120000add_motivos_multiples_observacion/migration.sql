INSERT INTO "motivo_observacion" ("codigo", "etiqueta") VALUES
  ('datos_no_coinciden', 'Datos no coinciden'),
  ('documento_ilegible', 'Documento ilegible'),
  ('documento_vencido',  'Documento vencido')
ON CONFLICT ("codigo") DO NOTHING;