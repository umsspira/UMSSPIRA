export type OcrLine = {
  text: string;
  confidence: number;
  page: number;
  box?: number[][];
};
export type OcrReading = {
  lines: OcrLine[];
  pagesRead: number;
  totalPages: number;
  partial: boolean;
  engine: string;
  loadMs: number;
  readMs: number;
  memoryBytes?: number;
};
export type OcrFinding = {
  field: string;
  label: string;
  declared: string;
  read: string | null;
  status: "COINCIDE" | "POSIBLE_DIFERENCIA" | "NO_COMPROBADO";
  evidence: OcrLine | null;
  reason: string;
};
export type OcrResult = {
  findings: OcrFinding[];
  suggestion: "APROBAR" | "OBSERVAR" | "RECHAZAR" | "REVISION_MANUAL";
  reason: string;
  reading: OcrReading;
  rulesVersion: string;
};
export type OcrJob = {
  id: string;
  applicationId: string;
  revision: number;
  token: string;
  expiresAt: string;
};
export type OcrAnalysis = {
  id: string;
  revision: number;
  status: "PENDIENTE" | "EN_CURSO" | "COMPLETADO" | "FALLIDO" | "DESCARTADO";
  current: boolean;
  createdAt: string;
  completedAt: string | null;
  error: string | null;
  result: OcrResult | null;
};
