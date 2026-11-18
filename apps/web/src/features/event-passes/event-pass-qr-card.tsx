
'use client';

import { useEffect, useState } from 'react';
import type { EventPassDto } from '@umsspira/shared-types';
import {
  getOfflineQrPass,
  saveOfflineQrPass,
} from './offline/offline-qr-storage';
import { EventPassCard } from '@/modules/events/components/EventPassCard';
import { OFFLINE_PASS_INVALID_MESSAGE } from './offline/offline-sync';

interface EventPassQrCardProps {
  pass: EventPassDto;

  offlineUnverified?: boolean;

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

  offlineUnverified = false,

  fromOfflineStorage = false,

}: EventPassQrCardProps) {
  const isValid =
    offlineUnverified ||
    (pass.status === 'ACTIVO' && pass.isValidForAccess);

  const details = pass.eventDetails;
const [isSavedOffline, setIsSavedOffline] = useState(false);
const [isSavingOffline, setIsSavingOffline] = useState(false);
const [saveOfflineMessage, setSaveOfflineMessage] = useState('');
useEffect(() => {
  let active = true;

  async function checkOfflinePass() {
    setIsSavedOffline(false);
    setSaveOfflineMessage('');

    if (!pass.id || !pass.userId) return;

    try {
      const savedPass = await getOfflineQrPass(
        pass.id,
        pass.userId,
      );

      if (!active) return;

      if (savedPass) {
        setIsSavedOffline(true);
        setSaveOfflineMessage(
          'Este pase ya está guardado en este dispositivo.',
        );
      }
    } catch {
      // Si falla la consulta local, se mantiene disponible
      // la opción de guardar nuevamente.
    }
  }

  void checkOfflinePass();

  return () => {
    active = false;
  };
}, [pass.id, pass.userId]);

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
        ? `${OFFLINE_PASS_INVALID_MESSAGE}. Fue invalidado y ya no permite el acceso al evento.`
        : 'Este pase no está habilitado para acceder al evento.';

  return (
    <EventPassCard
      status={isValid ? 'ACTIVO' : 'INVALID'}
      statusLabel={
  offlineUnverified
    ? 'GUARDADO SIN CONEXIÓN'
    : statusLabel
}
offlineUnverified={offlineUnverified}
      statusDescription={statusDescription}
      hideBackButton
      eventName={details?.name || 'Evento sin nombre'}
      userName={details?.userName || 'Titulado'}
      dateTime={formatEventDate(details?.dateTime)}
      location={details?.location || 'Ubicación no disponible'}
      passId={pass.id}
      qrToken={isValid ? pass.qrToken : undefined}

onSaveOffline={
  !offlineUnverified && isValid
    ? handleSaveOffline
    : undefined
}

onSaveOffline={isValid && !fromOfflineStorage ? handleSaveOffline : undefined}

isSavedOffline={isSavedOffline}
isSavingOffline={isSavingOffline}
saveOfflineMessage={saveOfflineMessage}
      onBack={() => window.history.back()}
    />
  );
}