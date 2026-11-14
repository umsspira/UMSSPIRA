"use client";

import { useEffect, useRef, useState } from "react";
import { authStore } from "../store";
import { clearSession } from "../services/session";
import { hardRedirect } from "../services/navigation";
import {
  SESSION_EXPIRED_EVENT,
  SESSION_EXPIRED_LOGIN_PATH,
} from "../services/session-expired";

/**
 * HU-004 CA-06: ventana de alerta cuando la sesión del administrador caduca.
 * Limpia el estado local de autenticación al aparecer y solo ofrece volver a
 * /login, para que no se pueda seguir usando el módulo con la sesión vencida.
 */
export function SessionExpiredDialog() {
  const [open, setOpen] = useState(false);
  const actionRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleExpired = () => {
      clearSession();
      authStore.reset();
      setOpen(true);
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, handleExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleExpired);
  }, []);

  useEffect(() => {
    if (open) actionRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-abyssal-blue/60 p-4">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="session-expired-title"
        aria-describedby="session-expired-description"
        className="w-full max-w-md rounded-xl border border-oatmeal bg-white p-6 shadow-xl"
      >
        <div className="rounded-[9px] border border-[#c9c1b1] bg-[#fff1ed] px-4 py-3 text-left">
          <p className="text-sm font-semibold text-[#a35139]">Sesión expirada (401)</p>
          <p className="mt-1 text-xs text-[#444]">Por seguridad, la sesión debe restablecerse para acceder a /reports.</p>
        </div>
        <span aria-hidden="true" className="mx-auto mt-6 flex h-[72px] w-[72px] items-center justify-center rounded-full border border-[#a35139] bg-[#fff1ed] text-3xl font-bold text-[#a35139]">!</span>
        <h2 id="session-expired-title" className="mt-4 text-center font-display text-[23px] font-semibold text-[#1b2632]">
          Vuelve a iniciar sesión
        </h2>
        <p id="session-expired-description" className="mt-3 text-center text-sm leading-relaxed text-[#444]">
          La sesión caducó. Se descartaron los datos locales de autenticación.
          Inicia sesión nuevamente para acceder a /reports.
        </p>
        <button
          ref={actionRef}
          type="button"
          onClick={() => hardRedirect(SESSION_EXPIRED_LOGIN_PATH)}
          className="mt-5 w-full rounded-md bg-abyssal-blue px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-burning-flame"
        >
          Iniciar sesión
        </button>
      </div>
    </div>
  );
}
