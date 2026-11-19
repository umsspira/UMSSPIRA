'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { getOfflineQrPasses } from '@/features/event-passes/offline/offline-qr-storage';
import { getOfflineSessionUserId } from '@/features/event-passes/offline/offline-session';
import { RESULTADOS_NAVEGADORES, type EstadoNavegador } from './resultados';

/** Rutas de Mis QR que el Service Worker guarda para verse sin conexión (public/sw.js). */
const RUTAS_QR = ['/events/catalog/passes', '/mis-pases'];

interface Comprobaciones {
  guardados: number;
  sinConexion: boolean;
  swControla: boolean;
  swRegistrado: boolean;
  manifest: boolean;
  rutaQrGuardada: boolean;
}

const INICIAL: Comprobaciones = { guardados: 0, sinConexion: false, swControla: false, swRegistrado: false, manifest: false, rutaQrGuardada: false };

/** Todo se comprueba en este dispositivo, sin red: funciona también en Modo Avión. */
async function comprobar(): Promise<Comprobaciones> {
  const resultado: Comprobaciones = { ...INICIAL, sinConexion: !navigator.onLine };

  try {
    const usuario = getOfflineSessionUserId();
    if (usuario) resultado.guardados = (await getOfflineQrPasses(usuario)).length;
  } catch { /* IndexedDB no disponible: se cuenta como sin pases guardados */ }

  if ('serviceWorker' in navigator) {
    resultado.swControla = navigator.serviceWorker.controller != null;
    try {
      resultado.swRegistrado = (await navigator.serviceWorker.getRegistrations()).some(registro => registro.active != null);
    } catch { /* sin permiso para consultar los registros */ }
  }

  try {
    resultado.manifest = (await fetch('/manifest.webmanifest')).ok;
  } catch { /* sin red y sin copia guardada del manifiesto */ }

  try {
    if (typeof caches !== 'undefined') {
      const encontradas = await Promise.all(RUTAS_QR.map(ruta => caches.match(ruta)));
      resultado.rutaQrGuardada = encontradas.some(Boolean);
    }
  } catch { /* Cache Storage no disponible */ }

  return resultado;
}

function Marca({ ok, numero }: { ok: boolean; numero: number }) {
  return ok ? (
    <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">✓</span>
  ) : (
    <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-500">{numero}</span>
  );
}

function EstadoTexto({ estado }: { estado: 'aprobado' | 'pendiente' | 'falla' }) {
  if (estado === 'aprobado') return <span className="shrink-0 text-sm font-semibold text-emerald-700">✔ Aprobado</span>;
  if (estado === 'falla') return <span className="shrink-0 text-sm font-semibold text-red-700">✖ Falla</span>;
  return <span className="shrink-0 text-sm font-semibold text-amber-700">Pendiente</span>;
}

export default function ValidacionOffline() {
  const [c, setC] = useState<Comprobaciones>(INICIAL);

  const actualizar = useCallback(() => { comprobar().then(setC).catch(() => undefined); }, []);

  useEffect(() => {
    actualizar();
    window.addEventListener('online', actualizar);
    window.addEventListener('offline', actualizar);
    return () => {
      window.removeEventListener('online', actualizar);
      window.removeEventListener('offline', actualizar);
    };
  }, [actualizar]);

  const pasos = [
    {
      titulo: '1. Iniciar sesión y guardar el QR',
      detalle: c.guardados > 0 ? `Con conexión: «Guardar sin conexión» (${c.guardados} guardado${c.guardados === 1 ? '' : 's'})` : 'Con conexión: abre Mis QR y toca «Guardar sin conexión»',
      ok: c.guardados > 0,
    },
    {
      titulo: '2. Activar el Modo Avión',
      detalle: c.sinConexion ? 'Sin conexión: aparece la barra de estado' : 'Activa el Modo Avión (o «Offline» en las herramientas del navegador)',
      ok: c.sinConexion,
    },
    {
      titulo: '3. Abrir o recargar la PWA',
      detalle: c.sinConexion && c.swControla ? 'El portal carga desde la caché' : 'Con el Modo Avión activo, recarga esta página: debe abrir desde la caché',
      ok: c.sinConexion && c.swControla,
    },
    {
      titulo: '4. Abrir el pase guardado',
      detalle: 'Se muestra el código QR y los datos del evento',
      ok: c.guardados > 0 && c.rutaQrGuardada,
      enlace: RUTAS_QR[0],
    },
  ];

  const auditoria: { etiqueta: string; estado: EstadoNavegador }[] = [
    { etiqueta: 'Lighthouse: PWA instalable', estado: c.manifest && c.swRegistrado ? 'aprobado' : 'pendiente' },
    { etiqueta: 'Lighthouse: responde sin conexión', estado: c.swControla ? 'aprobado' : 'pendiente' },
    { etiqueta: 'Lighthouse: Service Worker registrado', estado: c.swRegistrado ? 'aprobado' : 'pendiente' },
    ...RESULTADOS_NAVEGADORES.map(r => ({ etiqueta: r.navegador, estado: r.estado })),
  ];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6 md:py-8">
      <section className="relative overflow-hidden rounded-3xl bg-[#1B2632] px-6 py-8 text-white md:px-12 md:py-10">
        <Image src="/images/institucional/inicio-egresados.jpg" alt="" fill priority sizes="(min-width: 1152px) 1152px, 100vw" className="object-cover opacity-40" />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-[#1B2632] via-[#1B2632]/85 to-transparent" />
        <div className="relative max-w-xl">
          <p className="text-base text-slate-200">Sprint 3 · Demo de calificación</p>
          <h1 className="mt-1 font-serif text-4xl font-bold tracking-wide md:text-5xl">UMSS<span className="text-[#FFB162]">PIRA</span></h1>
          <p className="mt-3 text-sm text-slate-200 md:text-base">Validación del funcionamiento sin conexión.</p>
        </div>
      </section>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <section aria-labelledby="hu8-flujo" data-testid="hu8-flujo" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <h2 id="hu8-flujo" className="font-serif text-2xl font-bold text-[#1B2632]">Flujo en Modo Avión</h2>
          <ol className="mt-4 divide-y divide-slate-100">
            {pasos.map((paso, indice) => (
              <li key={paso.titulo} data-testid={`hu8-paso-${indice + 1}`} data-estado={paso.ok ? 'ok' : 'pendiente'} className="flex items-center gap-3 py-3.5">
                <Marca ok={paso.ok} numero={indice + 1} />
                <div className="min-w-0">
                  <p className="font-semibold text-[#1B2632]">{paso.titulo}</p>
                  <p className="text-sm text-slate-500">
                    {paso.detalle}
                    {paso.enlace && <> · <Link href={paso.enlace} prefetch={false} className="font-semibold text-[#B44735] underline">Abrir Mis QR</Link></>}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="hu8-auditoria" data-testid="hu8-auditoria" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <h2 id="hu8-auditoria" className="font-serif text-2xl font-bold text-[#1B2632]">Auditoría y navegadores</h2>
          <ul className="mt-4 divide-y divide-slate-100">
            {auditoria.map(fila => (
              <li key={fila.etiqueta} data-estado={fila.estado} className="flex items-center justify-between gap-3 py-3.5 text-[#1B2632]">
                <span>{fila.etiqueta}</span>
                <EstadoTexto estado={fila.estado} />
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-500">Las filas de Lighthouse se comprueban en este dispositivo; la auditoría oficial y los navegadores se registran siguiendo el guion de la demostración.</p>
        </section>
      </div>
    </div>
  );
}
