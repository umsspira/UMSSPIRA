CREATE TABLE ocr_trabajo (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 id_solicitud uuid NOT NULL REFERENCES solicitud(id),
 revision integer NOT NULL,
 id_documento uuid NOT NULL REFERENCES documento_respaldo(id),
 declarado jsonb NOT NULL,
 estado varchar(20) NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE','EN_CURSO','COMPLETADO','FALLIDO','DESCARTADO')),
 intentos integer NOT NULL DEFAULT 0,
 reserva_token uuid,
 reservado_por uuid REFERENCES usuario(usuario_id),
 reserva_hasta timestamptz,
 creado_en timestamptz NOT NULL DEFAULT now(),
 finalizado_en timestamptz,
 error varchar(300),
 UNIQUE(id_solicitud,revision)
);
CREATE INDEX ocr_trabajo_cola ON ocr_trabajo(estado,creado_en);
CREATE FUNCTION hu13_encolar() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.estado IN ('PENDIENTE','PENDING') AND NEW.id_documento_respaldo IS NOT NULL THEN
  INSERT INTO ocr_trabajo(id_solicitud,revision,id_documento,declarado)
   SELECT NEW.id,NEW.version_vigente,NEW.id_documento_respaldo,
     jsonb_build_object('nombre',d.nombre,'apellido',d.apellido,'ci',d.ci,
       'carrera',c.nombre,'anio_egreso',d.anio_egreso,'cod_sis',d.cod_sis)
   FROM detalle_solicitud d LEFT JOIN carrera c ON c.id=d.id_carrera
   WHERE d.id=NEW.id_detalle_solicitud ON CONFLICT DO NOTHING;
 END IF;
 UPDATE ocr_trabajo SET estado='DESCARTADO',reserva_token=NULL,reserva_hasta=NULL
 WHERE id_solicitud=NEW.id AND revision<>NEW.version_vigente AND estado IN ('PENDIENTE','EN_CURSO');
 RETURN NEW;
END $$;
CREATE TRIGGER hu13_encolar AFTER INSERT OR UPDATE ON solicitud FOR EACH ROW EXECUTE FUNCTION hu13_encolar();
-- Existing pending applications also become eligible, without modifying their official state.
INSERT INTO ocr_trabajo(id_solicitud,revision,id_documento,declarado)
 SELECT s.id,s.version_vigente,s.id_documento_respaldo,
 jsonb_build_object('nombre',d.nombre,'apellido',d.apellido,'ci',d.ci,'carrera',c.nombre,'anio_egreso',d.anio_egreso,'cod_sis',d.cod_sis)
 FROM solicitud s JOIN detalle_solicitud d ON d.id=s.id_detalle_solicitud
 LEFT JOIN carrera c ON c.id=d.id_carrera
 WHERE s.estado IN ('PENDIENTE','PENDING') AND s.id_documento_respaldo IS NOT NULL;
