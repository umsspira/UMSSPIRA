'use client';

import { RefreshCw, WifiOff, QrCode, CalendarDays, Home } from 'lucide-react';

export default function OfflinePage() {
  // Función vital: recarga completa para que el Service Worker intervenga.
  // Evita que Next.js intente navegar internamente y falle en Modo Avión.
  const forceNavigation = (path: string) => {
    window.location.href = path;
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#EEE9DF] px-6 py-12 text-center">
      {/* Decoración de fondo (Círculos difuminados) */}
      <div className="absolute top-[-10%] left-[-10%] h-96 w-96 rounded-full bg-[#FFB162]/20 blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-10%] h-96 w-96 rounded-full bg-[#1B2632]/5 blur-3xl" />

      <div className="relative w-full max-w-md">
        {/* Tarjeta principal */}
        <div className="rounded-[2rem] bg-white p-8 md:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 backdrop-blur-sm">
          
          {/* Icono animado */}
          <div className="relative mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-[#FFF7ED]">
            <div className="absolute inset-0 animate-ping rounded-full bg-[#FFB162] opacity-20 duration-1000" />
            <WifiOff className="relative h-10 w-10 text-[#EA580C]" strokeWidth={2.5} />
          </div>

          <h1
            data-testid="offline-title"
            className="mb-3 text-2xl font-bold text-[#1B2632] md:text-3xl"
          >
            Sin conexión a Internet
          </h1>

          <p className="mb-8 text-sm leading-relaxed text-[#2C384D]/80 md:text-base">
            Parece que no tienes conexión en este momento, pero no te preocupes.
            Aún puedes consultar tus códigos QR guardados y los eventos que visitaste.
          </p>

          {/* Acciones rápidas con recarga forzada */}
          <div className="mb-8 grid grid-cols-2 gap-3">
            <button
              onClick={() => forceNavigation('/events/catalog/passes')}
              data-testid="offline-link-passes"
              className="flex flex-col items-center justify-center gap-2 rounded-xl border border-gray-100 bg-gray-50 p-3 text-xs font-semibold text-[#1B2632] transition-colors hover:bg-[#FFB162]/10 hover:border-[#FFB162]/30"
            >
              <QrCode className="h-5 w-5 text-[#EA580C]" />
              Mis QR
            </button>
            
            <button
              onClick={() => forceNavigation('/portal/eventos')}
              data-testid="offline-link-events"
              className="flex flex-col items-center justify-center gap-2 rounded-xl border border-gray-100 bg-gray-50 p-3 text-xs font-semibold text-[#1B2632] transition-colors hover:bg-[#FFB162]/10 hover:border-[#FFB162]/30"
            >
              <CalendarDays className="h-5 w-5 text-[#EA580C]" />
              Eventos
            </button>
          </div>

          {/* Botones principales */}
          <div className="flex flex-col gap-3">
            <button
              type="button"
              data-testid="offline-retry"
              onClick={() => window.location.reload()}
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-[#FFB162] px-6 py-3.5 font-bold text-[#1B2632] shadow-sm transition-all hover:bg-[#FFA044] hover:shadow-md active:scale-[0.98]"
            >
              <RefreshCw className="h-5 w-5 transition-transform group-hover:-rotate-180 duration-500" />
              Reintentar conexión
            </button>
            
            <button
              onClick={() => forceNavigation('/portal')}
              data-testid="offline-link-home"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-transparent px-6 py-3.5 text-sm font-semibold text-[#2C384D]/60 transition-colors hover:bg-black/5 hover:text-[#1B2632]"
            >
              <Home className="h-4 w-4" />
              Ir al inicio
            </button>
          </div>

        </div>

        <p className="mt-8 text-xs font-medium text-[#2C384D]/40">
          UMSSPIRA · Tu comunidad, siempre conectada
        </p>
      </div>
    </main>
  );
}




