// apps/web/src/app/portal/configuracion/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Database, RefreshCw, ShieldCheck, Info, Zap } from 'lucide-react';

export default function ConfiguracionPage() {
  const [isOnline, setIsOnline] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>('Cargando...');
  const [cacheSize, setCacheSize] = useState<string>('Calculando...');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if ('storage' in navigator && 'estimate' in navigator.storage) {
      navigator.storage.estimate().then((estimate) => {
        const usedMB = ((estimate.usage || 0) / (1024 * 1024)).toFixed(0);
        setCacheSize(`${usedMB} MB`);
      });
    }

    const savedDate = localStorage.getItem('lastCacheUpdate');
    setLastUpdate(savedDate || new Date().toLocaleString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }));

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleUpdateCache = () => {
    if (!isOnline || isUpdating) return;
    setIsUpdating(true);

    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'UPDATE_CACHE' });
      
      navigator.serviceWorker.addEventListener('message', function onMessage(event) {
        if (event.data && event.data.type === 'CACHE_UPDATED') {
          const now = new Date().toLocaleString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
          localStorage.setItem('lastCacheUpdate', now);
          setLastUpdate(now);
          setIsUpdating(false);
          
          if ('storage' in navigator && 'estimate' in navigator.storage) {
            navigator.storage.estimate().then((estimate) => {
              const usedMB = ((estimate.usage || 0) / (1024 * 1024)).toFixed(0);
              setCacheSize(`${usedMB} MB`);
            });
          }
          navigator.serviceWorker.removeEventListener('message', onMessage);
        }
      });
    } else {
      setTimeout(() => {
        const now = new Date().toLocaleString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        localStorage.setItem('lastCacheUpdate', now);
        setLastUpdate(now);
        setIsUpdating(false);
      }, 1500);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 mt-4">
      
      {/* ENCABEZADO CON LA IMAGEN */}
      <div className="relative w-full h-48 md:h-56 rounded-2xl overflow-hidden mb-6 shadow-md">
        <div className="absolute inset-0 bg-slate-800 bg-[url('https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center"></div>
        <div className="absolute inset-0 bg-black/40"></div>
        <div className="absolute bottom-6 left-6 text-white">
          <p className="text-sm font-medium mb-1">Configuración PWA</p>
          <h1 className="text-3xl md:text-4xl font-bold mb-2 font-serif">UMSSPIRA</h1>
          <p className="text-sm opacity-90">Tu comunidad, siempre conectada.</p>
        </div>
      </div>

      {/* TARJETA PRINCIPAL */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
              <Zap className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#1B2632]">Almacenamiento en Caché</h2>
              <p className="text-sm text-gray-500">La aplicación guarda recursos esenciales para que puedas acceder incluso sin conexión a Internet.</p>
            </div>
          </div>
          
          <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium ${isOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></span>
            {isOnline ? 'En línea' : 'Sin conexión'}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl flex items-center gap-3">
            <Database className="w-6 h-6 text-blue-600" />
            <div>
              <p className="text-sm text-gray-500 font-medium">Espacio en caché utilizado</p>
              <p className="text-lg font-bold text-[#1B2632]">{cacheSize}</p>
            </div>
          </div>
          <div className="bg-amber-50/50 border border-amber-100 p-4 rounded-xl flex items-center gap-3">
            <RefreshCw className="w-6 h-6 text-amber-600" />
            <div>
              <p className="text-sm text-gray-500 font-medium">Última actualización</p>
              <p className="text-sm font-bold text-[#1B2632]">{lastUpdate}</p>
            </div>
          </div>
          <div className="bg-green-50/50 border border-green-100 p-4 rounded-xl flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-green-600" />
            <div>
              <p className="text-sm text-gray-500 font-medium">Versión actual</p>
              <p className="text-lg font-bold text-[#1B2632]">v2.1.0</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl flex items-start gap-3 mb-8">
          <Info className="w-5 h-5 text-slate-500 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-slate-700 mb-1">¿Qué se almacena en caché?</p>
            <p className="text-sm text-slate-500">Recursos de la aplicación: estilos, scripts, imágenes y contenido esencial para el funcionamiento offline.</p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <button
            onClick={handleUpdateCache}
            disabled={!isOnline || isUpdating}
            className="flex items-center gap-2 px-6 py-2.5 border-2 border-amber-500 text-amber-600 rounded-full font-semibold hover:bg-amber-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`w-5 h-5 ${isUpdating ? 'animate-spin' : ''}`} />
            {isUpdating ? 'Actualizando...' : 'Actualizar caché'}
          </button>
          
          {!isOnline && (
            <p className="text-sm text-red-500 font-medium">
              Necesitas conexión para esta acción
            </p>
          )}
        </div>

      </div>
    </div>
  );
}
