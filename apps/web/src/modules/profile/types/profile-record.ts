export type RecordSection = 'education' | 'experience' | 'certification' | 'project';

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
  // HU-18: el respaldo puede ser un documento PDF o una foto JPG
  backupType?: 'pdf' | 'image';
};

// Proyecto o portafolio del egresado (HU-19)
export type ProjectRecord = OwnedRecord & {
  name: string;
  // Siempre https (T19.2)
  url: string;
  description: string;
  // Opcional; texto libre, por ejemplo «React, NestJS»
  technologies?: string;
  // Fecha de registro, para ordenar del más reciente al más antiguo (T19.5)
  createdAt?: string;
};

export type ProfileRecord = EducationRecord | ExperienceRecord | CertificationRecord | ProjectRecord;

export type ProfileRecords = Record<RecordSection, ProfileRecord[]>;

export type DeleteRecordErrorCode = 'network' | 'forbidden';
