'use client';

import { useEffect, useState } from 'react';
import type { EventPassDto } from '@umsspira/shared-types';

import {
  getOfflineQrPass,
  saveOfflineQrPass,
} from './offline/offline-qr-storage';

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
  offlineUnverified?: boolean;
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
  const [isSavedOffline, setIsSavedOffline] = useState(false);
  const [isSavingOffline, setIsSavingOffline] = useState(false);
  const [saveOfflineMessage, setSaveOfflineMessage] = useState('');

  const details = pass.eventDetails;


  const isValid =
    pass.status === 'ACTIVO' &&
    pass.isValidForAccess === true &&
    Boolean(pass.qrToken?.trim());

  const canDisplayOfflineQr =
    offlineUnverified &&
    fromOfflineStorage &&
    isValid;

  const canDisplayQr = isValid || canDisplayOfflineQr;

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
        // La consulta local no debe impedir mostrar el pase.
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

      setSaveOfflineMessage(
        'No se puede guardar: faltan datos del pase o del evento.',
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
        status: pass.status,
        isValidForAccess: pass.isValidForAccess,
      });

      setIsSavedOffline(true);
      setSaveOfflineMessage(
        'Tu pase QR se guardó en este dispositivo.',
      );
    } catch (error) {
      setSaveOfflineMessage(
        error instanceof Error
          ? `${error.message} Puedes intentarlo nuevamente.`
          : 'No se pudo guardar el pase. Inténtalo nuevamente.',
      );
    } finally {
      setIsSavingOffline(false);
    }
  };

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
      statusLabel={
        canDisplayOfflineQr
          ? 'GUARDADO SIN CONEXIÓN'
          : statusLabel
      }
      offlineUnverified={canDisplayOfflineQr}
      statusDescription={statusDescription}
      hideBackButton
      eventName={details?.name || 'Evento sin nombre'}
      userName={details?.userName || 'Titulado'}
      dateTime={formatEventDate(details?.dateTime)}
      location={details?.location || 'Ubicación no disponible'}
      passId={pass.id}

      qrToken={canDisplayQr ? pass.qrToken : undefined}
      onSaveOffline={
        isValid && !offlineUnverified && !fromOfflineStorage
          ? handleSaveOffline
          : undefined
      }
      isSavedOffline={isSavedOffline}
      isSavingOffline={isSavingOffline}
      saveOfflineMessage={saveOfflineMessage}

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