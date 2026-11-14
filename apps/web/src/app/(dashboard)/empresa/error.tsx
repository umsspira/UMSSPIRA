"use client";

import { EstadoError } from "./_components/estado-pantalla";

// CA-21: si una pantalla de /empresa falla, se ofrece "Reintentar" en vez de quedarse cargando.
export default function EmpresaError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <EstadoError
      mensaje="No se pudo cargar la pantalla. Revisa tu conexión e inténtalo de nuevo."
      onReintentar={reset}
    />
  );
}
