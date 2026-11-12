import type { ProjectRecord } from '../../domain/entities/project';

export function presentProject(project: ProjectRecord) {
  return {
    id: project.id,
    idTitulado: project.graduateId,
    nombre: project.name,
    url: project.url,
    descripcion: project.description,
    fechaCreacion: project.createdAt.toISOString(),
    fechaActualizacion: project.updatedAt?.toISOString() ?? null,
  };
}
