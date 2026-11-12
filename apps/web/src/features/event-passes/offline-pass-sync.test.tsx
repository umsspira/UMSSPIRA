import { deserialize, serialize } from 'node:v8';
import 'fake-indexeddb/auto';
import { act, render, screen, waitFor } from '@testing-library/react';
import type { EventPassDto } from '@umsspira/shared-types';

import EventPassDetailPage from './event-pass-detail-page';
import { getMyEventPass } from './event-passes-service';
import { getOfflinePass, saveOfflinePass } from './offline-pass-storage';

if (typeof globalThis.structuredClone !== 'function') {
  globalThis.structuredClone = <T,>(value: T): T =>
    deserialize(serialize(value)) as T;
}

jest.mock('./event-passes-service', () => ({
  getMyEventPass: jest.fn(),
}));

jest.mock('./offline-pass-identity', () => ({
  rememberOfflineIdentity: jest.fn().mockResolvedValue(true),
  getOfflineIdentity: jest.fn().mockResolvedValue('titular-sincronizacion'),
  clearOfflineIdentity: jest.fn(),
}));

const pase: EventPassDto = {
  id: 'pase-sincronizacion',
  registrationId: 'inscripcion-sincronizacion',
  eventId: 'evento-sincronizacion',
  userId: 'titular-sincronizacion',
  qrToken: 'token-de-prueba',
  status: 'ACTIVO',
  isValidForAccess: true,
  issuedAt: '2026-11-11T12:00:00Z',
  expiresAt: null,
  eventDetails: {
    name: 'Evento de prueba',
    userName: 'Titulado',
    dateTime: '2099-11-12T12:00:00Z',
    location: 'Auditorio',
  },
};

it('actualiza la copia local cuando el pase es invalidado al reconectar', async () => {
  Object.defineProperty(navigator, 'onLine', {
    configurable: true,
    value: true,
  });

  jest.mocked(getMyEventPass)
    .mockResolvedValueOnce(pase)
    .mockResolvedValueOnce({
      ...pase,
      status: 'INVALIDADO',
      isValidForAccess: false,
    });

  render(<EventPassDetailPage passId={pase.id} backHref="/mis-pases" />);

  expect(await screen.findByText('Evento de prueba')).toBeInTheDocument();

  await waitFor(async () => {
    const guardado = await getOfflinePass(pase.userId, pase.id);
    expect(guardado?.pass.status).toBe('ACTIVO');
  });

  act(() => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: false,
    });
    window.dispatchEvent(new Event('offline'));
  });

  act(() => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true,
    });
    window.dispatchEvent(new Event('online'));
  });

  expect(await screen.findByText('PASE INVALIDADO')).toBeInTheDocument();

  await waitFor(async () => {
    const guardado = await getOfflinePass(pase.userId, pase.id);
    expect(guardado?.pass.status).toBe('INVALIDADO');
    expect(guardado?.pass.isValidForAccess).toBe(false);
  });
});


it('abre un pase guardado sin consultar la API', async () => {
  const guardado = { ...pase, id: 'pase-sin-red' };
  await saveOfflinePass(guardado.userId, guardado);

  jest.mocked(getMyEventPass).mockClear();

  Object.defineProperty(navigator, 'onLine', {
    configurable: true,
    value: false,
  });

  try {
    render(<EventPassDetailPage passId={guardado.id} backHref="/mis-pases" />);

    expect(await screen.findByText('Evento de prueba')).toBeInTheDocument();
    expect(screen.getByText('Modo sin conexión')).toBeInTheDocument();
    expect(screen.getByText('SIN CONEXIÓN')).toBeInTheDocument();
    expect(getMyEventPass).not.toHaveBeenCalled();
  } finally {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true,
    });
  }
});
