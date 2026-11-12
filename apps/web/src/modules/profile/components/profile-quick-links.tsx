import Link from 'next/link';

const QUICK_LINKS = [
  { label: 'Mi perfil', href: '/profile' },
  { label: 'Mis registros', href: '/profile/records' },
  { label: 'Mi afinidad', href: '/afinidad' },
] as const;

type ProfileQuickLinksProps = {
  // Pantalla actual: se marca y no se enlaza a sí misma
  current?: (typeof QUICK_LINKS)[number]['href'];
};

// Camino directo a Mi perfil, Mis registros y Mi afinidad desde cada pantalla del perfil (HU-11)
export function ProfileQuickLinks({ current }: ProfileQuickLinksProps) {
  return (
    <nav aria-label="Accesos del perfil" className="flex flex-wrap gap-2">
      {QUICK_LINKS.map((link) =>
        link.href === current ? (
          <span
            key={link.href}
            aria-current="page"
            className="inline-flex min-h-[44px] items-center rounded-full bg-blue-fantastic px-4 text-sm font-semibold text-white"
          >
            {link.label}
          </span>
        ) : (
          <Link
            key={link.href}
            href={link.href}
            className="inline-flex min-h-[44px] items-center rounded-full border border-oatmeal bg-white px-4 text-sm font-semibold text-blue-fantastic transition hover:bg-palladian"
          >
            {link.label}
          </Link>
        ),
      )}
    </nav>
  );
}
