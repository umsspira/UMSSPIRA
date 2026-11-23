
"use client";

import { useState } from "react";

import { clearAllSurveyDrafts } from "@/modules/surveys/frontend/hooks/use-survey-draft";
import { clearAllProfileDrafts } from "@/modules/profile/utils/drafts-storage";
import { clearPrivateOfflineData, markPendingLogout } from "@/features/event-passes/offline/offline-session";
import { revokeCurrentSession } from "@/shared/services/auth-session";

import { authStore } from "../store";
import { clearSession } from "../services";
import { hardRedirect } from "../services/navigation";

function isOffline(error: unknown): boolean {
  return (
    (typeof navigator !== "undefined" && !navigator.onLine) ||
    error instanceof TypeError
  );
}

export function LogoutButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogout() {
    if (pending) return;

    setPending(true);
    setError(null);

    // HU07 CA-02: eliminar datos privados antes de cerrar la sesión.
    await clearPrivateOfflineData();

    try {
      await revokeCurrentSession();
    } catch (revokeError) {
      if (!isOffline(revokeError)) {
        setError("No se pudo cerrar la sesión. Inténtalo nuevamente.");
        setPending(false);
        return;
      }

      // Sin conexión: impedir el acceso offline hasta revocar en el servidor.
      markPendingLogout();
    }

    clearAllSurveyDrafts();
    clearAllProfileDrafts();
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