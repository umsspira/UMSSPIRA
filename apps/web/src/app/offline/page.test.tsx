'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, ChevronRight, QrCode, RefreshCw, Settings, WifiOff } from 'lucide-react';
import { OfflineLogoutButton } from './offline-logout-button';

const NOTICE = 'Todavía no hay conexión';

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#EEE9DF] text-[#1B2632] flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="mx-auto w-16 h-16 bg-[#FFF1DC] rounded-full flex items-center justify-center mb-4">
          <WifiOff className="w-8 h-8 text-[#B44735]" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Sin conexión a Internet</h1>
        <p className="text-[#5E6974] mb-6">
          Esta pantalla todavía no se guardó en tu dispositivo. Cuando vuelvas a tener red podrás abrirla.
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => window.location.reload()}
            className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-[#FFB162] text-[#1B2632] font-bold rounded-xl hover:bg-[#FFA044]"
          >
            <RefreshCw className="w-5 h-5" />
            Reintentar
          </button>
          <OfflineLogoutButton />
        </div>
      </div>

      <div className="mt-8 max-w-md w-full bg-[#EDF2FA] rounded-xl p-4">
        <h2 className="text-sm font-semibold mb-3">Disponible sin conexión</h2>
        <Link href="/mis-pases" className="flex items-center gap-3 p-3 bg-[#1B2632] text-white rounded-lg mb-2">
          <div className="bg-[#FFB162] p-2 rounded-lg text-[#1B2632]">
            <QrCode className="w-5 h-5" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-bold">Mis códigos QR</p>
            <p className="text-xs opacity-80">Abre tus pases guardados en este dispositivo.</p>
          </div>
          <ChevronRight className="w-5 h-5 text-[#FFB162]" />
        </Link>
        <div className="grid gap-2">
          <Link href="/portal/eventos" className="flex items-center gap-2 p-3 bg-white rounded-lg text-sm hover:bg-[#FFF1DC]">
            <CalendarDays className="w-4 h-4" />
            Eventos visitados
          </Link>
          <Link href="/portal/configuracion" className="flex items-center gap-2 p-3 bg-white rounded-lg text-sm hover:bg-[#FFF1DC]">
            <Settings className="w-4 h-4" />
            Configuración
          </Link>
        </div>
      </div>
    </div>
  );
}
