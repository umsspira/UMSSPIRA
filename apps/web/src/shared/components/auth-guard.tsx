'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ensureAccessToken, SessionError } from '@/shared/services/auth-session';
import { probeConnection } from '@/shared/hooks/use-real-connection';
import { readKnownRole } from '@/shared/hooks/use-known-role';

/** Redirige a /login si no hay sesion vigente (HU-01 CA15/CA17, HU-02 CA8, HU-03 CA12, HU-05 CA18). */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  const [error, setError] = useState(false);
  const [offline, setOffline] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    void ensureAccessToken().then(() => { if (active) setAllowed(true); }).catch((error) => {
      if (!active) return;
      if (error instanceof SessionError && error.status === 401) router.replace('/login');
      else {
        // Con Wi‑Fi sin internet el navegador no avisa: se comprueba de verdad antes de decidir qué mostrar.
        void probeConnection().then((hayRed) => {
          if (!active) return;
          setOffline(!hayRed);
          setError(true);
        });
      }
    });
    return () => { active = false; };
  }, [router, retry]);

  if (allowed) return <>{children}</>;
  if (!error) return null;

  // Sin conexión: misma pantalla «Sin conexión a Internet» de la app, en vez de un texto suelto.
  if (offline) {
    const titulado = readKnownRole() === 'titulado';
    return (
      <div className="mx-auto w-full max-w-xl px-4 py-10" data-testid="auth-guard-sin-conexion">
        <section className="rounded-3xl bg-white p-6 text-center shadow-sm">
          <h1 className="text-2xl font-extrabold text-[#1B2632]">Sin conexión a Internet</h1>
          <p className="mt-2 text-slate-600">Esta pantalla necesita internet. Cuando vuelvas a tener red podrás abrirla.</p>
          <button
            type="button"
            onClick={() => { setError(false); setOffline(false); setRetry((value) => value + 1); }}
            className="mt-4 inline-flex min-h-[44px] items-center rounded-full bg-[#FFB162] px-5 font-semibold text-[#1B2632]"
          >
            Reintentar
          </button>
          <div className="mt-4 flex flex-col gap-2">
            {titulado && (
              <Link href="/mis-pases" data-testid="auth-guard-qr" className="rounded-xl bg-[#1B2632] px-4 py-3 font-semibold text-white">
                Mis códigos QR
              </Link>
            )}
            <Link href="/portal" className="rounded-xl bg-slate-100 px-4 py-3 font-semibold text-[#1B2632]">
              Volver al inicio
            </Link>
          </div>
        </section>
      </div>
    );
  }
  return <p role="alert">No se pudo verificar la sesión. Inténtalo nuevamente.</p>;
}
