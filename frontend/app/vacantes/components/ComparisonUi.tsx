import type { ReactNode } from 'react';
import Link from 'next/link';

export function ComparisonBreadcrumbs({
  vacancyId,
  current,
}: {
  vacancyId: string;
  current: string;
}) {
  return (
    <nav
      aria-label="Ruta de navegación"
      className="mb-7 flex items-center gap-2 text-sm text-[#44474D]"
    >
      <Link href="/vacantes" className="hover:underline">
        Vacantes
      </Link>
      <span aria-hidden="true" className="text-[#9A9CA1]">/</span>
      <Link
        href={`/vacantes/${encodeURIComponent(vacancyId)}`}
        className="hover:underline"
      >
        Detalle de vacante
      </Link>
      <span aria-hidden="true" className="text-[#9A9CA1]">/</span>
      <span aria-current="page" className="font-semibold">
        {current}
      </span>
    </nav>
  );
}

export function LocalDataNotice() {
  return (
    <aside className="mt-6 rounded border border-[#E8D8C4] bg-[#FFF9F0] px-5 py-4 text-sm leading-6 text-[#55565A]">
      <strong className="font-semibold text-[#000B21]">
        Datos locales:
      </strong>{' '}
      esta comparación se calcula en este navegador con las habilidades
      guardadas en tu perfil y los requisitos de la vacante. El backend aún no
      está conectado; algunas vacantes y habilidades iniciales pueden ser datos
      de demostración. Verifica tu perfil antes de tomar decisiones.
    </aside>
  );
}

export function ComparisonFooter() {
  return (
    <footer className="mt-10 border-t border-[#E7E6E3] bg-white px-5 py-5 text-center text-xs text-[#66686D]">
      Portal de Vinculación Laboral · Universidad Mayor de San Simón
    </footer>
  );
}

export function ComparisonPageFrame({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <main className="min-h-[calc(100vh-76px)] bg-[#FAF9F6] text-[#000B21]">
      <div className="mx-auto max-w-[1240px] px-5 pb-4 pt-7">{children}</div>
    </main>
  );
}
