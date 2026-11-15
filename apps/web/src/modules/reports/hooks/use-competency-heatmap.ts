'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  isSessionExpiredError,
  notifySessionExpired,
} from '@/modules/auth/frontend/services/session-expired';
import type {
  HeatmapData,
  HeatmapLoader,
} from '../components/competency-heatmap/heatmap.types';

/** HU-EP09-06 CA-07: cargar al montar y refrescar sin datos cacheados. */
export function useCompetencyHeatmap(load: HeatmapLoader) {
  const loadRef = useRef(load);
  const currentRequest = useRef<AbortController | null>(null);
  const mounted = useRef(false);
  const [data, setData] = useState<HeatmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { loadRef.current = load; }, [load]);

  const refresh = useCallback(async (): Promise<void> => {
    currentRequest.current?.abort();
    const controller = new AbortController();
    currentRequest.current = controller;
    setLoading(true);
    setError(null);

    try {
      const latest = await loadRef.current(controller.signal);
      if (mounted.current && !controller.signal.aborted) setData(latest);
    } catch (reason) {
      if (controller.signal.aborted || !mounted.current) return;
      if (isSessionExpiredError(reason)) {
        notifySessionExpired();
        return;
      }
      setError('No se pudo actualizar el mapa de calor. Intente nuevamente.');
    } finally {
      if (mounted.current && !controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void refresh();
    return () => {
      mounted.current = false;
      currentRequest.current?.abort();
    };
  }, [refresh]);

  return { data, loading, error, refresh };
}
