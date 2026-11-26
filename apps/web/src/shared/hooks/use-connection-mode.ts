"use client";

import { useEffect, useState } from "react";
import { useRealConnection } from "./use-real-connection";

export type ConnectionMode = "en-linea" | "sin-senal" | "modo-avion";

interface NetworkInformationLike {
  type?: string;
  addEventListener?: (type: string, listener: () => void) => void;
  removeEventListener?: (type: string, listener: () => void) => void;
}

function getConnection(): NetworkInformationLike | undefined {
  return (navigator as Navigator & { connection?: NetworkInformationLike }).connection;
}

/**
 * Los navegadores no avisan del «Modo avión» como tal. Sin conexión se distingue así:
 * - el sistema informa que no hay ningún tipo de red (connection.type === 'none', Chrome en Android) → «Modo avión»
 * - cualquier otro caso sin conexión → «Sin señal»
 * Con red vuelve a «En línea». Donde el navegador no ofrece esa información siempre se muestra «Sin señal».
 */
export function resolveConnectionMode(online: boolean, connectionType?: string): ConnectionMode {
  if (online) return "en-linea";
  return connectionType === "none" ? "modo-avion" : "sin-senal";
}

export function useConnectionMode(): ConnectionMode {
  const online = useRealConnection();
  const [type, setType] = useState<string | undefined>(undefined);

  useEffect(() => {
    const update = () => setType(getConnection()?.type);
    update();
    const connection = getConnection();
    connection?.addEventListener?.("change", update);
    return () => connection?.removeEventListener?.("change", update);
  }, []);

  return resolveConnectionMode(online, type);
}

export const CONNECTION_MODE_LABEL: Record<ConnectionMode, string> = {
  "en-linea": "En línea",
  "sin-senal": "Sin señal",
  "modo-avion": "Modo avión",
};
