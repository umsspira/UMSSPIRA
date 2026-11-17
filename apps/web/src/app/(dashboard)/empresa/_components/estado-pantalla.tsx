"use client";

import { AlertTriangle, Inbox, Loader2 } from "lucide-react";

/**
 * Estados de pantalla reutilizables para la Épica 4 (HU-03, móvil 390 px).
 * - Cargando  -> CA-08: indicador de carga, nunca una pantalla en blanco.
 * - EstadoVacio -> CA-20: mensaje legible cuando no hay datos.
 * - EstadoError -> CA-21: mensaje de error con botón "Reintentar".
 */

export function Cargando({ texto = "Cargando..." }: { texto?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[40vh] w-full flex-col items-center justify-center gap-3 p-8 text-center text-[#1B2632]"
    >
      <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
      <p className="font-medium break-words">{texto}</p>
    </div>
  );
}

export function EstadoVacio({ mensaje }: { mensaje: string }) {
  return (
    <div className="flex w-full flex-col items-center gap-3 p-8 text-center text-gray-500">
      <Inbox className="h-8 w-8 text-gray-400" aria-hidden="true" />
      <p className="max-w-full break-words font-medium">{mensaje}</p>
    </div>
  );
}

export function EstadoError({
  mensaje,
  onReintentar,
}: {
  mensaje: string;
  onReintentar: () => void;
}) {
  return (
    <div
      role="alert"
      className="mx-auto flex w-full max-w-xl flex-col items-center gap-4 p-8 text-center"
    >
      <AlertTriangle className="h-8 w-8 text-[#A35139]" aria-hidden="true" />
      <p className="max-w-full break-words font-semibold text-[#A35139]">{mensaje}</p>
      <button
        type="button"
        onClick={onReintentar}
        className="min-h-11 w-full rounded-lg bg-[#1B2632] px-5 py-2 text-sm font-bold text-white hover:bg-opacity-90 sm:w-auto"
      >
        Reintentar
      </button>
    </div>
  );
}
