import type { Proyecto } from '../../../../generated/prisma/client';
import type { ProjectRecord } from '../../domain/entities/project';

export function toProject(row: Proyecto): ProjectRecord {
  return {
    id: row.id,
    graduateId: row.id_titulado,
    name: row.nombre,
    url: row.url,
    description: row.descripcion,
    createdAt: row.fecha_creacion,
    updatedAt: row.fecha_actualizacion,
  };
}
