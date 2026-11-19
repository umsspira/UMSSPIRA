'use client';

import { useState, useEffect } from 'react';
import { Database, RefreshCw, ShieldCheck, Info, Zap, Download, Terminal, CheckCircle, XCircle } from 'lucide-react';
import { useServiceWorkerUpdate } from '../../../hooks/useServiceWorkerUpdate';

export default function ConfiguracionPage() {
  const [isOnline, setIsOnline] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>('Cargando...');
  const [cacheSize, setCacheSize] = useState<string>('Calculando...');
  const [isUpdating, setIsUpdating] = useState(false);
  const [swVersion, setSwVersion] = useState<string>('Cargando...');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [offlinePageReady, setOfflinePageReady] = useState(false);

  const { updateAvailable, applyUpdate, dismissUpdate } = useServiceWorkerUpdate();

  const addLog = (msg: string) => {
    setLogs((prev) => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`]);
  };

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if ('storage' in navigator && 'estimate' in navigator.storage) {
      navigator.storage.estimate().then((est) => {
        const usedMB = ((est.usage || 0) / (1024 * 1024)).toFixed(0);
        setCacheSize(`${usedMB} MB`);
      });
    }

    const savedDate = localStorage.getItem('lastCacheUpdate');
    setLastUpdate(savedDate || new Date().toLocaleString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }));

    if ('caches' in window) {
      caches.keys().then((keys) => {
        const appCache = keys.find((k) => k.startsWith('umsspira-core-portal-'));
        setSwVersion(appCache ? appCache.replace('umsspira-core-portal-', '') : '—');
        
        caches.match('/offline').then((res) => {
          setOfflinePageReady(!!res);
        });
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'CACHE_UPDATED') {
        addLog('✅ Service Worker: Caché actualizada con éxito.');
        const now = new Date().toLocaleString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        localStorage.setItem('lastCacheUpdate', now);
        setLastUpdate(now);
        setIsUpdating(false);
        setFeedback({ type: 'success', msg: 'Caché actualizada correctamente.' });
        caches.match('/offline').then((res) => setOfflinePageReady(!!res));
        if ('storage' in navigator && 'estimate' in navigator.storage) {
          navigator.storage.estimate().then((est) => {
            const usedMB = ((est.usage || 0) / (1024 * 1024)).toFixed(0);
            setCacheSize(`${usedMB} MB`);
          });
        }
        setTimeout(() => setFeedback(null), 4000);
      }
      if (event.data?.type === 'SW_LOG') addLog(event.data.message);
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, []);

  const handleUpdateCache = () => {
    if (!isOnline || isUpdating) return;
    setIsUpdating(true);
    setLogs([]);
    addLog('Iniciando solicitud de actualización manual...');

    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'UPDATE_CACHE' });
      setTimeout(() => {
        setIsUpdating((prev) => {
          if (prev) {
            addLog('❌ Error: Tiempo de espera agotado.');
            setFeedback({ type: 'error', msg: 'No se pudo actualizar. Reintentar.' });
          }
          return false;
        });
      }, 10000);
    } else {
      setIsUpdating(false);
      setFeedback({ type: 'error', msg: 'El Service Worker no está activo. Recarga la página.' });
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 mt-4">
      {updateAvailable && (
        <div role="status" aria-live="polite" className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <Download className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">Hay una nueva versión de UMSSPIRA disponible. Tus QR y tu sesión se conservarán.</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={dismissUpdate} className="px-4 py-2 text-sm font-semibold rounded-full border border-amber-300 hover:bg-amber-100">Más tarde</button>
            <button onClick={applyUpdate} className="px-4 py-2 text-sm font-semibold rounded-full bg-amber-600 text-white hover:bg-amber-700">Actualizar ahora</button>
          </div>
        </div>
      )}

      <div className="relative w-full h-48 md:h-56 rounded-2xl overflow-hidden mb-6 shadow-md">
        <div className="absolute inset-0 bg-slate-800 bg-[url('https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center"></div>
        <div className="absolute inset-0 bg-black/40"></div>
        <div className="absolute bottom-6 left-6 text-white">
          <p className="text-sm font-medium mb-1">Configuración PWA</p>
          <h1 className="text-3xl md:text-4xl font-bold mb-2 font-serif">UMSSPIRA</h1>
          <p className="text-sm opacity-90">Tu comunidad, siempre conectada.</p>
        </div>
      </div>

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
              <p className="text-sm text-gray-500 font-medium">Espacio utilizado</p>
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
              <p className="text-lg font-bold text-[#1B2632]">{swVersion}</p>
            </div>
          </div>
        </div>

        <div className={`mb-8 p-4 rounded-xl border flex items-center gap-3 ${offlinePageReady ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          {offlinePageReady ? <CheckCircle className="w-5 h-5 text-green-600" /> : <XCircle className="w-5 h-5 text-red-600" />}
          <div>
            <p className="text-sm font-bold text-slate-700">Página de respaldo offline</p>
             <p className="text-sm text-slate-600">
              {offlinePageReady ? '✓ Guardada correctamente. En Modo Avión verás el diseño de UMSSPIRA.' : '✗ No está en caché. Haz clic en "Actualizar caché" o recarga.'}
            </p> 
          </div>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl flex items-start gap-3 mb-8">
          <Info className="w-5 h-5 text-slate-500 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-slate-700 mb-1">¿Qué se almacena en caché?</p>
            <p className="text-sm text-slate-500">Página offline, recursos del portal, iconos y contenido esencial.</p>
          </div>
        </div>

        <div className="pt-6 border-t border-gray-200">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="text-lg font-bold text-[#1B2632]">Acciones Manuales</h3>
              <p className="text-sm text-gray-500">Fuerza la descarga de recursos actualizados.</p>
            </div>
            <button
              onClick={handleUpdateCache}
              disabled={!isOnline || isUpdating}
              className="flex items-center gap-2 px-6 py-2.5 border-2 border-amber-500 text-amber-600 rounded-full font-semibold hover:bg-amber-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className={`w-5 h-5 ${isUpdating ? 'animate-spin' : ''}`} />
              {isUpdating ? 'Actualizando...' : 'Actualizar caché'}
            </button>
          </div>

          {feedback && (
            <div role="alert" className={`mt-4 flex items-start gap-2 text-sm p-3 rounded-lg border ${feedback.type === 'success' ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
              <span className="font-semibold">{feedback.type === 'success' ? '✓' : '✕'}</span>
              <span>{feedback.msg}</span>
            </div>
          )}

          {/* NUEVA CONSOLA ADAPTADA AL DISEÑO CLARO */}
          {logs.length > 0 && (
            <div className="mt-6 rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-gray-500" />
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Registro del Service Worker</span>
              </div>
              <div className="bg-white p-4 font-mono text-xs max-h-48 overflow-y-auto space-y-2">
                {logs.map((log, i) => {
                  const isError = log.includes('❌');
                  const isSuccess = log.includes('✅') || log.includes('completado');
                  return (
                    <div key={i} className="flex gap-3">
                      <span className="text-gray-300 select-none">{'>'}</span>
                      <span className={`${isError ? 'text-red-600 font-medium' : isSuccess ? 'text-green-600 font-medium' : 'text-gray-600'}`}>
                        {log}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
}