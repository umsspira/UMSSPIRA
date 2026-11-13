"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { LogoutButton } from "./logout-button";

// Encabezado del área personal: sin ningún menú administrativo (CA-05.3 y CA-05.5).
// Solo agrega el acceso al perfil profesional del titulado (Épica 2).
export function TituladoHeader() {
  const pathname = usePathname();
  const mentorshipActive = pathname === "/mentorship" || pathname.startsWith("/mentorship/");

  return (
    <header className="w-full bg-abyssal-blue">
      <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-6">
        <span className="font-display text-lg font-bold text-white">UMSSPIRA</span>
        <nav aria-label="Navegacion del titulado" className="flex items-center gap-6">
          <Link
            href="/mentorship"
            aria-current={mentorshipActive ? "page" : undefined}
            className={`relative inline-flex h-[72px] items-center text-sm ${
              mentorshipActive ? "font-semibold text-white" : "font-medium text-white/90 hover:text-white"
            }`}
          >
            Mentorías
            {mentorshipActive ? (
              <span
                aria-hidden="true"
                data-active-indicator="true"
                className="absolute inset-x-0 bottom-[18px] h-[3px] rounded bg-[#ffb162]"
              />
            ) : null}
          </Link>
          <Link href="/profile" className="text-sm font-medium text-white/90 hover:text-white">
            Mi perfil profesional
          </Link>
          <LogoutButton />
        </nav>
      </div>
    </header>
  );
}
