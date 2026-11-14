import type { ReactNode } from "react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";

export default function AcademicEducationLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-1 flex-col bg-[oklch(0.982_0.006_80)] font-sans text-[oklch(0.22_0.01_60)] [color-scheme:light]">
      <SiteHeader activeItem="Perfil" />
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </div>
  );
}
