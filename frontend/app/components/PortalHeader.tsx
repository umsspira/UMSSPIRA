'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Briefcase,
  ChevronDown,
  GraduationCap,
  Menu,
  PlusCircle,
  Search,
  Sparkles,
  User,
  X,
} from 'lucide-react';

const jobsIdentityFallback = {
  name: 'Portal de egresados',
  description: 'UMSS · Vinculación Laboral',
};

interface SubNavItem {
  label: string;
  description: string;
  href: string;
  icon?: typeof Briefcase;
}

interface NavItem {
  label: string;
  href: string;
  subItems?: SubNavItem[];
}

const navItems: NavItem[] = [
  { label: 'Inicio', href: '/' },
  {
    label: 'Vacantes',
    href: '/vacantes',
    subItems: [
      {
        label: 'Bolsa de trabajo',
        description: 'Explora y busca oportunidades laborales disponibles',
        href: '/vacantes',
        icon: Briefcase,
      },
      {
        label: 'Mis vacantes',
        description: 'Gestiona las vacantes registradas de tu empresa',
        href: '/mis-vacantes',
        icon: Briefcase,
      },
      {
        label: 'Publicar vacante',
        description: 'Crea y registra una nueva oportunidad laboral',
        href: '/vacantes/nueva',
        icon: PlusCircle,
      },
      {
        label: 'Requisitos técnicos',
        description: 'Asocia competencias técnicas e indexación para matching',
        href: '/vacantes/nueva/requisitos',
        icon: Sparkles,
      },
      {
        label: 'Disponibilidad',
        description: 'Consulta vacantes por estado o identificador',
        href: '/vacantes/disponibilidad',
        icon: Briefcase,
      },
    ],
  },
  { label: 'Mis postulaciones', href: '/postulaciones' },
  {
    label: 'Perfil',
    href: '/perfil/experiencia-laboral',
    subItems: [
      {
        label: 'Experiencia laboral',
        description: 'Historial y trayectorias profesionales',
        href: '/perfil/experiencia-laboral',
        icon: User,
      },
      {
        label: 'Formación académica',
        description: 'Títulos, estudios universitarios y cursos',
        href: '/perfil/formacion',
        icon: GraduationCap,
      },
      {
        label: 'Habilidades técnicas',
        description: 'Competencias técnicas y conocimientos clave',
        href: '/skills',
        icon: Sparkles,
      },
    ],
  },
];

function isItemActive(item: NavItem, pathname?: string | null): boolean {
  if (!pathname) return false;
  if (item.href === '/') {
    return pathname === '/';
  }
  if (item.label === 'Vacantes') {
    return (
      pathname.startsWith('/vacantes') || pathname.startsWith('/mis-vacantes')
    );
  }
  if (item.label === 'Mis postulaciones') {
    return pathname.startsWith('/postulaciones');
  }
  if (item.label === 'Perfil') {
    return (
      pathname.startsWith('/perfil') ||
      pathname.startsWith('/skills') ||
      pathname.startsWith('/habilidades') ||
      pathname.startsWith('/profile')
    );
  }
  return pathname.startsWith(item.href);
}

function isSubItemActive(subHref: string, pathname?: string | null): boolean {
  if (!pathname) return false;
  if (subHref === '/vacantes') {
    return (
      pathname === '/vacantes' ||
      (/^\/vacantes\/[^/]+$/.test(pathname) &&
        !pathname.startsWith('/vacantes/nueva') &&
        !pathname.startsWith('/vacantes/disponibilidad'))
    );
  }
  return pathname === subHref || pathname.startsWith(`${subHref}/`);
}

