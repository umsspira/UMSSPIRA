export type GraduateStatus = 'VERIFICADO' | 'OBSERVADO';

export interface Graduate {
  id: string;
  registrationNumber: string;
  fullName: string;
  sisCode: string;
  phone: string;
  email: string;
  admissionDate: string;
  degreeDate: string | null;
  studyDuration: string;
  reviewDate: string;
  rejectionReason: string | null;
  status: GraduateStatus;
}

