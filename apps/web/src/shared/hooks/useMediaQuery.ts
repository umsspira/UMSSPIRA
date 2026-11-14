"use client";

import { useEffect, useState } from "react";

/**
 * Devuelve true cuando la pantalla cumple la regla indicada.
 * Ejemplo: useMediaQuery("(max-width: 768px)") -> true en celular.
 * Empieza en false y se actualiza al montar y cuando cambia el tamaño.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);

    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [query]);

  return matches;
}