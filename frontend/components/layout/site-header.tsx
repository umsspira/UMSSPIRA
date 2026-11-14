import Image from "next/image";
import Link from "next/link";
import { Bell } from "lucide-react";

const NAV_ITEMS = [
  { label: "Inicio", href: "#" },
  { label: "Vacantes", href: "#" },
  { label: "Mis postulaciones", href: "#" },
  { label: "Perfil", href: "/perfil/formacion" },
] as const;

export function SiteHeader({ activeItem = "Perfil" }: { activeItem?: string }) {
  return (
    <header className="border-b border-[oklch(0.91_0.008_80)] bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 px-6 md:h-16 md:flex-nowrap md:gap-6">
        <Link href="/" className="flex shrink-0 items-center gap-2.5 py-4 md:py-0">
          <span className="flex size-9 items-center justify-center">
            <Image
              src="/hu03/umss-emblema.png"
              alt=""
              width={36}
              height={36}
              unoptimized
              className="size-9 object-contain"
            />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-sm font-bold tracking-wide text-[oklch(0.22_0.01_60)]">UMSS</span>
            <span className="text-xs font-medium text-[oklch(0.5_0.01_60)]">Vinculación Laboral</span>
          </span>
        </Link>

        <nav aria-label="Navegación principal" className="order-last w-full md:order-none md:h-full md:w-auto">
          <ul className="flex h-full items-center justify-between gap-3 md:gap-8">
            {NAV_ITEMS.map((item) => {
              const isActive = item.label === activeItem;
              return (
                <li key={item.label} className="h-full">
                  <Link
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={`flex h-full items-center whitespace-nowrap border-b-2 py-3 text-xs font-medium transition-colors md:py-0 md:text-sm ${
                      isActive
                        ? "border-[oklch(0.68_0.18_48)] text-[oklch(0.22_0.01_60)]"
                        : "border-transparent text-[oklch(0.5_0.01_60)] hover:text-[oklch(0.22_0.01_60)]"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-2 sm:gap-4">
          <button
            type="button"
            className="relative rounded-full p-2 text-[oklch(0.5_0.01_60)] transition-colors hover:bg-[oklch(0.96_0.004_80)] hover:text-[oklch(0.22_0.01_60)]"
            aria-label="Notificaciones"
          >
            <Bell className="size-5" aria-hidden="true" />
            <span className="absolute right-2 top-2 size-2 rounded-full bg-[oklch(0.68_0.18_48)]" aria-hidden="true" />
          </button>
          <div className="flex items-center gap-3">
            <Image
              src="/hu03/placeholder-user.jpg"
              alt=""
              width={36}
              height={36}
              unoptimized
              className="size-9 rounded-full object-cover"
            />
            <div className="hidden flex-col leading-tight sm:flex">
              <span className="text-sm font-semibold text-[oklch(0.22_0.01_60)]">Carlos Rojas</span>
              <span className="text-xs text-[oklch(0.5_0.01_60)]">Egresado</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
