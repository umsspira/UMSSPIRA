export interface PublishedJobPosting {
  id: string;
  title: string | null;
  modality: string | null;
  experienceLevel: string | null;
  technicalDescription: string | null;
  publishedAt: Date | null;
  company: {
    name: string | null;
    description: string | null;
    logoUrl: string | null;
    bannerUrl: string | null;
  } | null;
  technicalRequirements: Array<{
    areaId: string | null;
    name: string;
    level: string | null;
  }>;
}

export interface PublishedJobPostingDetail extends PublishedJobPosting {
  affinityPercentage: number | null;
  affinityMessage: string | null;
  publishedTechnicalRequirements: import('../../application/ports/published-technical-requirements-reader.port').PublishedTechnicalRequirement[];
}
