import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';

import { HomeStatusCards } from './home-status-cards';
import type { HomeSectionsPort } from './home-sections-port';

const makePort = (overrides: Partial<HomeSectionsPort> = {}): HomeSectionsPort => ({
  loadQrSummary: async () => ({ total: 2, source: 'server' }),
  loadEvents: async () => [],
  loadUnreadMessages: async () => ({ unread: 3 }),
  ...overrides,
});

describe('HomeStatusCards (HU18)', () => {
  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('muestra las dos tarjetas cuando todo responde', async () => {
    render(<HomeStatusCards port={makePort()} />);

    expect(await screen.findByText('2 pases guardados')).toBeInTheDocument();
    expect(await screen.findByText('3 sin leer')).toBeInTheDocument();
  });

  it('CA-02: si falla una tarjeta, solo esa muestra el aviso y la otra sigue funcionando', async () => {
    const port = makePort({ loadQrSummary: async () => Promise.reject(new Error('caído')) });
    render(<HomeStatusCards port={port} />);

    expect(await screen.findByText('Esta sección no está disponible.')).toBeInTheDocument();
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(await screen.findByText('3 sin leer')).toBeInTheDocument();
  });

  it('CA-03: «Reintentar» recarga solo la tarjeta que falló, sin tocar la otra', async () => {
    const loadQrSummary = jest
      .fn<ReturnType<HomeSectionsPort['loadQrSummary']>, [AbortSignal]>()
      .mockRejectedValueOnce(new Error('caído'))
      .mockResolvedValueOnce({ total: 2, source: 'server' });
    const loadUnreadMessages = jest.fn(async () => ({ unread: 3 }));
    render(<HomeStatusCards port={makePort({ loadQrSummary, loadUnreadMessages })} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByText('2 pases guardados')).toBeInTheDocument();
    expect(loadQrSummary).toHaveBeenCalledTimes(2);
    expect(loadUnreadMessages).toHaveBeenCalledTimes(1);
  });

  it('CA-01: si un servicio no responde en 8 s se avisa y la otra tarjeta no se bloquea', async () => {
    jest.useFakeTimers();
    const port = makePort({ loadUnreadMessages: () => new Promise(() => undefined) });
    render(<HomeStatusCards port={port} />);

    // Deja que la tarjeta QR (que sí responde) termine antes de avanzar el reloj.
    await act(async () => {
      for (let i = 0; i < 10; i += 1) await Promise.resolve();
    });
    expect(screen.getByText('2 pases guardados')).toBeInTheDocument();

    await act(async () => {
      jest.advanceTimersByTime(8000);
    });

    expect(screen.getAllByText('Tiempo agotado')).toHaveLength(1);
    expect(screen.getByRole('alert')).toHaveTextContent('Mensajes');
    expect(screen.getByText('2 pases guardados')).toBeInTheDocument();
  });
});