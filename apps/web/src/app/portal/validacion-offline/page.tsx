'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { EVENT_STATUS, type EventItem } from '@umsspira/shared-types';
import { getEventCatalog } from '@/shared/services/events-service';

const ACCESOS_RAPIDOS = [
  {
    href: '/portal/eventos',
    titulo: 'Eventos',
    descripcion: 'Participa en los próximos eventos de la comunidad UMSS.',
  },
  {
    href: '/portal/beneficios',
    titulo: 'Beneficios',
    descripcion: 'Descubre los convenios y descuentos para titulados.',
  },
  {
    href: '/portal/empleos',
    titulo: 'Empleos',
    descripcion: 'Encuentra ofertas laborales y oportunidades.',
  },
  {
    href: '/portal/mentorias',
    titulo: 'Mentorías',
    descripcion: 'Conecta con profesionales que pueden guiarte.',
  },
];

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
  const [enLinea, setEnLinea] = useState(true);

  useEffect(() => {
    const actualizar = () => setEnLinea(navigator.onLine);
    actualizar();
    window.addEventListener('online', actualizar);
    window.addEventListener('offline', actualizar);
    return () => {
      window.removeEventListener('online', actualizar);
      window.removeEventListener('offline', actualizar);
    };
  }, []);

  return enLinea;
}

function ImagenEvento({ evento }: { evento: EventItem }) {
  if (!evento.imageUrl) {
    return (
      <div
        role="img"
        aria-label={`Imagen no disponible para ${evento.title}`}
        className="flex h-40 w-full items-center justify-center bg-slate-100 text-sm text-slate-500"
      >
        Sin imagen
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
  const enLinea = useEstaEnLinea();
  const [eventos, setEventos] = useState<EventItem[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;

    getEventCatalog()
      .then((catalogo) => {
        if (!activo) return;
        const publicados = catalogo
          .filter((evento) => evento.status === EVENT_STATUS.PUBLICADO)
          .sort((a, b) => a.startDate.localeCompare(b.startDate))
          .slice(0, 3);
        setEventos(publicados);
      })
      .catch(() => {
        if (activo) setEventos([]);
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, []);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6 md:py-8">
      {!enLinea && (
        <Link
          href="/mis-pases"
          data-testid="home-offline-qr-access"
          className="mb-5 block rounded-2xl bg-[#B44735] px-6 py-5 text-lg font-bold text-white shadow-sm"
        >
          Mis códigos QR
        </Link>
      )}

      <section className="rounded-3xl bg-[#1B2632] px-6 py-8 text-white md:px-12 md:py-10">
        <h1 className="font-serif text-4xl font-bold tracking-wide md:text-5xl">
          UMSS<span className="text-[#FFB162]">PIRA</span>
        </h1>
        <p className="mt-3 text-sm text-slate-200 md:text-base">
          El portal de la comunidad de titulados de la UMSS.
        </p>
      </section>

      <section
        data-testid="home-primary-actions"
        aria-label="Accesos rápidos"
        className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {ACCESOS_RAPIDOS.map((acceso) => (
          <Link
            key={acceso.href}
            href={acceso.href}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="font-semibold text-[#1B2632]">{acceso.titulo}</p>
            <p className="mt-1 text-sm text-slate-500">{acceso.descripcion}</p>
          </Link>
        ))}

        {enLinea && (
          <Link
            href="/mis-pases"
            data-testid="home-online-qr-access"
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="font-semibold text-[#1B2632]">Mis códigos QR</p>
            <p className="mt-1 text-sm text-slate-500">Accede a tus pases de entrada.</p>
          </Link>
        )}
      </section>

      <section className="mt-8">
        <h2 className="font-serif text-2xl font-bold text-[#1B2632]">Próximos eventos</h2>

        {cargando && <p className="mt-4 text-sm text-slate-500">Cargando eventos…</p>}

        {!cargando && eventos.length === 0 && (
          <p className="mt-4 text-sm text-slate-500">No hay eventos próximos por ahora.</p>
        )}

        <ul className="mt-4 grid gap-5 md:grid-cols-3">
          {eventos.map((evento) => (
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
