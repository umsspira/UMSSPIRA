export interface ManagedSurvey {
  id: string;
  title: string | null;
  startDate: string | null;
  endDate: string | null;
  status: string | null; // 'BORRADOR' | 'PUBLICADA'
  careerId: string | null;
}

/** Carrera asignada al administrador, con el nombre como se muestra en pantalla. */
export interface AdminCareer {
  id: string;
  name: string;
}

export interface SurveyFormValues {
  title: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  careerId?: string; // solo al crear, si el administrador tiene varias carreras; ALL_CAREERS = todas
}
/** Valor de «Todas las carreras» en el campo Carrera: la misma encuesta en cada carrera del administrador. */
export const ALL_CAREERS = 'todas';
