export interface ManagedSurvey {
  id: string;
  title: string | null;
  startDate: string | null;
  endDate: string | null;
  status: string | null; // 'BORRADOR' | 'PUBLICADA'
}

export interface SurveyFormValues {
  title: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}