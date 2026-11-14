'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { EventPassDto } from '@umsspira/shared-types';
import { ApiClientError } from '@/shared/services/api-client';
import { SessionError } from '@/shared/services/auth-session';
import { authStore } from '@/modules/auth/frontend/store';
import { EventsMobileBottomNav } from '@/features/events/events-mobile-bottom-nav';
import { EventPassQrCard } from './event-pass-qr-card';
import { getMyEventPass } from './event-passes-service';

type DetailState = 'loading' | 'ready' | 'not-found' | 'session' | 'forbidden' | 'error';

export default function EventPassDetailPage({ passId, backHref }: { passId: string; backHref: string }) {
  const [pass, setPass] = useState<EventPassDto | null>(null);
  const [state, setState] = useState<DetailState>('loading');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const unsubscribe = authStore.subscribe(() => {
      if (authStore.getState().status !== 'idle') return;
      controller.abort();
      setPass(null);
      setState('session');
    });

    async function load() {
      setPass(null);
      setState('loading');
      try {
        const result = await getMyEventPass(passId, controller.signal);
        if (controller.signal.aborted) return;
        setPass(result);
        setState(result ? 'ready' : 'not-found');
      } catch (error) {
        if (controller.signal.aborted) return;
        const status = error instanceof ApiClientError || error instanceof SessionError
          ? error.status : undefined;
        setPass(null);
        setState(status === 401 ? 'session' : status === 403 ? 'forbidden' : 'error');
      }
    }

    void load();
    return () => {
      controller.abort();
      unsubscribe();
    };
  }, [passId, retry]);

  return (
    <main className="qr-passes-page">
      <div className="qr-passes-container">
        <Link href={backHref} className="qr-passes-close">← Volver a mis pases</Link>
        {state === 'loading' && <section role="status" className="qr-passes-empty"><h1>Cargando pase QR…</h1></section>}
        {state === 'ready' && pass && <EventPassQrCard pass={pass} />}
        {state === 'not-found' && <section role="alert" className="qr-passes-empty"><h1>Pase no disponible</h1><p>Este pase no existe o no pertenece a tu cuenta.</p></section>}
        {state === 'session' && <section role="alert" className="qr-passes-empty"><h1>Sesión expirada</h1><p>Inicia sesión para ver el pase.</p><Link href="/login" className="qr-passes-button">Iniciar sesión</Link></section>}
        {state === 'forbidden' && <section role="alert" className="qr-passes-empty"><h1>Acceso denegado</h1><p>No tienes permiso para consultar este pase.</p></section>}
        {state === 'error' && <section role="alert" className="qr-passes-empty"><h1>No pudimos cargar el pase</h1><p>Inténtalo nuevamente.</p><button type="button" className="qr-passes-button" onClick={() => setRetry((value) => value + 1)}>Reintentar</button></section>}
      </div>
      <EventsMobileBottomNav />
    </main>
  );
}
