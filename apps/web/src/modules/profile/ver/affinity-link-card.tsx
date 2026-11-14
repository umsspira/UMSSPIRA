'use client';

import { RefreshCw } from 'lucide-react';
import Link from 'next/link';

import { AFFINITY_ROUTE } from '@/modules/profile/data/affinity-route';
import MiniRadarPlaceholder from '@/modules/profile/ver/mini-radar-placeholder';
import { useMiniAffinity } from '@/modules/profile/ver/use-mini-affinity';

// Pantalla donde el titulado completa su perfil 
const COMPLETE_PROFILE_ROUTE = '/profile/completar';

// Tarjeta "Mi afinidad" del resumen del perfil  con el mini radar de 6 ejes 
export default function AffinityLinkCard() {
  const { state, retry } = useMiniAffinity();

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

    
      {state.status === 'loading' && (
        <p role="status" className="text-sm font-medium text-blue-fantastic">
          Actualizando tu afinidad…
        </p>
      )}

      
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

   
      {state.status === 'error' && (
        <div
          role="alert"
          className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-oatmeal bg-palladian p-4"
        >
          <p className="text-sm font-semibold text-truffle-trouble">No se pudo calcular tu afinidad</p>
          <button
            type="button"
            onClick={() => void retry()}
            className="relative z-10 inline-flex items-center gap-1.5 rounded-lg border border-abyssal-blue px-4 py-2 text-sm font-bold text-abyssal-blue transition hover:bg-abyssal-blue/5"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            Reintentar
          </button>
        </div>
      )}

      
      <Link
        href={AFFINITY_ROUTE}
        className="inline-flex items-center justify-center rounded-lg bg-burning-flame px-6 py-3.5 text-sm font-bold text-abyssal-blue transition after:absolute after:inset-0 after:rounded-2xl hover:bg-burning-flame/90"
      >
        Ver mi afinidad
      </Link>
    </section>
  );
}