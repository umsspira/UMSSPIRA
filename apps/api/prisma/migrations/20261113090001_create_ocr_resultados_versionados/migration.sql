CREATE TABLE ocr_resultado (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 id_trabajo uuid NOT NULL UNIQUE REFERENCES ocr_trabajo(id),
 resultado jsonb NOT NULL,
 creado_en timestamptz NOT NULL DEFAULT now()
);
-- No trigger on dictamen, correo_pendiente or correo_tramite: OCR never decides or sends mail.
