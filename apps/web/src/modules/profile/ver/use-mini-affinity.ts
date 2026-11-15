'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { fetchMiniAffinity } from '@/modules/profile/data/mini-affinity-source';

// Estados de la tarjeta «Mi afinidad» (HU-17)
export type MiniAffinityState =
  | { status: 'loading' } // CA-03: el cálculo todavía no llega
  | { status: 'ready'; values: number[] } // CA-01: valores del último cálculo, en el orden de AFFINITY_AREAS
  | { status: 'empty' } // CA-04: el perfil no tiene datos suficientes
  | { status: 'error' }; // CA-05: falló el cálculo

// Pide los valores a la fuente de datos de la tarjeta y los convierte en un estado
export function useMiniAffinity() {
  const [state, setState] = useState<MiniAffinityState>({ status: 'loading' });
  // Solo vale la respuesta de la última petición (por si se toca «Reintentar» varias veces)
  const requestIdRef = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setState({ status: 'loading' });
    try {
      const result = await fetchMiniAffinity();
      if (requestId !== requestIdRef.current) return;
      // Sin datos suficientes: la fuente dice "empty" o todas las áreas están en 0
      const hasNoData = result.status === 'empty' || result.values.every((value) => !value);
      setState(hasNoData ? { status: 'empty' } : { status: 'ready', values: result.values });
    } catch {
      if (requestId !== requestIdRef.current) return;
      setState({ status: 'error' });
    }
  }, []);

  useEffect(() => {
    void load();
    return () => {
      // Al salir del resumen se ignora la respuesta que llegue tarde
      requestIdRef.current += 1;
    };
  }, [load]);

  return { state, retry: load };
}