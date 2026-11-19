
'use client';

import { useEffect, useRef, useState } from 'react';
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
  fromOfflineStorage?: boolean;
}

type SaveStatus = 'idle' | 'loading' | 'success' | 'error' | 'offline';

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
  const [isOnline, setIsOnline] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [saveOfflineMessage, setSaveOfflineMessage] = useState('');
  const busy = useRef(false);

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

  const isSavingOffline = saveStatus === 'loading';

  useEffect(() => {
    const updateStatus = () => {
      const online = navigator.onLine;
      setIsOnline(online);

      if (online) {
        setSaveStatus((current) =>
          current === 'offline' ? 'idle' : current,
        );
        setSaveOfflineMessage((current) =>
          current.startsWith('Necesitas conexión') ? '' : current,
        );
      }
    };

    updateStatus();

    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);

    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
    };
  }, []);

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
          setSaveStatus('success');
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
    if (!isValid || !details || busy.current || isSavedOffline) {
      return;
    }

    if (!isOnline || !navigator.onLine) {
      setSaveStatus('offline');
      setSaveOfflineMessage(
        'Necesitas conexión a internet para guardar un pase nuevo.',
      );
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
      setSaveStatus('error');
      setSaveOfflineMessage(
        'No se puede guardar: faltan datos del pase o del evento.',
      );
      return;
    }

    busy.current = true;
    setSaveStatus('loading');
    setSaveOfflineMessage('Guardando tu pase QR…');

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
      setSaveStatus('success');
      setSaveOfflineMessage(
        'QR guardado en tu dispositivo.',
      );
    } catch (error) {
      setSaveStatus('error');
      setSaveOfflineMessage(
        error instanceof Error
          ? `${error.message} Puedes intentarlo nuevamente.`
          : 'No se pudo guardar el pase. Inténtalo nuevamente.',
      );
    } finally {
      busy.current = false;
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
      onBack={() => window.history.back()}
    />
  );
}