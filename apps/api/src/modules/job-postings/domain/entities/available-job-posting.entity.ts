export interface AvailableJobPosting {
  id: string;
  title: string;
  companyName: string;
  companyLogoUrl: string | null;
  technicalDescription: string;
  area: string | null;
  modality: string;
  experienceLevel: string;
  location: string | null;
  publishedAt: Date | null;
  affinityPercentage: number | null;
}
