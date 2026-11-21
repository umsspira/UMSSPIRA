import { getMyEventPasses } from '@/features/event-passes/event-passes-service';
import { getOfflineQrPasses } from '@/features/event-passes/offline/offline-qr-storage';
import { getOfflineSessionUserId } from '@/features/event-passes/offline/offline-session';
import { ApiClientError } from '@/shared/services/api-client';
import { getUnreadSummary } from '@/shared/services/chat-conversation.service';
import { getEventCatalog } from '@/shared/services/events-service';

import { homeSectionsAdapter } from './home-sections-adapter';

jest.mock('@/features/event-passes/event-passes-service', () => ({ getMyEventPasses: jest.fn() }));
jest.mock('@/features/event-passes/offline/offline-qr-storage', () => ({ getOfflineQrPasses: jest.fn() }));
jest.mock('@/features/event-passes/offline/offline-session', () => ({ getOfflineSessionUserId: jest.fn() }));
jest.mock('@/shared/services/chat-conversation.service', () => ({ getUnreadSummary: jest.fn() }));
jest.mock('@/shared/services/events-service', () => ({ getEventCatalog: jest.fn() }));

const passes = getMyEventPasses as jest.Mock;
const saved = getOfflineQrPasses as jest.Mock;
const userId = getOfflineSessionUserId as jest.Mock;
const unread = getUnreadSummary as jest.Mock;
const catalog = getEventCatalog as jest.Mock;

const signal = new AbortController().signal;

describe('homeSectionsAdapter (HU18 CA-04)', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    userId.mockResolvedValue('user-1');
  });

  it('resume los pases desde el servidor', async () => {
    passes.mockResolvedValue([{ id: 'a' }, { id: 'b' }]);
    await expect(homeSectionsAdapter.loadQrSummary(signal)).resolves.toEqual({ total: 2, source: 'server' });
  });

  it('si falla la red usa los pases guardados en el dispositivo', async () => {
    passes.mockRejectedValue(new TypeError('Failed to fetch'));
    saved.mockResolvedValue([{ id: 'a' }]);
    await expect(homeSectionsAdapter.loadQrSummary(signal)).resolves.toEqual({ total: 1, source: 'offline' });
  });

  it('si el servidor responde con error no usa los pases guardados', async () => {
    passes.mockRejectedValue(new ApiClientError('Falla', 500));
    await expect(homeSectionsAdapter.loadQrSummary(signal)).rejects.toBeInstanceOf(ApiClientError);
    expect(saved).not.toHaveBeenCalled();
  });

  it('entrega el total de mensajes sin leer', async () => {
    unread.mockResolvedValue({ total: 3, conversations: [] });
    await expect(homeSectionsAdapter.loadUnreadMessages(signal)).resolves.toEqual({ unread: 3 });
  });

  it('entrega los eventos del catálogo', async () => {
    catalog.mockResolvedValue([{ id: 'e1' }]);
    await expect(homeSectionsAdapter.loadEvents(signal)).resolves.toEqual([{ id: 'e1' }]);
  });
});