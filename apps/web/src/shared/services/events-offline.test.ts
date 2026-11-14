
import { IDBFactory } from 'fake-indexeddb';
import type { EventItem } from '@umsspira/shared-types';

import {
  saveEventCatalogOffline,
  readEventCatalogOffline,
} from './events-offline-cache';

import { getEventCatalog } from './events-service';
import { apiClient } from './api-client';

Object.defineProperty(globalThis, 'structuredClone', {
  configurable: true,
  writable: true,
  value: <T>(value: T): T => {
    return JSON.parse(JSON.stringify(value)) as T;
  },
});

jest.mock('./api-client', () => ({
  apiClient: jest.fn(),
}));

const mockApiClient = apiClient as unknown as jest.Mock;

const eventoPrueba = {
  id: '77000000-0000-4000-8000-000000000001',
  title: 'Encuentro de titulados',
  startDate: '2026-11-20T10:00:00.000Z',
  endDate: '2026-11-20T12:00:00.000Z',
  location: 'UMSS',
} as unknown as EventItem;

function establecerConexion(online: boolean) {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    value: online,
  });
}

describe('HU04 #411 - Consultas de eventos offline', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'indexedDB', {
      configurable: true,
      value: new IDBFactory(),
    });

    establecerConexion(true);
    mockApiClient.mockReset();
  });

  test('guarda eventos públicos en IndexedDB', async () => {
    await saveEventCatalogOffline([eventoPrueba]);

    const catalogo = await readEventCatalogOffline();

    expect(catalogo).not.toBeNull();
    expect(catalogo?.events).toEqual([eventoPrueba]);
    expect(catalogo?.key).toBe('catalog');
    expect(catalogo?.updatedAt).toBeDefined();
  });

  test('devuelve null cuando no hay eventos guardados', async () => {
    const catalogo = await readEventCatalogOffline();

    expect(catalogo).toBeNull();
  });

  test('actualiza el catálogo guardado', async () => {
    await saveEventCatalogOffline([eventoPrueba]);
    await saveEventCatalogOffline([]);

    const catalogo = await readEventCatalogOffline();

    expect(catalogo?.events).toEqual([]);
  });

  test('consulta IndexedDB sin llamar a la API cuando está offline', async () => {
    await saveEventCatalogOffline([eventoPrueba]);

    establecerConexion(false);

    const eventos = await getEventCatalog();

    expect(eventos).toEqual([eventoPrueba]);
    expect(mockApiClient).not.toHaveBeenCalled();
  });

  test('muestra un error cuando está offline y no hay catálogo', async () => {
    establecerConexion(false);

    await expect(getEventCatalog()).rejects.toThrow(
      'No hay eventos guardados para consultar sin conexión.',
    );

    expect(mockApiClient).not.toHaveBeenCalled();
  });

  test('consulta la API y guarda el catálogo cuando hay conexión', async () => {
    establecerConexion(true);

    mockApiClient.mockResolvedValue({
      data: [eventoPrueba],
    });

    const eventos = await getEventCatalog();
    const catalogo = await readEventCatalogOffline();

    expect(eventos).toEqual([eventoPrueba]);
    expect(catalogo?.events).toEqual([eventoPrueba]);

    expect(mockApiClient).toHaveBeenCalledWith(
      '/api/v1/events/catalog',
    );
  });

  test('no sustituye errores de la API por datos cacheados estando online', async () => {
    await saveEventCatalogOffline([eventoPrueba]);

    establecerConexion(true);

    mockApiClient.mockRejectedValue(
      new Error('Error del servidor'),
    );

    await expect(getEventCatalog()).rejects.toThrow(
      'Error del servidor',
    );
  });
});
