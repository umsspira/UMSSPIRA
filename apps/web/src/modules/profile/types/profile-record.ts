export type RecordSection = 'education' | 'experience' | 'certification';

// Pestañas de Mis registros: las 3 secciones y los proyectos (HU-19, T19.4)
export type RecordsTab = RecordSection | 'projects';

type OwnedRecord = {
  id: string;
  // Egresado dueño del registro
  ownerId: string;
};

export type EducationRecord = OwnedRecord & {
  institution: string;
  title: string;
  graduationYear: string;
  degree: string;
  // Nombre del archivo de respaldo (sin respaldo = undefined)
  backupFile?: string;
  // Dirección del propio archivo; sin dirección el nombre se muestra sin enlace (E2.2)
  backupUrl?: string;
};

export type ExperienceRecord = OwnedRecord & {
  company: string;
  position: string;
  // Formato AAAA-MM-DD
  startDate: string;
  // Vacío = trabajo actual
  endDate: string;
};

export type CertificationRecord = OwnedRecord & {
  name: string;
  issuer: string;
  degree: string;
  issueYear: string;
  // Nombre del archivo de respaldo y si la administración ya lo validó
  backupFile?: string;
  backupUrl?: string;
  backupVerified?: boolean;
};

export type ProfileRecord = EducationRecord | ExperienceRecord | CertificationRecord;

export type ProfileRecords = Record<RecordSection, ProfileRecord[]>;

export type DeleteRecordErrorCode = 'network' | 'forbidden';

// Proyecto o portafolio del egresado (HU-19). No es una sección de registros: va aparte en el estado
export type ProjectRecord = OwnedRecord & {
  name: string;
  // Dirección https del proyecto
  url: string;
  // Descripción corta opcional
  description?: string;
  // Fecha de registro en formato ISO; ordena del más reciente al más antiguo
  createdAt: string;
};
