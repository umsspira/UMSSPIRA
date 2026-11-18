export interface JobPostingAvailabilityCandidate {
  status: string | null;
  closingDate: Date | null;
}

export interface JobPostingListCandidate extends JobPostingAvailabilityCandidate {
  id: string;
  title: string;
  companyName: string | null;
  technicalDescription: string | null;
  modality: string | null;
  publicationDate: Date | null;
}

export interface TechnicalRequirementCandidate {
  id: string;
  name: string;
  normalizedName: string;
}

export interface JobPostingDetailCandidate extends JobPostingListCandidate {
  technicalDescription: string | null;
  modality: string | null;
  experienceLevel: string | null;
  requirements: TechnicalRequirementCandidate[];
}
