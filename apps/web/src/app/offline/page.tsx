// apps/web/src/app/offline/page.tsx
'use client';

import Link from 'next/link';

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#EEE9DF] px-6 py-12 text-center">
      
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <div className="mb-4 text-5xl" aria-hidden="true">
          📡
        </div>

        <h1 className="mb-3 text-2xl font-bold text-[#1B2632]">
          Sin conexión a Internet
        </h1>

        <p className="mb-6 text-[#2C384D]">
          El contenido solicitado no está disponible sin conexión.
          Comprueba tu conexión e inténtalo de nuevo.
        </p>

        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-lg bg-[#FFB162] px-6 py-3 font-semibold text-[#1B2632] hover:opacity-90 transition-opacity mb-8"
        >
          Reintentar
        </button>

        {/* CA-04: Accesos a secciones disponibles sin conexión */}
        <div className="border-t border-gray-200 pt-6">
          <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Disponible sin conexión
          </p>
          <div className="flex flex-col gap-3">
            <Link 
              href="/portal/mis-qr" 
              className="flex items-center justify-center gap-2 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors font-medium text-[#1B2632]"
            >
              🎫 Mis códigos QR
            </Link>
            <Link 
              href="/portal/eventos" 
              className="flex items-center justify-center gap-2 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors font-medium text-[#1B2632]"
            >
              📅 Eventos visitados
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

