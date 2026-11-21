'use client';

import { useState, useEffect } from 'react';
import { Database, RefreshCw, ShieldCheck, Info, Zap, Download, Terminal, CheckCircle, AlertCircle, WifiOff, Wifi, ChevronDown } from 'lucide-react';
import { useServiceWorkerUpdate } from '../../../hooks/useServiceWorkerUpdate';
import { ActionNotice, OFFLINE_ACTION_MESSAGE } from '@/shared/components/action-notice';
import { TarjetasValidacion, useComprobaciones } from '../validacion-offline/validacion-offline';

type FilaGuardado = { id: string; titulo: string; detalle: string; estado: 'ok' | 'falta' | 'info' };

export default function ConfiguracionPage() {
  const [isOnline, setIsOnline] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>('Cargando...');
  const [cacheSize, setCacheSize] = useState<string>('Calculando...');
  const [isUpdating, setIsUpdating] = useState(false);
  const [swVersion, setSwVersion] = useState<string>('Cargando...');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [validacionAbierta, setValidacionAbierta] = useState<boolean | null>(null);
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'applying' | 'error'>('idle');

  const { updateAvailable, applyUpdate, dismissUpdate } = useServiceWorkerUpdate();
  // HU08: lo guardado en este dispositivo se comprueba de verdad (Service Worker, rutas en caché, QR guardados).
  const { c: guardado, actualizar: revisarGuardado } = useComprobaciones();

  // HU10: «Actualizar ahora» muestra carga y, si la nueva versión no se activa, error con «Reintentar».
  const handleApplyUpdate = () => {
    if (updateStatus === 'applying') return;
    setUpdateStatus('applying');
    applyUpdate();
  };

  useEffect(() => {
    if (updateStatus !== 'applying') return;
    const timeoutId = setTimeout(() => setUpdateStatus('error'), 10000);
    return () => clearTimeout(timeoutId);
  }, [updateStatus]);

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
      });
    }

    // Esta misma pantalla se guarda unos segundos después de abrirla: se vuelve a comprobar.
    const recheck = window.setTimeout(revisarGuardado, 3000);

    return () => {
      window.clearTimeout(recheck);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        setFeedback({ type: 'success', msg: 'Caché actualizada correctamente' });
        revisarGuardado();
        if ('storage' in navigator && 'estimate' in navigator.storage) {
          navigator.storage.estimate().then((est) => {
            const usedMB = ((est.usage || 0) / (1024 * 1024)).toFixed(0);
            setCacheSize(`${usedMB} MB`);
          });
        }
      }
      if (event.data?.type === 'SW_LOG') addLog(event.data.message);
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, [revisarGuardado]);

  const handleUpdateCache = () => {
    if (!isOnline || isUpdating) return;
    setFeedback(null);
    setIsUpdating(true);
    setLogs([]);
    addLog('Iniciando solicitud de actualización manual...');

    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'UPDATE_CACHE' });
      setTimeout(() => {
        setIsUpdating((prev) => {
          if (prev) {
            addLog('❌ Error: Tiempo de espera agotado.');
            setFeedback({ type: 'error', msg: 'No se pudo actualizar la caché. Revisa tu conexión.' });
          }
          return false;
        });
      }, 10000);
    } else {
      setIsUpdating(false);
      setFeedback({ type: 'error', msg: 'El Service Worker no está activo. Recarga la página.' });
    }
  };

  // ---- Estado de lo guardado (HU08): todo sale de comprobaciones reales, nada está fijo ----
  const swActivo = guardado.swRegistrado || guardado.swControla;
  const filas: FilaGuardado[] = [
    {
      id: 'sw',
      titulo: 'Service Worker activo',
      detalle: swActivo ? 'La aplicación puede abrirse sin conexión.' : 'Todavía no está activo. Recarga la página con conexión.',
      estado: swActivo ? 'ok' : 'falta',
    },
    {
      id: 'respaldo',
      titulo: 'Página sin conexión',
      detalle: swActivo ? 'Guardada en el Service Worker: sin conexión verás el diseño de UMSSPIRA.' : 'Se activa junto con el Service Worker.',
      estado: swActivo ? 'ok' : 'falta',
    },
    {
      id: 'qr-pantalla',
      titulo: 'Pantalla Mis códigos QR',
      detalle: guardado.rutaQrGuardada ? 'Guardada para abrirse sin conexión.' : 'Abre Mis QR una vez con conexión para guardarla.',
      estado: guardado.rutaQrGuardada ? 'ok' : 'falta',
    },
    {
      id: 'qr',
      titulo: 'Mis QR guardados',
      detalle:
        guardado.guardados > 0
          ? `${guardado.guardados} pase${guardado.guardados === 1 ? '' : 's'} guardado${guardado.guardados === 1 ? '' : 's'} en este dispositivo.`
          : 'Aún no guardaste ninguno. En Mis QR toca «Guardar sin conexión».',
      estado: guardado.guardados > 0 ? 'ok' : 'info',
    },
    {
      id: 'eventos',
      titulo: 'Eventos visitados',
      detalle: guardado.rutaEventosGuardada ? 'Guardados para verse sin conexión.' : 'Abre Eventos una vez con conexión para guardarlos.',
      estado: guardado.rutaEventosGuardada ? 'ok' : 'falta',
    },
    {
      id: 'config',
      titulo: 'Configuración',
      detalle: guardado.rutaConfiguracionGuardada ? 'Esta pantalla también queda disponible sin conexión.' : 'Se guarda al visitar esta pantalla con conexión.',
      estado: guardado.rutaConfiguracionGuardada ? 'ok' : 'falta',
    },
  ];
  const faltantes = filas.filter((fila) => fila.estado === 'falta');
  const todoBien = faltantes.length === 0;
  const mostrarValidacion = validacionAbierta ?? isOnline;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 md:py-8">
      {updateAvailable && (
        <div className="mb-6 space-y-3">
          <div role="status" aria-live="polite" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <Download className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm font-medium">Hay una nueva versión de UMSSPIRA disponible. Tus QR y tu sesión se conservarán.</p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={dismissUpdate}
                disabled={updateStatus === 'applying'}
                className="px-4 py-2 text-sm font-semibold rounded-full border border-amber-300 hover:bg-amber-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Más tarde
              </button>
              <button
                onClick={handleApplyUpdate}
                disabled={updateStatus === 'applying'}
                className="px-4 py-2 text-sm font-semibold rounded-full bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updateStatus === 'applying' ? 'Actualizando...' : 'Actualizar ahora'}
              </button>
            </div>
          </div>

          {updateStatus === 'applying' && (
            <ActionNotice state="loading" message="Actualizando la aplicación…" />
          )}
          {updateStatus === 'error' && (
            <ActionNotice
              state="error"
              message="No se pudo actualizar la aplicación"
              description="Inténtalo nuevamente."
              onRetry={handleApplyUpdate}
            />
          )}
        </div>
      )}

      {/* Encabezado */}
      <section className="relative mb-5 overflow-hidden rounded-3xl bg-[#1B2632] text-white shadow-md">
        <div aria-hidden="true" className="absolute inset-0 bg-[url('/images/institucional/inicio-egresados.jpg')] bg-cover bg-center opacity-40" />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-[#1B2632] via-[#1B2632]/80 to-transparent" />
        <div className="relative px-6 py-8 sm:px-10 sm:py-10">
          <p className="text-sm font-medium text-slate-200">Configuración PWA</p>
          <h1 className="mt-1 font-serif text-3xl font-bold tracking-wide sm:text-4xl md:text-5xl">
            UMSS<span className="text-[#FFB162]">PIRA</span>
          </h1>
          <p className="mt-2 text-sm text-slate-200 sm:text-base">Tu comunidad, siempre conectada.</p>
        </div>
      </section>

      {/* Estado principal: En línea o Modo Avión */}
      <section
        data-testid="config-estado"
        data-modo={isOnline ? 'en-linea' : 'sin-conexion'}
        data-guardado={todoBien ? 'ok' : 'incompleto'}
        aria-live="polite"
        className={`mb-5 flex items-start gap-4 rounded-2xl border p-4 shadow-sm sm:items-center sm:p-5 ${
          todoBien
            ? isOnline
              ? 'border-emerald-200 bg-emerald-50'
              : 'border-sky-200 bg-sky-50'
            : 'border-amber-200 bg-amber-50'
        }`}
      >
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full sm:h-14 sm:w-14 ${
            todoBien ? (isOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-sky-100 text-sky-700') : 'bg-amber-100 text-amber-700'
          }`}
        >
          {isOnline ? <Wifi className="h-6 w-6 sm:h-7 sm:w-7" /> : <WifiOff className="h-6 w-6 sm:h-7 sm:w-7" />}
        </div>
        <div className="min-w-0">
          <p className="text-lg font-bold text-[#1B2632] sm:text-xl" data-testid="config-estado-titulo">
            {isOnline ? 'En línea' : 'Sin conexión'}
          </p>
          {todoBien ? (
            <p className="mt-0.5 flex items-start gap-1.5 text-sm text-slate-700 sm:text-base">
              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 sm:h-5 sm:w-5" />
              <span>
                {isOnline
                  ? 'Todo se guardó correctamente para usar la app sin conexión. No hubo ningún error.'
                  : 'Todo está guardado correctamente en este dispositivo. No hubo ningún error.'}
              </span>
            </p>
          ) : (
            <p className="mt-0.5 flex items-start gap-1.5 text-sm text-slate-700 sm:text-base">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 sm:h-5 sm:w-5" />
              <span>
                Falta guardar: {faltantes.map((fila) => fila.titulo.toLowerCase()).join(', ')}.{' '}
                {isOnline ? 'Pulsa «Actualizar caché» para guardarlo.' : 'Cuando vuelva la conexión, pulsa «Actualizar caché».'}
              </span>
            </p>
          )}
        </div>
      </section>

      {/* Almacenamiento */}
      <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-100">
            <Zap className="h-6 w-6 text-amber-600" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-[#1B2632] sm:text-xl">Almacenamiento en Caché</h2>
            <p className="text-sm text-slate-500">La aplicación guarda recursos esenciales para que puedas acceder incluso sin conexión a Internet.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
            <Database className="h-6 w-6 shrink-0 text-blue-600" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-500">Espacio utilizado</p>
              <p className="text-lg font-bold text-[#1B2632]">{cacheSize}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-amber-100 bg-amber-50/60 p-4">
            <RefreshCw className="h-6 w-6 shrink-0 text-amber-600" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-500">Última actualización</p>
              <p className="text-sm font-bold text-[#1B2632]">{lastUpdate}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-green-100 bg-green-50/60 p-4">
            <ShieldCheck className="h-6 w-6 shrink-0 text-green-600" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-500">Versión actual</p>
              <p className="truncate text-lg font-bold text-[#1B2632]">{swVersion}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Qué quedó guardado */}
      <section aria-labelledby="config-guardado" className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 id="config-guardado" className="text-lg font-bold text-[#1B2632] sm:text-xl">Guardado en este dispositivo</h2>
        <ul className="mt-3 divide-y divide-slate-100">
          {filas.map((fila) => (
            <li key={fila.id} data-testid={`config-fila-${fila.id}`} data-estado={fila.estado} className="flex items-start gap-3 py-3">
              {fila.estado === 'ok' && <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />}
              {fila.estado === 'falta' && <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />}
              {fila.estado === 'info' && <Info className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#1B2632] sm:text-base">{fila.titulo}</p>
                <p className="text-sm text-slate-500">{fila.detalle}</p>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex items-start gap-3 rounded-xl bg-slate-50 p-4">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
          <div>
            <p className="mb-1 text-sm font-bold text-slate-700">¿Qué se almacena en caché?</p>
            <p className="text-sm text-slate-500">Página sin conexión, recursos del portal, iconos y contenido esencial.</p>
          </div>
        </div>
      </section>

      {/* Acciones manuales */}
      <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-lg font-bold text-[#1B2632]">Acciones Manuales</h3>
            <p className="text-sm text-slate-500">Fuerza la descarga de recursos actualizados.</p>
          </div>
          <button
            onClick={handleUpdateCache}
            disabled={!isOnline || isUpdating}
            className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full border-2 border-amber-500 px-6 py-2.5 font-semibold text-amber-600 transition-colors hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            <RefreshCw className={`h-5 w-5 ${isUpdating ? 'animate-spin' : ''}`} />
            {isUpdating ? 'Actualizando...' : 'Actualizar caché'}
          </button>
        </div>

        {/* HU10: avisos de carga, éxito, error y sin conexión con un único componente */}
        <div className="mt-4 space-y-3 empty:hidden">
          {!isOnline && (
            <ActionNotice state="offline" message={OFFLINE_ACTION_MESSAGE} />
          )}
          {isUpdating && (
            <ActionNotice state="loading" message="Actualizando la caché…" />
          )}
          {feedback && !isUpdating && (
            <ActionNotice
              state={feedback.type}
              message={feedback.msg}
              onRetry={feedback.type === 'error' && isOnline ? handleUpdateCache : undefined}
              onDismiss={() => setFeedback(null)}
            />
          )}
        </div>

        {logs.length > 0 && (
          <div className="mt-5 overflow-hidden rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50 px-4 py-2.5">
              <Terminal className="h-4 w-4 text-gray-500" />
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-600">Registro del Service Worker</span>
            </div>
            <div className="max-h-48 space-y-2 overflow-y-auto bg-white p-4 font-mono text-xs">
              {logs.map((log, i) => {
                const isError = log.includes('❌');
                const isSuccess = log.includes('✅') || log.includes('completado');
                return (
                  <div key={i} className="flex gap-3">
                    <span className="select-none text-gray-300">{'>'}</span>
                    <span className={`break-words ${isError ? 'font-medium text-red-600' : isSuccess ? 'font-medium text-green-600' : 'text-gray-600'}`}>
                      {log}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* HU08: validación del funcionamiento sin conexión (flujo en Modo Avión y auditoría) */}
      <section aria-labelledby="config-validacion" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <button
          type="button"
          onClick={() => setValidacionAbierta(!mostrarValidacion)}
          aria-expanded={mostrarValidacion}
          aria-controls="config-validacion-contenido"
          data-testid="config-validacion-toggle"
          className="flex min-h-[44px] w-full items-center justify-between gap-3 text-left"
        >
          <span>
            <span id="config-validacion" className="block text-lg font-bold text-[#1B2632] sm:text-xl">Validación en Modo Avión</span>
            <span className="block text-sm text-slate-500">Sprint 3 · Demo de calificación: flujo paso a paso y auditoría.</span>
          </span>
          <ChevronDown className={`h-5 w-5 shrink-0 text-slate-500 transition-transform ${mostrarValidacion ? 'rotate-180' : ''}`} />
        </button>
        {mostrarValidacion && (
          <div id="config-validacion-contenido" className="mt-4">
            <TarjetasValidacion c={guardado} />
          </div>
        )}
      </section>
    </div>
  );
}

