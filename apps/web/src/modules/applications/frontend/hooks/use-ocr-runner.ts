'use client';

import { useOcrQueue } from './use-ocr-queue';

/**
 * Inicia automáticamente el procesamiento OCR en segundo plano al entrar
 * a la bandeja administrativa (CA-13.1, CA-14.1).
 */
export function useOcrRunner(): string {
  return useOcrQueue();
}

export { useOcrQueue };
