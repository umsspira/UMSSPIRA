import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

type Crumb = { label: string; href?: string };

export function PageHeading({
  crumbs,
  title,
  description,
  action,
}: {
  crumbs: Crumb[];
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-2">
        <nav aria-label="Ruta de navegación">
          <ol className="flex flex-wrap items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[oklch(0.5_0.01_60)]">
            {crumbs.map((crumb, index) => {
              const isLast = index === crumbs.length - 1;
              return (
                <li key={crumb.label} className="flex items-center gap-1.5">
                  {crumb.href && !isLast ? (
                    <Link href={crumb.href} className="transition-colors hover:text-[oklch(0.68_0.18_48)]">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span
                      aria-current={isLast ? "page" : undefined}
                      className={isLast ? "text-[oklch(0.68_0.18_48)]" : undefined}
                    >
                      {crumb.label}
                    </span>
                  )}
                  {!isLast && <ChevronRight className="size-3.5" aria-hidden="true" />}
                </li>
              );
            })}
          </ol>
        </nav>
        <h1 className="text-2xl font-bold text-balance text-[oklch(0.22_0.01_60)]">{title}</h1>
        {description && <p className="text-sm text-pretty text-[oklch(0.5_0.01_60)]">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export const PROFILE_CRUMB = {
  label: "Perfil de vinculación",
  href: "/perfil/formacion",
};
export const EDUCATION_CRUMB = {
  label: "Mi formación académica",
  href: "/perfil/formacion",
};
