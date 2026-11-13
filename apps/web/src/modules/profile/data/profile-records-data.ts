import type { ProfileRecords, RecordSection, RecordsTab } from '@/modules/profile/types/profile-record';

// Perfil sin registros: estado inicial mientras llega GET /api/v1/perfil
export const EMPTY_PROFILE_RECORDS: ProfileRecords = {
  education: [],
  experience: [],
  certification: [],
};

// "Mis registros" abierto en una pestaña (para volver a la sección desde la que se editó)
export function recordsHref(section: RecordsTab): string {
  return `/profile/records?seccion=${section}`;
}

export function toRecordSection(value: string | undefined): RecordSection {
  return value === 'experience' || value === 'certification' ? value : 'education';
}

export const SECTION_LABELS: Record<RecordSection, string> = {
  education: 'Formación académica',
  experience: 'Experiencia',
  certification: 'Certificaciones',
};

// Pestaña abierta en Mis registros; acepta también la de proyectos (HU-19, T19.4)
export function toRecordsTab(value: string | undefined): RecordsTab {
  return value === 'projects' ? value : toRecordSection(value);
}

export const RECORDS_TAB_LABELS: Record<RecordsTab, string> = {
  ...SECTION_LABELS,
  projects: 'Proyectos',
};
