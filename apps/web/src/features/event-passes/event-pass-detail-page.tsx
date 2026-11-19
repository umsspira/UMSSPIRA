'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { EventPassDto } from '@umsspira/shared-types';
import { ApiClientError } from '@/shared/services/api-client';
import { SessionError } from '@/shared/services/auth-session';
import { authStore } from '@/modules/auth/frontend/store';
import { EventsMobileBottomNav } from '@/features/events/events-mobile-bottom-nav';
import { EventPassQrCard } from './event-pass-qr-card';
import { getMyEventPass } from './event-passes-service';
import { getOfflinePass, saveOfflinePass } from './offline-pass-storage';
import {
  clearOfflineIdentity,
  getOfflineIdentity,
  rememberOfflineIdentity,
} from './offline-pass-identity';

type DetailState = 'loading' | 'ready' | 'not-found' | 'session' | 'forbidden' | 'offline-unavailable' | 'sync-error' | 'error';

export default function EventPassDetailPage({ passId, backHref }: { passId: string; backHref: string }) {
  const [pass, setPass] = useState<EventPassDto | null>(null);
  const lastPass = useRef<EventPassDto | null>(null);
  const pendingRecheck = useRef(false);
  const [passUpdated, setPassUpdated] = useState(false);
  const [state, setState] = useState<DetailState>('loading');
  const [retry, setRetry] = useState(0);
  const [storageWarning, setStorageWarning] = useState(false);
  const [passSaved, setPassSaved] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [needsSync, setNeedsSync] = useState(false);

  useEffect(() => {
    const handleOffline = () => {
      pendingRecheck.current = true;
      setPassUpdated(false);
      setIsOffline(true);
      setNeedsSync(true);
    };
    const handleOnline = () => {
      setIsOffline(false);
      setRetry((value) => value + 1);
    };

    if (!navigator.onLine) handleOffline();
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const unsubscribe = authStore.subscribe(() => {
      if (authStore.getState().status !== 'idle') return;
      controller.abort();
      try { clearOfflineIdentity(); } catch { /* Almacenamiento no disponible. */ }
      lastPass.current = null;
      setPass(null);
      setState('session');
    });

    async function load() {
      setPass(null);
      setState('loading');
      setStorageWarning(false);
      setPassSaved(false);
      try {
        if (!navigator.onLine) {
          const ownerId = await getOfflineIdentity();
          const saved = ownerId ? await getOfflinePass(ownerId, passId) : null;
          const currentOwner = await getOfflineIdentity();

          if (controller.signal.aborted) return;

          if (!ownerId || ownerId !== currentOwner || !saved) {
            setState('offline-unavailable');
            return;
          }

          lastPass.current = saved.pass;
          setPass(saved.pass);
          setPassSaved(true);
          setNeedsSync(true);
          setState('ready');
          return;
        }

        const result = await getMyEventPass(passId, controller.signal);
        if (controller.signal.aborted) return;
        lastPass.current = result;
        setPass(result);
        setPassUpdated(
          pendingRecheck.current &&
          result?.status === 'ACTIVO' &&
          result.isValidForAccess,
        );
        pendingRecheck.current = false;
        setNeedsSync(false);
        setState(result ? 'ready' : 'not-found');

        if (result) {
          try {
            const verified = await rememberOfflineIdentity(
              result.userId,
              controller.signal,
            );
            if (controller.signal.aborted) return;
            if (!verified) throw new Error('No se pudo preparar la identidad local.');

            const active = result.status === 'ACTIVO' && result.isValidForAccess;
            const previous = active
              ? null
              : await getOfflinePass(result.userId, result.id);

            if (active || previous) {
              await saveOfflinePass(result.userId, result);
              if (!controller.signal.aborted) setPassSaved(true);
            }
          } catch {
            if (!controller.signal.aborted) setStorageWarning(true);
          }
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        const status = error instanceof ApiClientError || error instanceof SessionError
          ? error.status : undefined;
        setPass(null);

        if (status === 401 || status === 403) {
          try { clearOfflineIdentity(); } catch { /* Almacenamiento no disponible. */ }
          lastPass.current = null;
          setState(status === 401 ? 'session' : 'forbidden');
        } else if (lastPass.current?.id === passId) {
          setNeedsSync(true);
          setState('sync-error');
        } else {
          setState(!navigator.onLine ? 'offline-unavailable' : 'error');
        }
      }
    }

    void load();
    return () => {
      controller.abort();
      unsubscribe();
    };
  }, [passId, retry]);

  return (
    <main className="qr-passes-page hu12-pass-detail">
      <div className="qr-passes-container">
        <header className="qr-passes-heading hu12-detail-heading">
          <h1>{state === 'sync-error' ? 'No se pudo actualizar tu pase' : state === 'offline-unavailable' ? 'Mis pases QR' : 'Tu pase de evento'}</h1>
          <p>
            {state === 'sync-error'
              ? 'Tu pase guardado sigue disponible, pero es necesario verificar su estado.'
              : state === 'offline-unavailable'
                ? 'No hay una copia de tu pase guardada en este dispositivo.'
                : state === 'ready' && pass && !pass.isValidForAccess
                  ? 'Los pases cancelados o vencidos nunca se presentan como válidos.'
                  : 'Credencial digital generada automáticamente para una inscripción confirmada.'}
          </p>
        </header>
        {state !== 'ready' && state !== 'sync-error' && state !== 'offline-unavailable' && (
          <Link href={backHref} className="qr-passes-close">← Volver a mis pases</Link>
        )}
        {state === 'loading' && <section role="status" className="qr-passes-empty"><h1>Cargando pase QR…</h1></section>}
        {state === 'ready' && pass && (
          <>
            <EventPassQrCard
              pass={pass}
              savedOffline={passSaved}
              updated={passUpdated}
              offline={isOffline || needsSync}
              backHref={backHref}
            />
            {passUpdated && !isOffline && !needsSync && (
              <section className="hu12-offline-notice" role="status">
                <strong>Pase actualizado</strong>
                <p>Se comprobó su estado y continúa vigente. Puedes utilizar este pase para ingresar.</p>
              </section>
            )}
            {(isOffline || needsSync) && (
              <section className="hu12-offline-notice" role="status">
                <strong>{isOffline ? 'Modo sin conexión' : 'Sincronización pendiente'}</strong>
                <p>Estás viendo la última información consultada. Su vigencia no puede comprobarse ahora.</p>
              </section>
            )}
          </>
        )}
        {state === 'ready' && storageWarning && (
          <p role="alert" className="event-feedback">
            No se pudo guardar el pase para consultarlo sin conexión.
            Puedes seguir consultándolo mientras tengas Internet.
          </p>
        )}
        {state === 'not-found' && <section role="alert" className="qr-passes-empty"><h1>Pase no disponible</h1><p>Este pase no existe o no pertenece a tu cuenta.</p></section>}
        {state === 'session' && <section role="alert" className="qr-passes-empty"><h1>Sesión expirada</h1><p>Inicia sesión para ver el pase.</p><Link href="/login" className="qr-passes-button">Iniciar sesión</Link></section>}
        {state === 'forbidden' && <section role="alert" className="qr-passes-empty"><h1>Acceso denegado</h1><p>No tienes permiso para consultar este pase.</p></section>}
        {state === 'sync-error' && (
          <section role="alert" className="hu12-state-card hu12-state-sync">
            <span className="hu12-state-badge">SINCRONIZACIÓN PENDIENTE</span>
            <h2>No pudimos comprobar el estado del pase</h2>
            <p>
              Revisa tu conexión a Internet y vuelve a intentarlo.
              La información guardada puede estar desactualizada.
            </p>
            <p>Si no tienes conexión, puedes consultar la última copia disponible del pase.</p>
            <div className="hu12-state-actions">
              <Link href={backHref} className="hu12-state-secondary">Volver a mis pases</Link>
              <button
                type="button"
                className="hu12-state-primary"
                onClick={() => setRetry((value) => value + 1)}
              >
                Reintentar
              </button>
            </div>
          </section>
        )}
        {state === 'offline-unavailable' && (
          <section role="alert" className="hu12-state-card hu12-state-unsaved">
            <span className="hu12-state-badge">SIN CONEXIÓN</span>
            <h2>Pase no guardado</h2>
            <p>
              Ahora mismo no podemos abrir el código QR.
              Conéctate a Internet y abre tu pase una vez para guardarlo en este dispositivo.
            </p>
            <p>Si no pudimos verificar tu cuenta, inicia sesión nuevamente cuando tengas conexión.</p>
            <div className="hu12-state-actions">
              <Link href={backHref} className="hu12-state-primary">Volver a mis pases</Link>
            </div>
          </section>
        )}
        {state === 'error' && <section role="alert" className="qr-passes-empty"><h1>No pudimos cargar el pase</h1><p>Inténtalo nuevamente.</p><button type="button" className="qr-passes-button" onClick={() => setRetry((value) => value + 1)}>Reintentar</button></section>}
      </div>
      <EventsMobileBottomNav />
    </main>
  );
}
