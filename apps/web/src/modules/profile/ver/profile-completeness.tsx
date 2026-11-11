import { ChevronRight, CircleCheck, Info } from 'lucide-react';
import Link from 'next/link';

import {
  completarSeccionHref,
  type ProfileCompleteness as Completeness,
} from '@/modules/profile/utils/profile-completeness';

// Indicador de completitud del resumen (HU-06): porcentaje y secciones que faltan
export default function ProfileCompleteness({ completeness }: { completeness: Completeness }) {
  const { percentage, missing } = completeness;
  // HU-21, CA-05: si el perfil no está al 100 % la tarjeta se resalta con el aviso «Te falta completar»
  const isIncomplete = missing.length > 0;

  return (
    <section
      aria-labelledby="profile-completeness-title"
      data-incomplete={isIncomplete || undefined}
      className={`flex w-full flex-col gap-4 rounded-2xl border bg-white p-6 ${
        isIncomplete ? 'border-2 border-burning-flame shadow-sm' : 'border-abyssal-blue/10'
      }`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="profile-completeness-title" className="text-base font-bold text-blue-fantastic">
          Completitud del perfil
        </h2>
        <span className="text-2xl font-bold text-truffle-trouble">{percentage}%</span>
      </div>

      <div
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Completitud del perfil"
        className="h-2 w-full overflow-hidden rounded-full bg-oatmeal"
      >
        <span className="block h-full rounded-full bg-burning-flame transition-[width] duration-300" style={{ width: `${percentage}%` }} />
      </div>

      {missing.length === 0 ? (
        <p className="flex items-center gap-2 text-[13px] font-medium text-[#0F5132]">
          <CircleCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
          Tu perfil está completo
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <p
            role="note"
            className="flex items-center gap-2 rounded-lg bg-burning-flame/15 px-3 py-2 text-[13px] font-semibold text-blue-fantastic"
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-truffle-trouble" aria-hidden="true">
              <Info className="h-3 w-3 text-white" />
            </span>
            Te falta completar
          </p>
          <ul aria-label="Secciones faltantes" className="flex flex-col gap-2">
            {missing.map((section) => (
              <li key={section.id}>
                {/* Acceso directo al formulario de esa sección (T6.6) */}
                <Link
                  href={completarSeccionHref(section.id)}
                  aria-label={`Completar ${section.label}`}
                  className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-[13px] text-blue-fantastic/80 transition hover:bg-palladian hover:text-blue-fantastic"
                >
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-truffle-trouble" aria-hidden="true" />
                    {section.label}
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
