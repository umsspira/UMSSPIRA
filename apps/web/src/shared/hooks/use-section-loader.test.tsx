import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';

import { SectionUnavailable } from '@/shared/components/section-boundary';
import { clearSectionFailures, getSectionFailures } from '@/shared/services/section-failure-log';
import { useSectionLoader } from './use-section-loader';

function Probe({ loader }: { loader: (signal: AbortSignal) => Promise<string> }) {
  const { state, retry } = useSectionLoader('probe', loader);
  if (state.status === 'loading') return <p>Cargando</p>;
  if (state.status === 'unavailable') {
    return <SectionUnavailable title="Probe" timedOut={state.timedOut} onRetry={retry} />;
  }
  return <p>{state.data}</p>;
}

describe('useSectionLoader (HU18)', () => {
  beforeEach(() => {
    clearSectionFailures();
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('CA-01: a los 8 s corta la espera y avisa sin dejar la pantalla bloqueada', async () => {
    jest.useFakeTimers();
    render(<Probe loader={() => new Promise<string>(() => undefined)} />);
    expect(screen.getByText('Cargando')).toBeInTheDocument();

    await act(async () => {
      jest.advanceTimersByTime(8000);
    });

    expect(screen.getByRole('alert')).toHaveTextContent('Esta sección no está disponible.');
    expect(screen.getByText('Tiempo agotado')).toBeInTheDocument();
    expect(getSectionFailures()).toEqual([
      expect.objectContaining({ sectionId: 'probe', reason: 'timeout' }),
    ]);
  });

  it('CA-03: «Reintentar» consulta de nuevo y muestra la sección sin recargar', async () => {
    const loader = jest
      .fn<Promise<string>, [AbortSignal]>()
      .mockRejectedValueOnce(new Error('caído'))
      .mockResolvedValueOnce('Datos listos');
    render(<Probe loader={loader} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByText('Datos listos')).toBeInTheDocument();
    expect(loader).toHaveBeenCalledTimes(2);
    expect(getSectionFailures()).toEqual([
      expect.objectContaining({ sectionId: 'probe', reason: 'error', message: 'caído' }),
    ]);
  });
});