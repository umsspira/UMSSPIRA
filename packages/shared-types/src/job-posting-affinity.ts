/** Límite compartido; el borde HTTP debe validar tamaño, UUID y duplicados. */
export const JOB_POSTING_AFFINITY_BATCH_LIMIT = 50;

export interface JobPostingAffinityComparison {
  requirement: string;
  matchedSkill: string | null;
  result: 'exact' | 'similar' | 'not-found';
}

/** Porcentaje entero redondeado; calculatedAt es una fecha ISO del servidor. */
export type JobPostingAffinityResult =
  | {
      status: 'ready';
      percentage: number;
      calculatedAt: string;
      comparison: JobPostingAffinityComparison[];
    }
  | {
      status: 'profile-incomplete' | 'no-requirements';
      percentage: null;
      calculatedAt: null;
      comparison: [];
    };

/** Estado técnico del resultado persistido; no modifica la etapa de postulación. */
export type JobPostingStoredMatchStatus = JobPostingAffinityResult['status'] | 'pending' | 'error';

/** El servidor resuelve identidad y alcance; no se aceptan textos ni porcentajes. */
export type JobPostingAffinityBatchRequest =
  | {
      mode: 'vacancies';
      vacancyIds: string[];
    }
  | {
      mode: 'applicants';
      vacancyId: string;
      applicationIds: string[];
    };

export interface JobPostingAffinityBatchError {
  code: string;
  message: string;
  retryable: boolean;
}

/** Un fallo individual conserva su posición e identidad dentro de data. */
export type JobPostingAffinityBatchItem = {
  vacancyId: string;
  applicationId?: string;
} & (
  | {
      result: JobPostingAffinityResult;
      error: null;
    }
  | {
      result: null;
      error: JobPostingAffinityBatchError;
    }
);

export interface JobPostingAffinityBatchResponse {
  data: JobPostingAffinityBatchItem[];
}
