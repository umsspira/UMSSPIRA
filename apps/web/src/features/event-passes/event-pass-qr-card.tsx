
'use client';

import type { EventPassDto } from '@umsspira/shared-types';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { EventPassCard } from '@/modules/events/components/EventPassCard';

interface EventPassQrCardProps {
  pass: EventPassDto;
  savedOffline?: boolean;
  updated?: boolean;
  offline?: boolean;
  backHref?: string;
}

function formatEventDate(value?: string): string {
  if (!value) return 'Fecha no disponible';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Fecha no disponible';
  }

  return new Intl.DateTimeFormat('es-BO', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'America/La_Paz',
  }).format(date);
}

export function EventPassQrCard({ pass, savedOffline = false, updated = false, offline = false, backHref = '/mis-pases' }: EventPassQrCardProps) {
  const isValid =
    pass.status === 'ACTIVO' && pass.isValidForAccess;

  const details = pass.eventDetails;

  const statusLabel = isValid
    ? (offline ? 'ESTADO SIN VERIFICAR' : 'INSCRIPCIÓN CONFIRMADA')
    : pass.status === 'VENCIDO'
      ? 'PASE VENCIDO'
      : pass.status === 'INVALIDADO'
        ? 'PASE INVALIDADO'
        : 'PASE NO HABILITADO';

  const statusDescription =
    pass.status === 'VENCIDO'
      ? 'Este pase ha vencido y ya no permite el acceso al evento.'
      : pass.status === 'INVALIDADO'
        ? 'Este pase ha sido invalidado y ya no permite el acceso al evento.'
        : 'Este pase no está habilitado para acceder al evento.';

  if (!isValid) {
    return (
      <div className="hu12-invalid-wrapper">
        <article className="hu12-invalid-card">
          <div className="hu12-invalid-visual" aria-label="Pase no válido">
            <div className="hu12-invalid-pattern" aria-hidden="true">
              <QRCodeSVG
                value="PASE NO VALIDO"
                size={160}
                fgColor="#eee9df"
                bgColor="#293b50"
              />
            </div>
            <span>NO VÁLIDO</span>
          </div>
          <div className="hu12-invalid-content">
            <h2>{details?.name || 'Evento sin nombre'}</h2>
            <p className="hu12-invalid-badge">{statusLabel}</p>
            <p className="hu12-invalid-description">{statusDescription}</p>
            <p className="hu12-invalid-id">ID PASE: {pass.id}</p>
            <Link href={backHref} className="hu12-invalid-back">
              Volver a mis pases
            </Link>
          </div>
        </article>
        <section className="hu12-invalid-notice" role="status">
          <strong>Pase no vigente</strong>
          <p>El evento o tu inscripción cambió. Este código ya no permite registrar asistencia.</p>
        </section>
      </div>
    );
  }

  return (
    <EventPassCard
      status={isValid ? 'ACTIVO' : 'INVALID'}
      statusLabel={statusLabel}
      statusDescription={statusDescription}
      savedOffline={savedOffline}
      updated={updated}
      offline={offline}
      backHref={backHref}
      eventName={details?.name || 'Evento sin nombre'}
      userName={details?.userName || 'Titulado'}
      dateTime={formatEventDate(details?.dateTime)}
      location={details?.location || 'Ubicación no disponible'}
      passId={pass.id}
      qrToken={isValid ? pass.qrToken : undefined}
      onBack={() => window.location.assign(backHref)}
    />
  );
}
