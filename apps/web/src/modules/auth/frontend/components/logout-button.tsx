"use client";

import { authStore } from "../store";
import { clearSession } from "../services";
import { hardRedirect } from "../services/navigation";
import { useState } from 'react';
import { revokeCurrentSession } from '@/shared/services/auth-session';
import { clearAllSurveyDrafts } from '@/modules/surveys/frontend/hooks/use-survey-draft';
import {
  clearPrivateOfflineData,
  markPendingLogout,
} from '@/features/event-passes/offline/offline-session';

function isOffline(error: unknown): boolean {
  return (typeof navigator !== 'undefined' && !navigator.onLine) || error instanceof TypeError;
}

export function LogoutButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogout() {
    if (pending) return;

    setPending(true);
    setError(null);

    // HU07 CA-02: los datos privados se borran primero, con o sin conexión.
    await clearPrivateOfflineData();

    try {
      await revokeCurrentSession();
    } catch (revokeError) {
      if (!isOffline(revokeError)) {
        setError('No se pudo cerrar la sesión. Inténtalo nuevamente.');
        setPending(false);
        return;
      }
      // Sin conexión: se cierra aquí y el servidor la revoca al volver la red.
      markPendingLogout();
    }

    clearAllSurveyDrafts();
    clearSession();
    authStore.reset();
    hardRedirect("/login");
  }

  return (
    <>
      <button
        type="button"
        onClick={handleLogout}
        disabled={pending}
        className="text-sm font-medium text-white/90 hover:text-white"
      >
        Cerrar sesión
      </button>
      {error && <p role="alert">{error}</p>}
    </>
  );
}