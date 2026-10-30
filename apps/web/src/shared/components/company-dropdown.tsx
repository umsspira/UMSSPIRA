"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import {
  DEMO_MODE,
  clearToken,
  hasValidSession,
} from "@/shared/services/api-client";
import { getCompanyHeader } from "@/shared/services/companies";

interface CompanyDropdownProps {
  companyName?: string;
  companyRole?: string;
}

export function CompanyDropdown({
  companyName,
  companyRole = "Empresa empleadora",
}: CompanyDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [fetchedName, setFetchedName] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (companyName || (!DEMO_MODE && !hasValidSession())) return;
    let cancelled = false;
    getCompanyHeader()
      .then((h) => {
        if (!cancelled) setFetchedName(h.nombre);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [companyName]);

  const displayName = companyName ?? fetchedName ?? "Mi empresa";

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    setIsOpen(false);
    clearToken();
    router.push("/login");
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 hover:opacity-80 transition-opacity focus:outline-none"
      >
        <div className="flex flex-col items-start hidden md:flex">
          <span className="text-[14px] font-bold text-white leading-tight">
            {displayName}
          </span>
          <span className="text-[11px] text-white/70 leading-tight">
            {companyRole}
          </span>
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-[260px] bg-[#F9F6F0] rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.15)] border border-[#E8E2D6] z-50 py-2">
          
          <div className="flex flex-col px-5 py-3 border-b border-[#E8E2D6] mb-2">
            <span className="text-[14px] font-bold text-[#1B2632] leading-tight">
              {displayName}
            </span>
            <span className="text-[12px] font-medium text-[#1B2632]/60">
              {companyRole}
            </span>
          </div>

          <div className="flex flex-col">
            <Link
              href="/companies"
              onClick={() => setIsOpen(false)}
              className="px-5 py-3 hover:bg-[#E8E2D6]/50 transition-colors text-[14px] font-bold text-[#1B2632] border-b border-[#E8E2D6]"
            >
              Perfil de Empresa
            </Link>

            <Link
              href="/empresa/vacantes/publicar"
              onClick={() => setIsOpen(false)}
              className="px-5 py-3 hover:bg-[#E8E2D6]/50 transition-colors text-[14px] font-bold text-[#1B2632] border-b border-[#E8E2D6]"
            >
              Publicar Vacante
            </Link>

            {/* 👇 AQUÍ ESTÁ TU ENLACE ARREGLADO 👇 */}
            <Link
              href="/empresa/mis-vacantes"
              onClick={() => setIsOpen(false)}
              className="px-5 py-3 hover:bg-[#E8E2D6]/50 transition-colors text-[14px] font-bold text-[#1B2632] border-b border-[#E8E2D6]"
            >
              Mis Vacantes
            </Link>
            {/* 👆 FIN DEL ENLACE 👆 */}

            <Link
              href="/empresa/postulantes"
              onClick={() => setIsOpen(false)}
              className="px-5 py-3 hover:bg-[#E8E2D6]/50 transition-colors text-[14px] font-bold text-[#1B2632] border-b border-[#E8E2D6]"
            >
              Postulantes
            </Link>
          </div>

          <div className="pt-2">
            <button
              onClick={handleLogout}
              className="flex w-full items-center px-5 py-3 hover:bg-[#E8E2D6]/50 transition-colors text-[14px] font-bold text-[#A35139]"
            >
              <LogOut className="w-[18px] h-[18px] mr-3" />
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </div>
  );
}