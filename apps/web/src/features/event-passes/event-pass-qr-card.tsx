
'use client';

import { useState } from 'react';
import type { EventPassDto } from '@umsspira/shared-types';
import { saveOfflineQrPass } from './offline/offline-qr-storage';
import { EventPassCard } from '@/modules/events/components/EventPassCard';

interface EventPassQrCardProps {
  pass: EventPassDto;
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

export function EventPassQrCard({ pass }: EventPassQrCardProps) {
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
    ? 'PASE ACTIVO'
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

  return (
    <EventPassCard
      status={isValid ? 'ACTIVO' : 'INVALID'}
      statusLabel={statusLabel}
      statusDescription={statusDescription}
      hideBackButton
      eventName={details?.name || 'Evento sin nombre'}
      userName={details?.userName || 'Titulado'}
      dateTime={formatEventDate(details?.dateTime)}
      location={details?.location || 'Ubicación no disponible'}
      passId={pass.id}
      qrToken={isValid ? pass.qrToken : undefined}
onSaveOffline={isValid ? handleSaveOffline : undefined}
isSavedOffline={isSavedOffline}
isSavingOffline={isSavingOffline}
saveOfflineMessage={saveOfflineMessage}
      onBack={() => window.history.back()}
    />
  );
}
