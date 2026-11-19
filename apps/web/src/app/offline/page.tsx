'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { NAVBAR_OFFLINE_USER_KEY } from '@/shared/components/navbar/offline-user';
import { directHref, navigationFor } from '@/shared/components/navbar/navigation';
import type { NavbarRole } from '@/shared/components/navbar/types';
import { isOfflineSessionValid } from '@/features/event-passes/offline/offline-session';

/**
 * HU14 · Página de respaldo. Es la misma pantalla que sirve public/sw.js cuando se pide una ruta que no está
 * guardada: mantiene el logo, la barra y los colores de la aplicación (CA-07).
 * Se recarga con window.location (no con el router de Next) para que el Service Worker intervenga.
 */
const NOTICE = 'Todavía no hay conexión';
const roles: NavbarRole[] = ['titulado', 'empresa', 'administrador'];

interface OfflineUser { name: string; initials: string; role: NavbarRole }

function readOfflineUser(): OfflineUser | null {
  try {
    if (!isOfflineSessionValid()) return null;
    const raw = JSON.parse(window.localStorage.getItem(NAVBAR_OFFLINE_USER_KEY) ?? 'null') as Partial<OfflineUser> | null;
    if (raw && typeof raw.name === 'string' && roles.includes(raw.role as NavbarRole)) {
      return { name: raw.name, initials: String(raw.initials ?? raw.name.slice(0, 2)).slice(0, 2).toUpperCase(), role: raw.role as NavbarRole };
    }
    return { name: 'Mi cuenta', initials: 'MC', role: 'titulado' };
  } catch {
    return null;
  }
}

