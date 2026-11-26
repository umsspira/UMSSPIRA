"use client";

import { useEffect, useState } from "react";
import { authStore } from "@/modules/auth/frontend/store";
import { NAVBAR_OFFLINE_USER_KEY } from "@/shared/components/navbar/offline-user";

export type KnownRole = "administrador" | "titulado" | "empresa" | null;

/** Rol de la sesión; sin conexión (recarga sin sesión en memoria) se usa el último usuario recordado en este equipo. */
export function readKnownRole(): KnownRole {
  const fromStore = authStore.getState().role;
  if (fromStore) return fromStore as KnownRole;
  try {
    const raw = window.localStorage.getItem(NAVBAR_OFFLINE_USER_KEY);
    const role = raw ? (JSON.parse(raw) as { role?: string }).role : null;
    return role === "administrador" || role === "titulado" || role === "empresa" ? role : null;
  } catch {
    return null;
  }
}

export function useKnownRole(): KnownRole {
  const [role, setRole] = useState<KnownRole>(null);
  useEffect(() => {
    setRole(readKnownRole());
    return authStore.subscribe(() => setRole(readKnownRole()));
  }, []);
  return role;
}
