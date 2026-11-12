import type { ProjectRecord } from '../../domain/entities/project';
import type { ProfileScope } from '../contracts/profile-inputs';
import type { ProjectInput } from '../contracts/project-inputs';

export const PROJECT_REPOSITORY = Symbol('PROJECT_REPOSITORY');

// Proyectos del titulado (HU-19). Todas las operaciones quedan limitadas al titulado del scope
export interface ProjectRepository {
  // Del más reciente al más antiguo
  list(scope: ProfileScope): Promise<ProjectRecord[]>;
  create(scope: ProfileScope, input: ProjectInput): Promise<ProjectRecord>;
  update(scope: ProfileScope, id: string, input: ProjectInput): Promise<ProjectRecord>;
  remove(scope: ProfileScope, id: string): Promise<void>;
}
