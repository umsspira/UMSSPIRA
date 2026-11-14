import type {
  TechnicalRequirementLevel,
  TechnicalRequirementType,
} from '@umsspira/shared-types';

export interface TechnicalRequirement {
  id: string;
  vacancyId: string;
  competency: string;
  expectedLevel: TechnicalRequirementLevel;
  type: TechnicalRequirementType;
  description: string | null;
  createdAt: Date;
}

export interface TechnicalRequirementsForVacancy {
  vacancyId: string;
  vacancyTitle: string;
  requirements: TechnicalRequirement[];
}
