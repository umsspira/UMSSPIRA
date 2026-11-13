import { Pencil, Trash2 } from 'lucide-react';

import type { ProjectRecord } from '@/modules/profile/types/profile-record';
import { getProjectColumns } from '@/modules/profile/utils/record-columns';

type ProjectRecordsTableProps = {
  projects: ProjectRecord[];
  onEdit: (project: ProjectRecord) => void;
  onDelete: (project: ProjectRecord) => void;
};

type ProjectActionsProps = {
  project: ProjectRecord;
  onEdit: ProjectRecordsTableProps['onEdit'];
  onDelete: ProjectRecordsTableProps['onDelete'];
};

// Mismos íconos sin borde que la tabla de registros
const actionClassName =
  'flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-palladian';

function ProjectActions({ project, onEdit, onDelete }: ProjectActionsProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label="Editar proyecto"
        title="Editar proyecto"
        onClick={() => onEdit(project)}
        className={`${actionClassName} text-blue-fantastic`}
      >
        <Pencil className="h-4 w-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-label="Eliminar proyecto"
        title="Eliminar proyecto"
        onClick={() => onDelete(project)}
        className={`${actionClassName} text-truffle-trouble`}
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

function ProjectLink({ url }: { url: string }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="break-all text-truffle-trouble underline">
      {url}
    </a>
  );
}

// Pestaña Proyectos de Mis registros (HU-19, T19.4): del más reciente al más antiguo
export function ProjectRecordsTable({ projects, onEdit, onDelete }: ProjectRecordsTableProps) {
  const [nameColumn, urlColumn, descriptionColumn] = getProjectColumns();
  const sorted = [...projects].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  if (sorted.length === 0) {
    return (
      <p className="rounded-2xl border border-abyssal-blue/10 bg-white px-6 py-10 text-center text-sm text-blue-fantastic/70">
        Aún no tienes proyectos guardados.
      </p>
    );
  }

  return (
    <>
      {/* Tabla de escritorio */}
      <div className="hidden overflow-hidden rounded-2xl border border-abyssal-blue/10 bg-white md:block">
        <table className="w-full table-fixed text-left text-sm">
          <thead className="bg-palladian/50">
            <tr>
              {[nameColumn.label, urlColumn.label, descriptionColumn.label, 'Acciones'].map((label) => (
                <th
                  key={label}
                  scope="col"
                  className="px-5 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-blue-fantastic/70"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((project) => (
              <tr key={project.id} className="border-t border-oatmeal/60">
                <td className="px-5 py-4 font-semibold text-blue-fantastic">{nameColumn.getValue(project)}</td>
                <td className="px-5 py-4">
                  <ProjectLink url={project.url} />
                </td>
                <td className="px-5 py-4 text-blue-fantastic/80">{descriptionColumn.getValue(project) || '—'}</td>
                <td className="px-5 py-4">
                  <ProjectActions project={project} onEdit={onEdit} onDelete={onDelete} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Tarjetas en móvil */}
      <ul className="flex flex-col gap-3 md:hidden">
        {sorted.map((project) => (
          <li
            key={project.id}
            className="flex items-start justify-between gap-3 rounded-2xl border border-abyssal-blue/10 bg-white p-4"
          >
            <div className="min-w-0 space-y-1">
              <p className="text-base font-bold text-blue-fantastic">{project.name}</p>
              <p className="text-sm">
                <ProjectLink url={project.url} />
              </p>
              {project.description && <p className="text-xs text-blue-fantastic/60">{project.description}</p>}
            </div>
            <ProjectActions project={project} onEdit={onEdit} onDelete={onDelete} />
          </li>
        ))}
      </ul>
    </>
  );
}