function DesktopNavigation({ pathname }: { pathname?: string | null }) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = (label: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpenDropdown(label);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setOpenDropdown(null);
    }, 180);
  };

  const handleLinkClick = () => {
    setOpenDropdown(null);
  };

  return (
    <nav
      aria-label="Navegación principal"
      className="hidden self-stretch lg:flex items-stretch"
    >
      {navItems.map((item) => {
        const active = isItemActive(item, pathname);
        const hasSubItems = item.subItems && item.subItems.length > 0;
        const isOpen = openDropdown === item.label;

        return (
          <div
            key={item.label}
            className="group relative flex items-stretch"
            onMouseEnter={() => hasSubItems && handleMouseEnter(item.label)}
            onMouseLeave={handleMouseLeave}
          >
            <div
              className={`flex items-center px-3.5 transition-colors ${
                active
                  ? 'border-b-[3px] border-[#ffb162]'
                  : 'border-b-[3px] border-transparent'
              }`}
            >
              <Link
                href={item.href}
                onClick={handleLinkClick}
                aria-current={active ? 'page' : undefined}
                className={`text-sm font-medium transition-colors ${
                  active
                    ? 'text-white font-semibold'
                    : 'text-[#eee9df] hover:text-white'
                }`}
              >
                {item.label}
              </Link>
              {hasSubItems && (
                <button
                  type="button"
                  aria-label={`Opciones de ${item.label}`}
                  onClick={(e) => {
                    e.preventDefault();
                    setOpenDropdown(isOpen ? null : item.label);
                  }}
                  className="ml-1 flex h-6 w-6 items-center justify-center rounded hover:bg-white/10 text-[#ffb162]"
                >
                  <ChevronDown
                    size={14}
                    className={`transition-transform duration-200 ${
                      isOpen ? 'rotate-180' : 'group-hover:rotate-180'
                    }`}
                  />
                </button>
              )}
            </div>

            {hasSubItems && (
              <div
                className={`absolute left-0 top-[100%] z-50 w-72 origin-top-left rounded-xl border border-[#2c3b4d] bg-[#172533] p-2 shadow-2xl backdrop-blur-md transition-all ${
                  isOpen ? 'block' : 'hidden group-hover:block'
                }`}
                role="menu"
                aria-label={`Submenú ${item.label}`}
              >
                <div className="space-y-1">
                  {item.subItems!.map((sub) => {
                    const subActive = isSubItemActive(sub.href, pathname);
                    const IconComponent = sub.icon;

                    return (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        onClick={handleLinkClick}
                        role="menuitem"
                        className={`flex items-start gap-3 rounded-lg p-2.5 transition-colors ${
                          subActive
                            ? 'bg-[#22364a] text-white'
                            : 'text-[#eee9df] hover:bg-[#1f2f40] hover:text-white'
                        }`}
                      >
                        {IconComponent && (
                          <div
                            className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                              subActive
                                ? 'bg-[#ffb162] text-[#172533]'
                                : 'bg-[#25394d] text-[#ffb162]'
                            }`}
                          >
                            <IconComponent size={14} />
                          </div>
                        )}
                        <div className="flex-1">
                          <p
                            className={`text-xs font-semibold leading-tight ${
                              subActive ? 'text-[#ffb162]' : 'text-white'
                            }`}
                          >
                            {sub.label}
                          </p>
                          <p className="mt-0.5 text-[11px] leading-snug text-[#9aa9b9]">
                            {sub.description}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

function MobileNavigation({
  pathname,
  isOpen,
  onClose,
}: {
  pathname?: string | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [expandedItem, setExpandedItem] = useState<string | null>('Vacantes');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 top-[84px] z-50 overflow-y-auto bg-[#172533] px-6 py-6 lg:hidden">
      <div className="space-y-4">
        {navItems.map((item) => {
          const active = isItemActive(item, pathname);
          const hasSub = item.subItems && item.subItems.length > 0;
          const isExpanded = expandedItem === item.label;

          return (
            <div
              key={item.label}
              className="rounded-xl border border-[#2c3b4d] bg-[#1b2b3b] p-3"
            >
              <div className="flex items-center justify-between">
                <Link
                  href={item.href}
                  onClick={onClose}
                  className={`text-base font-semibold ${
                    active ? 'text-[#ffb162]' : 'text-white'
                  }`}
                >
                  {item.label}
                </Link>

                {hasSub && (
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedItem(isExpanded ? null : item.label)
                    }
                    className="p-1 text-[#ffb162]"
                    aria-label={`Desplegar ${item.label}`}
                  >
                    <ChevronDown
                      size={18}
                      className={`transition-transform duration-200 ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                )}
              </div>

              {hasSub && isExpanded && (
                <div className="mt-3 space-y-1.5 border-t border-[#2c3b4d] pt-3">
                  {item.subItems!.map((sub) => {
                    const subActive = isSubItemActive(sub.href, pathname);
                    return (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        onClick={onClose}
                        className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                          subActive
                            ? 'bg-[#263c52] font-semibold text-[#ffb162]'
                            : 'text-[#d6dfe7] hover:bg-[#203142]'
                        }`}
                      >
                        <p>{sub.label}</p>
                        <p className="text-xs text-[#8c9cae]">
                          {sub.description}
                        </p>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ActiveNavContainer() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  return (
    <>
      <DesktopNavigation pathname={pathname} />

      {/* Mobile Toggle Button */}
      <button
        type="button"
        aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="flex h-10 w-10 items-center justify-center rounded-lg text-white hover:bg-white/10 lg:hidden"
      >
        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Mobile Menu Drawer */}
      <MobileNavigation
        pathname={pathname}
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />
    </>
  );
}

export default function PortalHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-[#2c3b4d] bg-[#1b2632] text-[#eee9df]">
      <div className="mx-auto flex min-h-[84px] max-w-[1440px] items-center gap-6 px-5 sm:px-8 lg:px-5">
        <Link href="/vacantes" className="flex w-[170px] shrink-0 items-center">
          <Image
            src="/hu04/header-logo.png"
            alt="UMSSPIRA"
            width={170}
            height={56}
            priority
            className="h-auto w-[170px]"
          />
        </Link>

        <Suspense fallback={<DesktopNavigation />}>
          <ActiveNavContainer />
        </Suspense>

        <div className="ml-auto hidden items-center gap-1 md:flex">
          <Link
            href="/vacantes"
            className="flex h-11 w-11 items-center justify-center text-[#eee9df] hover:text-white"
            aria-label="Buscar"
          >
            <Search size={19} />
          </Link>
          <span
            className="flex h-11 w-11 items-center justify-center text-[#eee9df] hover:text-white cursor-pointer"
            aria-label="Mensajes"
          >
            <Image
              src="/hu04/header-messages.svg"
              alt=""
              width={24}
              height={24}
            />
          </span>
          <span
            className="flex h-11 w-11 items-center justify-center text-[#eee9df] hover:text-white cursor-pointer"
            aria-label="Notificaciones"
          >
            <Image
              src="/hu04/header-notifications.svg"
              alt=""
              width={44}
              height={44}
            />
          </span>
          <span className="mx-3 h-11 w-px bg-[#2c3b4d]" />
          <Link
            href="/perfil/experiencia-laboral"
            className="flex items-center gap-2 rounded-lg py-1 px-1.5 transition-colors hover:bg-white/5"
            title="Ir a mi perfil"
          >
            <span
              className="relative flex h-11 w-11 items-center justify-center"
              aria-hidden="true"
            >
              <Image
                src="/hu04/header-avatar.svg"
                alt=""
                width={44}
                height={44}
                className="absolute inset-0"
              />
            </span>
            <span className="hidden xl:block">
              <span className="block text-[13px] font-semibold text-white">
                {jobsIdentityFallback.name}
              </span>
              <span className="block text-[11px] text-[#c9c1b1]">
                {jobsIdentityFallback.description}
              </span>
            </span>
            <Image
              src="/hu04/header-chevron.svg"
              alt=""
              width={14}
              height={14}
              className="ml-1"
            />
          </Link>
        </div>
      </div>
    </header>
  );
}
