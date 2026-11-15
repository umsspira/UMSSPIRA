"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { IMAGE_QUALITY_CONFIG } from "../lib/image-quality.config";
import {
  analyzeImageFile,
  FAILED_RESULT,
  IDLE_RESULT,
} from "../lib/image-quality";
import type { ImageQualityResult } from "../lib/image-quality.types";

const ANALYZING_RESULT: ImageQualityResult = {
  status: "analyzing",
  warnings: [],
  metrics: null,
};

/**
 * Control de calidad de imagen para el respaldo. Nunca bloquea el formulario:
 * si el analisis falla o tarda demasiado, devuelve el estado "failed".
 */
export function useImageQuality() {
  const [result, setResult] = useState<ImageQualityResult>(IDLE_RESULT);
  const controllerRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setResult(IDLE_RESULT);
  }, []);

  const analyze = useCallback(async (file: File) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setResult(ANALYZING_RESULT);

    const timeoutId = setTimeout(
      () => controller.abort(),
      IMAGE_QUALITY_CONFIG.analysisTimeoutMs,
    );
    try {
      const next = await analyzeImageFile(file, { signal: controller.signal });
      // Si el usuario cambio o quito el archivo, este resultado ya no aplica.
      if (controllerRef.current !== controller) return;
      setResult(next);
    } catch {
      if (controllerRef.current !== controller) return;
      setResult(FAILED_RESULT);
    } finally {
      clearTimeout(timeoutId);
    }
  }, []);

  useEffect(() => {
    return () => controllerRef.current?.abort();
  }, []);

  return { result, analyze, reset };
}