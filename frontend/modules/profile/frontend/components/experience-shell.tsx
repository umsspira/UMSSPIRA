import Link from "next/link";
import type { ReactNode } from "react";

export function ExperienceShell({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-[calc(100vh-76px)] bg-[#f3efe5] text-[#263747]">
      <div className="mx-auto w-full max-w-7xl px-5 pb-10 pt-8 sm:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm">
            <Link href="/perfil/experiencia-laboral" className="font-semibold text-[#17384b] hover:underline">
              Perfil
            </Link>
            <span aria-hidden="true" className="text-slate-400">/</span>
            <span aria-current="page" className="text-slate-600">Experiencia laboral</span>
          </div>
          <nav aria-label="Secciones del perfil" className="flex items-center gap-5 border-b border-[#e7e0d4] text-sm">
            <Link
              href="/perfil/experiencia-laboral"
              aria-current="page"
              className="border-b-2 border-[#ed9635] px-1 pb-2 font-semibold text-[#17384b]"
            >
              Experiencia laboral
            </Link>
            <Link
              href="/skills"
              className="border-b-2 border-transparent px-1 pb-2 text-slate-500 hover:text-[#17384b]"
            >
              Mis habilidades
            </Link>
            <Link
              href="/perfil/formacion"
              className="border-b-2 border-transparent px-1 pb-2 text-slate-500 hover:text-[#17384b]"
            >
              Formación académica
            </Link>
          </nav>
        </div>
        {children}
      </div>
    </div>
  );
}
