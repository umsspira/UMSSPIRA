// Límites de un proyecto (HU-19); el frontend usa los mismos
export const PROJECT_NAME_MAX_LENGTH = 150;
export const PROJECT_URL_MAX_LENGTH = 2048;
export const PROJECT_DESCRIPTION_MAX_LENGTH = 300;

// Proyecto o portafolio del titulado: solo lo ve y lo cambia el titulado que lo cargó
export interface ProjectRecord {
  id: string;
  graduateId: string;
  name: string;
  url: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date | null;
}
