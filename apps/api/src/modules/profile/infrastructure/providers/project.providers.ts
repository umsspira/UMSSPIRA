import type { Provider } from '@nestjs/common';
import {
  PROJECT_REPOSITORY,
  type ProjectRepository,
} from '../../application/ports/project-repository.port';
import { PrismaProjectRepository } from '../repositories/prisma-project.repository';
import { ListProjectsUseCase } from '../../application/use-cases/list-projects.use-case';
import { CreateProjectUseCase } from '../../application/use-cases/create-project.use-case';
import { UpdateProjectUseCase } from '../../application/use-cases/update-project.use-case';
import { DeleteProjectUseCase } from '../../application/use-cases/delete-project.use-case';

// Proyectos y portafolio (HU-19), separados de profile.providers para no chocar con otras HU
export const projectProviders: Provider[] = [
  PrismaProjectRepository,
  { provide: PROJECT_REPOSITORY, useExisting: PrismaProjectRepository },
  {
    provide: ListProjectsUseCase,
    inject: [PROJECT_REPOSITORY],
    useFactory: (repository: ProjectRepository) => new ListProjectsUseCase(repository),
  },
  {
    provide: CreateProjectUseCase,
    inject: [PROJECT_REPOSITORY],
    useFactory: (repository: ProjectRepository) => new CreateProjectUseCase(repository),
  },
  {
    provide: UpdateProjectUseCase,
    inject: [PROJECT_REPOSITORY],
    useFactory: (repository: ProjectRepository) => new UpdateProjectUseCase(repository),
  },
  {
    provide: DeleteProjectUseCase,
    inject: [PROJECT_REPOSITORY],
    useFactory: (repository: ProjectRepository) => new DeleteProjectUseCase(repository),
  },
];
