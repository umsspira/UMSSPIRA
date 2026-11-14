export interface HistoryEvent {
  id: string;
  id_solicitud: string;
  version: number;
  tipo_actor: string; // 'TITULADO', 'SISTEMA', 'ADMINISTRADOR'
  actor_id: string | null;
  accion: string;     // 'ENVIO', 'OCR_ANALISIS', 'DICTAMEN'
  detalle: string | null;
  creado_en: Date;
}

export interface CreateHistoryEventInput {
  id_solicitud: string;
  version: number;
  tipo_actor: string;
  actor_id?: string;
  accion: string;
  detalle?: string;
}