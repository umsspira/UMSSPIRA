"use client";

import { useEffect, useState } from "react";

/** Cada cuánto se comprueba de verdad si hay internet mientras el navegador dice que hay red. */
export const CONNECTION_PROBE_INTERVAL_MS = 15000;
const PROBE_TIMEOUT_MS = 4000;
/** /sw.js no pasa por la caché del Service Worker: si responde, hay internet de verdad. */
const PROBE_URL = "/sw.js";

/**
 * navigator.onLine solo dice si el equipo está conectado a una red (Wi‑Fi, datos), no si esa red llega a internet.
 * Esta comprobación hace una petición mínima: cualquier respuesta del servidor cuenta como «hay internet»;
 * un fallo o tiempo agotado cuenta como «sin conexión».
 */
export async function probeConnection(): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return false;
  if (typeof fetch !== "function" || typeof AbortController === "undefined") return true;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    await fetch(PROBE_URL, { method: "HEAD", cache: "no-store", signal: controller.signal });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/** Estado real de conexión: se actualiza con los eventos del navegador y con una comprobación periódica. */
export function useRealConnection(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    let active = true;
    const check = () => {
      void probeConnection().then((value) => {
        if (active) setOnline(value);
      });
    };
    const onOffline = () => setOnline(false);
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };

    // Primera lectura inmediata con lo que sabe el navegador; luego se confirma con la petición.
    setOnline(navigator.onLine);
    check();
    const interval = window.setInterval(check, CONNECTION_PROBE_INTERVAL_MS);
    window.addEventListener("online", check);
    window.addEventListener("offline", onOffline);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("online", check);
      window.removeEventListener("offline", onOffline);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return online;
}
