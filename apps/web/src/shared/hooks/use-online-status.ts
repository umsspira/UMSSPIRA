"use client";

import { useRealConnection } from "./use-real-connection";

/**
 * Estado de conexión para toda la app (chat, eventos, etc.).
 * Usa la comprobación real: con Wi‑Fi sin internet o con la red cortada de verdad también da `false`,
 * no solo cuando el navegador marca «offline» (modo sin conexión de DevTools).
 */
export function useOnlineStatus() {
  return useRealConnection();
}
