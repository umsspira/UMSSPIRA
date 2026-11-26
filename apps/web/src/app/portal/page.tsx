'use client';

import { useKnownRole } from '@/shared/hooks/use-known-role';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Briefcase, Calendar, ChevronRight, QrCode, Search, Users, WifiOff } from 'lucide-react';
import { EVENT_STATUS, type EventItem } from '@umsspira/shared-types';
import umssBg from '@/shared/assets/images/14sept.webp';
import { useRealConnection } from '@/shared/hooks/use-real-connection';
import { CONNECTION_MODE_LABEL, useConnectionMode } from '@/shared/hooks/use-connection-mode';
import { getEventCatalog } from '@/shared/services/events-service';
import { SectionUnavailable } from '@/shared/components/section-boundary';
import { logSectionFailure } from '@/shared/services/section-failure-log';
import { SectionTimeoutError, withTimeout } from '@/shared/utils/with-timeout';

const ACCESOS_RAPIDOS = [
  {
    href: '/portal/eventos',
    titulo: 'Eventos',
    Icon: Calendar,
    iconStyle: 'bg-amber-50 text-amber-600',
    descripcion: 'Participa en los próximos eventos de la comunidad UMSS.',
  },
  {
    href: '/portal/empleos',
    titulo: 'Empleos',
    Icon: Briefcase,
    iconStyle: 'bg-blue-50 text-blue-600',
    descripcion: 'Encuentra ofertas laborales y oportunidades.',
  },
  {
    href: '/portal/mentorias',
    titulo: 'Mentorías',
    Icon: Users,
    iconStyle: 'bg-slate-100 text-slate-700',
    descripcion: 'Conecta con profesionales que pueden guiarte.',
  },
];

const normalizar = (texto: string) =>
  texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const ZONA_HORARIA = 'America/La_Paz';

function formatearFecha(iso: string): string {
  return new Intl.DateTimeFormat('es-BO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: ZONA_HORARIA,
  }).format(new Date(iso));
}

function formatearHora(iso: string): string {
  return new Intl.DateTimeFormat('es-BO', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: ZONA_HORARIA,
  }).format(new Date(iso));
}

function useEstaEnLinea(): boolean {
  return useRealConnection();
}

