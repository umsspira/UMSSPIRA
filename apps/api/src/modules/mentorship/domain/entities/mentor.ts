export interface Mentor {
  id: string;
  graduateId: string;
  graduateName: string;
  careerId: string | null;
  active: boolean;
  description: string | null;
  experience: string | null;
  relevantInformation: string | null;
  photoUrl: string | null;
  experienceYears: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export type AvailabilityStatus = 'DISPONIBLE' | 'EN_PAUSA' | 'NO_DISPONIBLE';

export interface MentorAvailability {
  status: AvailabilityStatus | null;
  updatedAt: Date | null;
}

export interface AreaReference {
  id: string;
  name: string;
}

export interface MentorInterest extends AreaReference {
  area: AreaReference;
}

export interface MentorAreas {
  catalog: AreaReference[];
  selectedIds: string[];
  interests: MentorInterest[];
}

export interface InterestCatalogGroup {
  area: AreaReference;
  interests: (MentorInterest & { selected: boolean })[];
}

export interface DirectoryMentor {
  mentor: Mentor;
  areas: AreaReference[];
  availability: AvailabilityStatus | null;
}
