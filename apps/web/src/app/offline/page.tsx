'use client';

import { useKnownRole } from '@/shared/hooks/use-known-role';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CalendarDays, ChevronRight, QrCode, RefreshCw, Settings, WifiOff } from 'lucide-react';
import { OfflineLogoutButton } from './offline-logout-button';

const tile =
  'flex min-h-[44px] w-full items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-medium text-[#1B2632] hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB162]';

/** Página de respaldo: se muestra cuando se abre una ruta que no se guardó y no hay conexión. */
export default function OfflinePage() {
  const esTitulado = [null, 'titulado'].includes(useKnownRole());
  const [notice, setNotice] = useState('');

  useEffect(() => {
    document.title = 'Sin conexión · UMSSPIRA';
  }, []);

  const retry = () => {
    if (navigator.onLine) window.location.reload();
    else setNotice('Todavía no hay conexión');
  };

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-4 py-8">
      <section className="flex w-full flex-col items-center gap-4 rounded-3xl bg-white p-6 text-center shadow-sm sm:p-10">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#FFF0DC] text-[#B45F06]">
          <WifiOff className="h-8 w-8" aria-hidden="true" />
        </div>
        <h1 className="text-3xl font-bold text-[#1B2632]">Sin conexión a Internet</h1>
        <p className="max-w-md text-slate-600">
          Esta pantalla todavía no se guardó en tu dispositivo. Cuando vuelvas a tener red podrás abrirla.
        </p>
        <button
          type="button"
          onClick={retry}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[#FFB162] px-6 font-bold text-[#1B2632] hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B2632]"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Reintentar
        </button>
        {notice && (
          <p role="status" className="w-full rounded-xl bg-[#FFF0DC] px-4 py-3 text-sm font-semibold text-[#7A4A00]">
            {notice}
          </p>
        )}

        <div className="mt-2 flex w-full flex-col gap-3 rounded-2xl bg-[#EBF0F8] p-4 text-left sm:p-5">
          <h2 className="text-base font-bold text-[#1B2632]">Disponible sin conexión</h2>
          {esTitulado && (
<Link
            href="/mis-pases"
            className="flex min-h-[44px] w-full items-center gap-3 rounded-xl bg-[#1B2632] px-4 py-4 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB162]"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FFB162] text-[#1B2632]">
              <QrCode className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="flex-1">
              <span className="block font-bold">Mis códigos QR</span>
              <span className="block text-sm text-slate-200">Abre tus pases guardados en este dispositivo.</span>
            </span>
            <ChevronRight className="h-5 w-5 text-[#FFB162]" aria-hidden="true" />
          </Link>
)}
          <div className="grid gap-3 sm:grid-cols-2">
            <Link href="/portal/eventos" className={tile}>
              <CalendarDays className="h-4 w-4" aria-hidden="true" />
              Eventos visitados
            </Link>
            <Link href="/portal/configuracion" className={tile}>
              <Settings className="h-4 w-4" aria-hidden="true" />
              Configuración
            </Link>
          </div>
          <OfflineLogoutButton />
        </div>
      </section>
      <p className="text-sm text-slate-500">UMSSPIRA · Tu comunidad, siempre conectada.</p>
    </main>
  );
}