function ImagenEvento({ evento }: { evento: EventItem }) {
  if (!evento.imageUrl) {
    return (
      <div
        role="img"
        aria-label={`Imagen no disponible para ${evento.title}`}
        className="flex h-40 w-full items-center justify-center bg-gradient-to-br from-[#0F172A] to-[#2C3B4D] text-amber-400"
      >
        <Calendar className="h-12 w-12" aria-hidden="true" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={evento.imageUrl}
      alt={`Imagen del evento ${evento.title}`}
      className="h-40 w-full object-cover"
    />
  );
}

export default function Home() {
  const esTitulado = [null, 'titulado'].includes(useKnownRole());
  const enLinea = useEstaEnLinea();
  const modoConexion = useConnectionMode();
  const [eventos, setEventos] = useState<EventItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [consulta, setConsulta] = useState('');
  // HU18: si la sección de eventos falla o tarda más de 8 s, solo ella muestra «Reintentar».
  const [eventosFallo, setEventosFallo] = useState<'no' | 'error' | 'tiempo'>('no');
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let activo = true;
    setCargando(true);
    setEventosFallo('no');

    withTimeout(() => getEventCatalog())
      .then((catalogo) => {
        if (!activo) return;
        const publicados = catalogo
          .filter((evento) => evento.status === EVENT_STATUS.PUBLICADO)
          .sort((a, b) => a.startDate.localeCompare(b.startDate))
          .slice(0, 3);
        setEventos(publicados);
      })
      .catch((error: unknown) => {
        if (!activo) return;
        setEventos([]);
        logSectionFailure('home-events', error instanceof SectionTimeoutError ? 'timeout' : 'error', error);
        // Sin conexión el aviso general del inicio ya lo explica: no se duplica.
        if (typeof navigator === 'undefined' || navigator.onLine) {
          setEventosFallo(error instanceof SectionTimeoutError ? 'tiempo' : 'error');
        }
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [intento]);

  const termino = normalizar(consulta.trim());
  const accesos = useMemo(
    () => (termino ? ACCESOS_RAPIDOS.filter((a) => normalizar(`${a.titulo} ${a.descripcion}`).includes(termino)) : ACCESOS_RAPIDOS),
    [termino],
  );
  const eventosFiltrados = useMemo(
    () => (termino ? eventos.filter((e) => normalizar(`${e.title} ${e.location ?? ''}`).includes(termino)) : eventos),
    [termino, eventos],
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6 md:py-8">
      {!enLinea && (
        <>
          <p
            role="status"
            data-testid="home-offline-notice"
            className="mb-4 rounded-2xl bg-[#B44735] px-5 py-4 text-sm font-medium text-white shadow-sm"
          >
            Estás navegando sin conexión. Algunos contenidos pueden no estar actualizados.
          </p>
          {esTitulado && (
<Link
            href="/mis-pases"
            data-testid="home-offline-qr-access"
            className="mb-5 flex items-center gap-3 rounded-2xl bg-[#1B2632] px-5 py-4 text-[#EEE9DF] shadow-md transition-colors hover:bg-[#2C3B4D] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFB162]"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-base font-bold">Mis códigos QR</span>
              <span className="block text-xs opacity-85">Tus pases guardados están disponibles sin conexión.</span>
            </span>
            <span aria-hidden="true" className="text-xl text-[#FFB162]">›</span>
          </Link>
)}
        </>
      )}

      <section className="relative overflow-hidden rounded-3xl bg-[#1B2632] px-6 py-8 text-white md:px-12 md:py-12">
        <div className="absolute inset-0 z-0" aria-hidden="true">
          <Image src={umssBg} alt="" fill sizes="100vw" className="object-cover object-center" priority />
          <div className="absolute inset-0 bg-[#0F172A]/60" />
        </div>
        <span
          data-testid="home-connection-status"
          data-estado={enLinea ? 'en-linea' : 'sin-conexion'}
          className={`absolute right-4 top-4 z-10 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider backdrop-blur-md ${
            enLinea
              ? 'border-green-500/30 bg-green-500/20 text-green-300'
              : 'border-red-400/40 bg-red-500/20 text-red-200'
          }`}
        >
          <span aria-hidden="true" className={`h-2 w-2 rounded-full ${enLinea ? 'bg-green-400' : 'bg-red-400'}`} />
          {CONNECTION_MODE_LABEL[modoConexion]}
        </span>
        <div className="relative z-10 max-w-2xl space-y-3 pt-6 sm:pt-0">
          <h1 className="font-serif text-4xl font-bold tracking-wide md:text-5xl">
            UMSS<span className="text-[#FFB162]">PIRA</span>
          </h1>
          <p className="text-sm text-slate-200 md:text-base">
            El portal de la comunidad de titulados de la UMSS.
          </p>
          <form role="search" onSubmit={(e) => e.preventDefault()} className="relative max-w-xl pt-2">
            <Search className="pointer-events-none absolute left-4 top-1/2 mt-1 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              type="search"
              value={consulta}
              onChange={(e) => setConsulta(e.target.value)}
              disabled={!enLinea}
              aria-label="Buscar eventos y empleos"
              placeholder="Busque eventos, empleos..."
              className="min-h-[44px] w-full rounded-xl bg-white py-3 pl-11 pr-4 text-base text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </form>
        </div>
      </section>

      <section
        data-testid="home-primary-actions"
        aria-label="Accesos rápidos"
        className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {accesos.map(({ href, titulo, descripcion, Icon, iconStyle }) => (
          <Link
            key={href}
            href={href}
            className="flex min-h-[44px] flex-col justify-between gap-4 rounded-2xl border border-[#C9C1B1] bg-[#F5F2EA] p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <span className="flex items-start justify-between">
              <span aria-hidden="true" className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconStyle}`}>
                <Icon className="h-5 w-5" />
              </span>
              <ChevronRight className="h-5 w-5 text-slate-400" aria-hidden="true" />
            </span>
            <span>
              <span className="block font-bold text-[#1B2632]">{titulo}</span>
              <span className="mt-1 block text-sm text-slate-500">{descripcion}</span>
            </span>
          </Link>
        ))}

        {enLinea && !termino && esTitulado && (
<Link
            href="/mis-pases"
            data-testid="home-online-qr-access"
            className="flex min-h-[44px] flex-col justify-between gap-4 rounded-2xl border border-[#C9C1B1] bg-[#F5F2EA] p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <span className="flex items-start justify-between">
              <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1B2632] text-[#FFB162]">
                <QrCode className="h-5 w-5" />
              </span>
              <ChevronRight className="h-5 w-5 text-slate-400" aria-hidden="true" />
            </span>
            <span>
              <span className="block font-bold text-[#1B2632]">Mis códigos QR</span>
              <span className="mt-1 block text-sm text-slate-500">Accede a tus pases de entrada.</span>
            </span>
          </Link>
        )}
      </section>

      <section className="mt-8">
        <h2 className="font-serif text-2xl font-bold text-[#1B2632]">Próximos eventos</h2>

        {cargando && <p className="mt-4 text-sm text-slate-500">Cargando eventos…</p>}

        {!cargando && enLinea && eventosFallo !== 'no' && (
          <div className="mt-4" data-testid="home-events-unavailable">
            <SectionUnavailable
              title="Próximos eventos"
              timedOut={eventosFallo === 'tiempo'}
              onRetry={() => setIntento((valor) => valor + 1)}
            />
          </div>
        )}

        {!cargando && !enLinea && eventosFiltrados.length === 0 && (
          <div
            data-testid="home-offline-card"
            className="mt-4 flex flex-col items-center rounded-2xl bg-white px-6 py-12 text-center shadow-sm"
          >
            <span aria-hidden="true" className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600">
              <WifiOff className="h-8 w-8" />
            </span>
            <h3 className="mt-5 text-2xl font-bold text-[#1B2632]">Sin conexión a Internet</h3>
            <p className="mt-2 max-w-md text-sm text-slate-500">
              Puedes seguir navegando por las secciones guardadas. La barra se oculta sola cuando vuelva la red.
            </p>
          </div>
        )}

        {!cargando && enLinea && eventosFallo === 'no' && eventosFiltrados.length === 0 && (
          <p className="mt-4 text-sm text-slate-500">No hay eventos próximos por ahora.</p>
        )}

        <ul className="mt-4 grid gap-5 md:grid-cols-3">
          {eventosFiltrados.map((evento) => (
            <li
              key={evento.id}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              <Link href={`/portal/eventos/${evento.id}`} className="block">
                <ImagenEvento evento={evento} />
                <div className="p-4">
                  <h3 className="font-semibold text-[#1B2632]">{evento.title}</h3>
                  <p className="mt-1 text-sm text-slate-500">{formatearFecha(evento.startDate)}</p>
                  <p className="text-sm text-slate-500">
                    {formatearHora(evento.startDate)} - {formatearHora(evento.endDate)}
                  </p>
                  <p className="text-sm text-slate-500">{evento.location}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}