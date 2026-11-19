import { ViewProjectButton } from '@/modules/profile/components/view-project-button';
import type { ProjectRecord } from '@/modules/profile/types/profile-record';

// Del más reciente al más antiguo (T19.5); sin fecha quedan al final en el orden en que llegaron
export function sortProjectsByRecency(projects: ProjectRecord[]): ProjectRecord[] {
  return projects
    .map((project, index) => ({ project, index }))
    .sort((a, b) => {
      const dateA = a.project.createdAt ?? '';
      const dateB = b.project.createdAt ?? '';
      if (dateA !== dateB) return dateA < dateB ? 1 : -1;
      return a.index - b.index;
    })
    .map(({ project }) => project);
}

// Sección «Proyectos» del resumen (HU-19, T19.5), con «Ver proyecto» de la HU-20 en cada uno
export default function ProjectsSection({ projects }: { projects: ProjectRecord[] }) {
  return (
    <section aria-labelledby="proyectos-titulo" className="mt-6 border-t border-oatmeal pt-5">
      <h2 id="proyectos-titulo" className="text-lg font-bold text-blue-fantastic">
        Proyectos
      </h2>
      {projects.length === 0 ? (
        <p className="mt-2 text-sm text-blue-fantastic/60">Sin registros</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-3">
          {sortProjectsByRecency(projects).map((project) => (
            <li
              key={project.id}
              className="flex flex-col gap-3 rounded-xl border border-oatmeal bg-white p-4 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="min-w-0 space-y-1">
                <h3 className="break-words text-base font-bold text-blue-fantastic">{project.name}</h3>
                <p className="break-words text-sm text-blue-fantastic/80">{project.description}</p>
                {project.technologies && (
                  <p className="break-words text-xs font-semibold text-truffle-trouble">{project.technologies}</p>
                )}
              </div>
              <ViewProjectButton
                project={{
                  name: project.name,
                  url: project.url,
                  description: project.description,
                  technologies: project.technologies
                    ? project.technologies.split(',').map((technology) => technology.trim()).filter(Boolean)
                    : undefined,
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
