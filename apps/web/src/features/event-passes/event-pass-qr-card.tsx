
'use client';

import { useState } from 'react';
import type { EventPassDto } from '@umsspira/shared-types';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { saveOfflineQrPass } from './offline/offline-qr-storage';
import { unmarkPassRemoved } from './offline/auto-save-passes';
import { EventPassCard } from '@/modules/events/components/EventPassCard';
import { OFFLINE_PASS_INVALID_MESSAGE } from './offline/offline-sync';

interface EventPassQrCardProps {
  pass: EventPassDto;
  savedOffline?: boolean;
  updated?: boolean;
  offline?: boolean;
  backHref?: string;
  /** true cuando el pase viene del dispositivo (sin conexión): no se ofrece guardarlo de nuevo. */
  fromOfflineStorage?: boolean;
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

export function EventPassQrCard({
  pass,
  savedOffline = false,
  updated = false,
  offline = false,
  backHref = '/mis-pases',
  fromOfflineStorage = false,
}: EventPassQrCardProps) {
  const isValid =
    pass.status === 'ACTIVO' && pass.isValidForAccess;

  const details = pass.eventDetails;
const [isSavedOffline, setIsSavedOffline] = useState(false);
const [isSavingOffline, setIsSavingOffline] = useState(false);
const [saveOfflineMessage, setSaveOfflineMessage] = useState('');

const handleSaveOffline = async () => {
  if (!isValid || !details || isSavingOffline || isSavedOffline) {
    return;
  }

  if (
    !pass.id?.trim() ||
    !pass.userId?.trim() ||
    !pass.qrToken?.trim() ||
    !details.name?.trim() ||
    !details.userName?.trim() ||
    !details.dateTime?.trim() ||
    !details.location?.trim()
  ) {
    setSaveOfflineMessage(
      'No se puede guardar: faltan datos del pase o del evento.'
    );
    return;
  }

  setIsSavingOffline(true);
  setSaveOfflineMessage('');

  try {
    await saveOfflineQrPass({
      id: pass.id,
      userId: pass.userId,
      qrToken: pass.qrToken,
      eventDetails: {
        name: details.name,
        userName: details.userName,
        dateTime: details.dateTime,
        location: details.location,
      },
    });

    unmarkPassRemoved(pass.userId, pass.id);
    setIsSavedOffline(true);
    setSaveOfflineMessage('Tu pase QR se guardó en este dispositivo.');
  } catch (error) {
    setSaveOfflineMessage(
      error instanceof Error
        ? `${error.message} Puedes intentarlo nuevamente.`
        : 'No se pudo guardar el pase. Inténtalo nuevamente.'
    );
  } finally {
    setIsSavingOffline(false);
  }
};

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
        ? `${OFFLINE_PASS_INVALID_MESSAGE}. Fue invalidado y ya no permite el acceso al evento.`
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
      onSaveOffline={isValid && !fromOfflineStorage && !offline ? handleSaveOffline : undefined}
      isSavedOffline={isSavedOffline}
      isSavingOffline={isSavingOffline}
      saveOfflineMessage={saveOfflineMessage}
    />
  );
}