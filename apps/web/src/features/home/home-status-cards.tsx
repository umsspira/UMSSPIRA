'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight, MessageSquare, Ticket } from 'lucide-react';

import { SectionBoundary, SectionUnavailable } from '@/shared/components/section-boundary';
import { useSectionLoader } from '@/shared/hooks/use-section-loader';

import { homeSectionsAdapter } from './home-sections-adapter';
import type { HomeSectionsPort } from './home-sections-port';

interface PortProps {
  port: HomeSectionsPort;
}

interface InfoCardProps {
  href: string;
  title: string;
  lines: string[];
  action: string;
  Icon: typeof Ticket;
}

function InfoCard({ href, title, lines, action, Icon }: InfoCardProps) {
  return (
    <article className="flex h-full flex-col justify-between gap-4 rounded-2xl border border-[#C9C1B1] bg-[#F5F2EA] p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h3 className="font-bold text-slate-900">{title}</h3>
          {lines.map((line) => (
            <p key={line} className="mt-1 text-xs text-slate-600">
              {line}
            </p>
          ))}
        </div>
      </div>
      <Link
        href={href}
        className="inline-flex min-h-[44px] items-center justify-center gap-1 self-start rounded-full bg-amber-600 px-4 text-sm font-semibold text-white hover:bg-amber-700"
      >
        {action}
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </article>
  );
}

function LoadingCard({ title }: { title: string }) {
  return (
    <div
      role="status"
      className="flex h-full flex-col gap-1 rounded-2xl border border-[#C9C1B1] bg-white p-5 shadow-sm"
    >
      <h3 className="font-bold text-slate-900">{title}</h3>
      <p className="text-xs text-slate-500">Cargando…</p>
    </div>
  );
}

function QrCard({ port }: PortProps) {
  const { state, retry } = useSectionLoader('home-qr', (signal) => port.loadQrSummary(signal));

  if (state.status === 'loading') return <LoadingCard title="Mis códigos QR" />;
  if (state.status === 'unavailable') {
    return <SectionUnavailable title="Mis códigos QR" timedOut={state.timedOut} onRetry={retry} />;
  }

  const { total, source } = state.data;
  return (
    <InfoCard
      href="/mis-pases"
      title="Mis códigos QR"
      lines={[
        `${total} ${total === 1 ? 'pase guardado' : 'pases guardados'}`,
        source === 'offline' ? 'Mostrando lo guardado en tu dispositivo' : 'Disponible sin conexión',
      ]}
      action="Abrir mi pase"
      Icon={Ticket}
    />
  );
}

function MessagesCard({ port }: PortProps) {
  const { state, retry } = useSectionLoader('home-messages', (signal) =>
    port.loadUnreadMessages(signal),
  );

  if (state.status === 'loading') return <LoadingCard title="Mensajes" />;
  if (state.status === 'unavailable') {
    return <SectionUnavailable title="Mensajes" timedOut={state.timedOut} onRetry={retry} />;
  }

  const { unread } = state.data;
  return (
    <InfoCard
      href="/portal/mensajes"
      title="Mensajes"
      lines={[unread === 0 ? 'No tienes mensajes sin leer' : `${unread} sin leer`]}
      action="Abrir mensajes"
      Icon={MessageSquare}
    />
  );
}

/**
 * HU18: cada tarjeta es una sección independiente. Si una falla o tarda más de 8 s,
 * solo ella muestra «Esta sección no está disponible. Reintentar».
 */
export function HomeStatusCards({ port = homeSectionsAdapter }: Partial<PortProps>) {
  return (
    <section
      aria-label="Estado de tus secciones"
      className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2"
    >
      <SectionBoundary sectionId="home-qr-card" title="Mis códigos QR">
        <QrCard port={port} />
      </SectionBoundary>
      <SectionBoundary sectionId="home-messages-card" title="Mensajes">
        <MessagesCard port={port} />
      </SectionBoundary>
    </section>
  );
}