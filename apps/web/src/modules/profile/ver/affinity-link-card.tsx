'use client';

import Link from 'next/link';

import { AFFINITY_ROUTE } from '@/modules/profile/data/affinity-route';
import MiniRadarPlaceholder from '@/modules/profile/ver/mini-radar-placeholder';
import { useMiniAffinity } from '@/modules/profile/ver/use-mini-affinity';

// Pantalla donde el egresado completa su perfil (HU-01)
const COMPLETE_PROFILE_ROUTE = '/profile/completar';

// Tarjeta "Mi afinidad" del resumen del perfil (HU-07) con el mini radar de 6 ejes (HU-17)
export default function AffinityLinkCard() {
  const { state } = useMiniAffinity();

  return (
    <section
      aria-labelledby="affinity-card-title"
      className="relative flex w-full flex-col gap-4 rounded-2xl border border-abyssal-blue/10 bg-white p-6 transition hover:border-abyssal-blue/30"
    >
      <h2 id="affinity-card-title" className="text-xl font-bold text-blue-fantastic">
        Mi afinidad
      </h2>
      <p className="text-[13px] leading-[1.5] text-blue-fantastic/70">
        Descubre qué tan bien encaja tu perfil con las oportunidades laborales de la Red.
      </p>

      {/* CA-03: el cálculo todavía no llega (mismo texto que la pantalla de la Épica 3) */}
      {state.status === 'loading' && (
        <p role="status" className="text-sm font-medium text-blue-fantastic">
          Actualizando tu afinidad…
        </p>
      )}

      {/* CA-01: valores del último cálculo */}
      {state.status === 'ready' && <MiniRadarPlaceholder values={state.values} />}

      {/* CA-04: el perfil no tiene datos suficientes */}
      {state.status === 'empty' && (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-oatmeal bg-palladian p-4">
          <p className="text-sm font-semibold text-blue-fantastic">Sin datos suficientes</p>
          <Link
            href={COMPLETE_PROFILE_ROUTE}
            className="relative z-10 inline-flex items-center justify-center rounded-lg border border-abyssal-blue px-4 py-2 text-sm font-bold text-abyssal-blue transition hover:bg-abyssal-blue/5"
          >
            Completar perfil
          </Link>
        </div>
      )}

      {/* CA-02: el enlace se estira con "after:" para que toda la tarjeta abra Mi afinidad.
          Los botones de los estados quedan encima (relative z-10) y siguen funcionando.
          No usar "brightness" en el hover: un filtro encoge el "after:" al botón. */}
      <Link
        href={AFFINITY_ROUTE}
        className="inline-flex items-center justify-center rounded-lg bg-burning-flame px-6 py-3.5 text-sm font-bold text-abyssal-blue transition after:absolute after:inset-0 after:rounded-2xl hover:bg-burning-flame/90"
      >
        Ver mi afinidad
      </Link>
    </section>
  );
}