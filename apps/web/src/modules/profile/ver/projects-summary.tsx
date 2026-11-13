import { ExternalLink, FolderGit2 } from 'lucide-react';

import type { ProjectRecord } from '@/modules/profile/types/profile-record';

type ProjectsSummaryProps = {
  projects: ProjectRecord[];
  // HU-20 (vista embebida): abre el proyecto; mientras no exista, el botón no hace nada
  onViewProject?: (project: ProjectRecord) => void;
};

// Proyectos y portafolio en el resumen del perfil (HU-19, T19.5): del más reciente al más antiguo
export default function ProjectsSummary({ projects, onViewProject }: ProjectsSummaryProps) {
  const sorted = [...projects].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <section aria-labelledby="projects-summary-title">
      {/* Mismo encabezado que las secciones de la línea de tiempo */}
      <div className="flex gap-4 pb-5">
        <div className="relative flex w-6 shrink-0 justify-center" aria-hidden="true">
          <span className="relative mt-1.5 h-3 w-3 rounded-full border-2 border-palladian bg-truffle-trouble" />
        </div>
        <h2
          id="projects-summary-title"
          className="text-sm font-extrabold uppercase tracking-[0.2em] text-truffle-trouble"
        >
          Proyectos y portafolio
        </h2>
      </div>

      {sorted.length === 0 ? (
        <p className="pb-8 pl-10 text-sm font-medium text-blue-fantastic/60">Sin registros</p>
      ) : (
        <ul aria-label="Proyectos" className="flex flex-col gap-3 pb-8 md:pl-10">
          {sorted.map((project) => (
            <li
              key={project.id}
              className="flex flex-col gap-3 rounded-xl border border-oatmeal bg-palladian/40 p-4 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white">
                  <FolderGit2 className="h-4 w-4 text-blue-fantastic" aria-hidden="true" />
                </span>
                <div className="min-w-0 space-y-1">
                  <h3 className="text-base font-bold text-blue-fantastic">{project.name}</h3>
                  <a
                    href={project.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex max-w-full items-center gap-1 break-all text-xs font-medium text-truffle-trouble underline"
                  >
                    {project.url}
                    <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                  </a>
                  {project.description && <p className="text-xs text-blue-fantastic/70">{project.description}</p>}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onViewProject?.(project)}
                aria-label={`Ver proyecto ${project.name}`}
                className="w-full shrink-0 rounded-lg border border-oatmeal bg-white px-4 py-2 text-xs font-bold text-blue-fantastic transition hover:bg-palladian sm:w-auto"
              >
                Ver proyecto
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
