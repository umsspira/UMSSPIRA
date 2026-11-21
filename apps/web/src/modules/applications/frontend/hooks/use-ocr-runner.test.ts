import { renderHook } from '@testing-library/react';
import { useOcrRunner } from './use-ocr-runner';

jest.mock('./use-ocr-queue', () => ({
  useOcrQueue: jest.fn(() => 'Análisis automático disponible.'),
}));

describe('useOcrRunner', () => {
  it('inicia el procesamiento OCR y expone el mensaje de estado', () => {
    const { result } = renderHook(() => useOcrRunner());
    expect(result.current).toBe('Análisis automático disponible.');
  });
});
