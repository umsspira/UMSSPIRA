'use client';

import { useState } from 'react';
import type { EventPassDto } from '@umsspira/shared-types';
import { saveOfflineQrPass } from './offline/offline-qr-storage';
import { EventPassCard } from '@/modules/events/components/EventPassCard';
import { OFFLINE_PASS_INVALID_MESSAGE } from './offline/offline-sync';
import {
  ActionNotice,
  ActionStatusNotice,
  OFFLINE_ACTION_MESSAGE,
} from '@/shared/components/action-notice';
import { useActionStatus } from '@/shared/hooks/use-action-status';
import { useOnlineStatus } from '@/shared/hooks/use-online-status';

interface EventPassQrCardProps {
  pass: EventPassDto;
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
  fromOfflineStorage = false,
}: EventPassQrCardProps) {
  const isValid =
    pass.status === 'ACTIVO' && pass.isValidForAccess;

  const details = pass.eventDetails;
  const [isSavedOffline, setIsSavedOffline] = useState(false);
  const isOnline = useOnlineStatus();
  const { status, errorMessage, run, retry, reset } = useActionStatus();
  const isSavingOffline = status === 'loading';

  // HU10: toda la validación y el guardado pasan por useActionStatus
  // (carga inmediata, éxito, error con «Reintentar» y aviso sin conexión).
  const saveOfflinePass = async () => {
    if (
      !details ||
      !pass.id?.trim() ||
      !pass.userId?.trim() ||
      !pass.qrToken?.trim() ||
      !details.name?.trim() ||
      !details.userName?.trim() ||
      !details.dateTime?.trim() ||
      !details.location?.trim()
    ) {
      throw new Error('Faltan datos del pase o del evento.');
    }

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
  };

  const handleSaveOffline = () => {
    if (!isValid || isSavingOffline || isSavedOffline) return;
    // Guardar un QR nuevo requiere conexión (HU10 CA-04).
    void run(saveOfflinePass, { requiresConnection: true });
  };

  const saveOfflineNotice =
    !isOnline && !isSavedOffline ? (
      <ActionNotice state="offline" message={OFFLINE_ACTION_MESSAGE} />
    ) : (
      <ActionStatusNotice
        status={status}
        messages={{
          loading: 'Guardando tu pase QR…',
          success: 'QR guardado en tu dispositivo',
          error: 'No se pudo guardar el pase QR',
        }}
        errorDetail={errorMessage}
        onRetry={() => void retry()}
        onDismiss={reset}
      />
    );

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
      statusLabel={statusLabel}
      statusDescription={statusDescription}
      hideBackButton
      eventName={details?.name || 'Evento sin nombre'}
      userName={details?.userName || 'Titulado'}
      dateTime={formatEventDate(details?.dateTime)}
      location={details?.location || 'Ubicación no disponible'}
      passId={pass.id}
      qrToken={isValid ? pass.qrToken : undefined}
onSaveOffline={isValid && !fromOfflineStorage ? handleSaveOffline : undefined}
      isSavedOffline={isSavedOffline}
      isSavingOffline={isSavingOffline}
      saveOfflineDisabled={!isOnline}
      saveOfflineNotice={saveOfflineNotice}
      onBack={() => window.history.back()}
    />
  );
}