export default function OfflinePage() {
  const [user, setUser] = useState<OfflineUser | null>(null);
  const [path, setPath] = useState('');
  const [menu, setMenu] = useState(false);
  const [notice, setNotice] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => { setUser(readOfflineUser()); setPath(window.location.pathname); }, []);

  // Al volver la red se abre sola la ruta pedida (una sola vez, sin ciclos de recarga).
  useEffect(() => {
    const reopen = () => window.location.replace(window.location.href);
    window.addEventListener('online', reopen, { once: true });
    return () => window.removeEventListener('online', reopen);
  }, []);

  // Mismas opciones y mismo orden que la barra: Inicio + secciones del rol (navigation.ts).
  const role = user?.role ?? null;
  const navigation = [
    { id: 'home', label: 'Inicio', href: user ? '/portal' : '/portal/institucional' },
    ...navigationFor(role).map(section => ({ id: section.id, label: section.label, href: directHref(section.id, role) ?? section.items[0]?.href ?? '/portal' })),
  ];
  const current = navigation.find(item => item.id !== 'home' && (path === item.href || path.startsWith(`${item.href}/`)))?.id ?? 'home';
  const privateRoute = path.startsWith('/portal') && !path.startsWith('/portal/institucional');
  const askLogin = !user && privateRoute;

  // HU14 CA-02/CA-03: solo se recarga la ruta pedida si de verdad volvió la red; si no, se avisa y se permanece aquí.
  const retry = async () => {
    if (checking) return;
    setChecking(true);
    setNotice(false);
    let online = navigator.onLine;
    if (online) {
      try { await fetch('/sw.js', { method: 'HEAD', cache: 'no-store' }); } catch { online = false; }
    }
    if (online) { window.location.replace(window.location.href); return; }
    setNotice(true);
    setChecking(false);
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#EEE9DF] text-[#1B2632]">
      <header className="sticky top-0 z-10 flex h-16 items-center gap-2 border-b border-[#2C3B4D] bg-[#1B2632] px-3.5 text-[#EEE9DF] md:gap-6 md:px-6">
        <a href={navigation[0].href} aria-label="UMSSPIRA: ir al inicio" className="flex min-h-11 shrink-0 items-center">
          <Image src="/assets/events/umsspira-logo-desktop.png" alt="UMSSPIRA" width={150} height={40} priority className="h-10 w-auto max-w-[112px] object-contain md:max-w-[150px]" />
        </a>
        <nav id="offline-menu" aria-label="Navegación principal" className={`${menu ? 'absolute left-0 right-0 top-16 flex flex-col bg-[#1B2632] px-3.5 pb-3.5' : 'hidden'} md:static md:flex md:flex-row md:items-stretch md:gap-6 md:self-stretch md:bg-transparent md:p-0`}>
          {navigation.map(item => {
            const on = item.id === current;
            return (
              <a
                key={item.id}
                href={item.href}
                data-testid={item.id === 'home' ? 'offline-link-home' : undefined}
                aria-current={on ? 'page' : undefined}
                className={`relative flex min-h-12 items-center border-b border-[#2C3B4D] px-1 text-sm md:min-h-11 md:border-0 md:px-0 ${on ? 'font-semibold text-[#FFB162] md:after:absolute md:after:inset-x-0 md:after:bottom-2 md:after:h-[3px] md:after:rounded md:after:bg-[#FFB162]' : 'hover:text-[#FFB162]'}`}
              >
                {item.label}
              </a>
            );
          })}
        </nav>
        <div className="ml-auto flex min-w-0 items-center gap-3 md:ml-auto">
          {user ? (
            <>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#FFB162] bg-[#2C3B4D] text-xs font-bold">{user.initials}</span>
              <span className="hidden max-w-[140px] truncate text-sm md:inline">{user.name}</span>
            </>
          ) : (
            <a href="/login" className="flex min-h-11 items-center rounded-[10px] bg-[#FFB162] px-4 text-xs font-semibold text-[#1B2632]">Iniciar sesión</a>
          )}
        </div>
        <button type="button" aria-label="Abrir navegación principal" aria-expanded={menu} aria-controls="offline-menu" onClick={() => setMenu(value => !value)} className="flex h-11 w-11 items-center justify-center text-2xl md:hidden">☰</button>
      </header>

      <main className="mx-auto w-full max-w-3xl px-3.5 pb-8 pt-6 md:px-5 md:pt-11">
        <section className="rounded-[1.25rem] bg-white px-7 pb-7 pt-9 text-center shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
          <div aria-hidden="true" className="mx-auto mb-3.5 flex h-[62px] w-[62px] items-center justify-center rounded-full bg-[#FFF1DC] text-3xl">📡</div>
          <h1 data-testid="offline-title" className="mb-2.5 text-[1.65rem] font-bold leading-tight">
            {askLogin ? 'Inicia sesión para continuar' : 'Sin conexión a Internet'}
          </h1>
          <p className="mx-auto mb-5 max-w-[30rem] text-[0.95rem] leading-relaxed text-[#5E6974]">
            {askLogin
              ? 'Esta pantalla es privada y no hay una sesión activa en este dispositivo. Inicia sesión cuando tengas conexión.'
              : 'Esta pantalla todavía no se guardó en tu dispositivo. Cuando vuelvas a tener red podrás abrirla.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {askLogin && (
              <a href="/login" data-testid="offline-login" className="flex min-h-11 items-center rounded-full bg-[#FFB162] px-6 text-[0.95rem] font-bold">Iniciar sesión</a>
            )}
            <button type="button" data-testid="offline-retry" onClick={retry} disabled={checking} className="flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#FFB162] px-6 text-[0.95rem] font-bold transition-colors hover:bg-[#FFA044] disabled:cursor-wait disabled:opacity-70">
              <span aria-hidden="true">⟳</span> Reintentar
            </button>
          </div>
          {notice && (
            <p role="status" aria-live="polite" className="mx-auto mt-3.5 max-w-[30rem] rounded-[10px] bg-[#FFF1DC] px-3.5 py-2.5 text-sm font-semibold text-[#7A4A12]">{NOTICE}</p>
          )}
          <div className="mt-6 rounded-xl bg-[#EDF2FA] p-4 text-left">
            <h2 className="mb-3 text-sm font-semibold">Disponible sin conexión</h2>
            <div className="grid gap-3 md:grid-cols-3">
              {[
                { href: '/events/catalog/passes', testid: 'offline-link-passes', label: '▦ Mis códigos QR' },
                { href: '/portal/eventos', testid: 'offline-link-events', label: '📅 Eventos visitados' },
                { href: '/portal/configuracion', testid: 'offline-link-settings', label: '⚙ Configuración' },
              ].map(tile => (
                <a key={tile.href} href={tile.href} data-testid={tile.testid} className="flex min-h-11 items-center gap-2 rounded-lg bg-white px-3.5 py-2.5 text-sm hover:bg-[#FFF1DC]">{tile.label}</a>
              ))}
            </div>
          </div>
        </section>
        <p className="mt-5 text-center text-xs text-[#2C384D]/50">UMSSPIRA · Tu comunidad, siempre conectada</p>
      </main>
    </div>
  );
}

