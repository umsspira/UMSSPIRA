import type {
  InterestCatalogGroup,
  MentorAreas,
  MentorInterest,
} from '../../domain/entities/mentor';

export const MENTOR_CATALOG_REPOSITORY = Symbol('MENTOR_CATALOG_REPOSITORY');

export interface CreateCustomInterestResult {
  interest: MentorInterest;
  coincidenciaSugerido: boolean;
  mensaje?: string;
}

export interface MentorCatalogRepository {
  areas(userId: string): Promise<MentorAreas>;
  setAreas(userId: string, ids: string[]): Promise<MentorAreas>;
  interestCatalog(userId: string): Promise<InterestCatalogGroup[]>;
  interests(userId: string): Promise<MentorInterest[]>;
  saveInterests(userId: string, areaIds: string[], topicIds: string[]): Promise<MentorAreas>;
  addInterests(userId: string, ids: string[]): Promise<MentorInterest[]>;
  removeInterest(userId: string, id: string): Promise<void>;
  createCustomInterest(userId: string, areaId: string, text: string): Promise<CreateCustomInterestResult>;
  updateCustomInterest(userId: string, id: string, text: string): Promise<MentorInterest>;
  removeCustomInterest(userId: string, id: string): Promise<void>;
}
