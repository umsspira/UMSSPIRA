export interface SurveyAdminInput {
  title: string;
  startDate: Date;
  endDate: Date;
  format?: string;
  /** Carrera de la encuesta; obligatoria si el administrador tiene más de una. */
  careerId?: string;
}

export interface SurveyAdminPatch {
  title?: string;
  startDate?: Date;
  endDate?: Date;
  format?: string;
}

export interface SurveyAdminRecord {
  id: string;
  title: string | null;
  startDate: Date | null;
  endDate: Date | null;
  status: string | null;
  format: string | null;
  createdAt: Date | null;
  careerId: string | null;
}
