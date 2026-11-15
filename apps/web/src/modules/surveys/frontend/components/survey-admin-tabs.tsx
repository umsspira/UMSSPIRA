'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { href: '/reports/encuestas', label: 'Respuestas' },
  { href: '/reports/encuestas/gestion', label: 'Gestión de encuestas' },
] as const;

export function SurveyAdminTabs() {
  const pathname = usePathname() ?? '';
  return (
    <nav aria-label="Encuestas de empleabilidad" className="flex min-w-0 gap-4 border-b border-oatmeal">
      {tabs.map(({ href, label }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={
              '-mb-px border-b-2 px-1 py-3 text-sm font-semibold ' +
              (active
                ? 'border-abyssal-blue text-abyssal-blue'
                : 'border-transparent text-abyssal-blue/60 hover:text-abyssal-blue')
            }
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}