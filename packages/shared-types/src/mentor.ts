export type ConditionId = 'egresado';
export type UserRole = 'ADMIN' | 'MENTOR' | 'STUDENT' | 'USER' | string;

export interface Requirements {
  id?: string;
  egresado?: boolean;
  [key: string]: any;
}

export interface MentorState {
  isActive: boolean;
  requirements: any;
}

export interface MentorDirectoryArea {
  id: string;
  nombre: string;
}

/** Respuesta pública de GET /api/v1/mentorship/profiles (HU 6.7). */
export interface MentorDirectoryResponse {
  data: {
    id: string;
    nombre: string;
    descripcion: string | null;
    foto_perfil: string | null;
    esta_activo: boolean | null;
    areas: MentorDirectoryArea[];
    availabilityStatus: 'AVAILABLE' | 'PAUSED' | 'UNAVAILABLE' | null;
    cargo: string | null;
    empresa: string | null;
    intereses: (MentorDirectoryArea & { area: MentorDirectoryArea })[];
  }[];
  total: number;
  catalog: { area: MentorDirectoryArea; intereses: MentorDirectoryArea[] }[];
}

export interface ObservedApplicationDetail {
  id: string;
  status?: string;
  observation?: string;
  comments?: string;
  [key: string]: any;
}

export interface ActivateCompanyInvitationPayload {
  token?: string;
  password?: string;
  [key: string]: any;
}

export interface CompanyInvitationResponse {
  success?: boolean;
  message?: string;
  [key: string]: any;
}

export type RegisteredCompanyResponse = any;

export interface CompanyItem {
  id: string;
  name?: string;
  taxId?: string;
  invitations: CompanyInvitationItem[];
  [key: string]: any;
}

export interface CompanyRegistryPage {
  items: CompanyItem[];
  total: number;
  page: number;
  pageSize: number;
  [key: string]: any;
}

export interface CompanyInvitationItem {
  id: string;
  email: string;
  status?: string;
  [key: string]: any;
}



