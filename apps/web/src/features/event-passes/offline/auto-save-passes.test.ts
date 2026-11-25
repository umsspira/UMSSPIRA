import type { EventPassDto } from '@umsspira/shared-types';
import { autoSaveLoadedPasses, markPassRemovedFromDevice, unmarkPassRemoved } from './auto-save-passes';
import { getOfflineQrPasses, saveOfflineQrPass } from './offline-qr-storage';

jest.mock('./offline-qr-storage', () => ({
  getOfflineQrPasses: jest.fn(),
  saveOfflineQrPass: jest.fn(),
}));

const pass = (id: string, extra: Partial<EventPassDto> = {}): EventPassDto => ({
  id, userId: 'u1', qrToken: `tok-${id}`, status: 'ACTIVO', isValidForAccess: true,
  eventDetails: { name: 'Feria', userName: 'Ana', dateTime: '2026-12-01T10:00:00Z', location: 'UMSS' },
  ...extra,
} as EventPassDto);

describe('autoSaveLoadedPasses', () => {
  beforeEach(() => {
    window.localStorage.clear();
    (getOfflineQrPasses as jest.Mock).mockResolvedValue([]);
    (saveOfflineQrPass as jest.Mock).mockReset().mockResolvedValue({});
  });

  it('guarda los pases válidos que cargó la página', async () => {
    const ids = await autoSaveLoadedPasses('u1', [pass('a'), pass('b')]);
    expect(ids).toEqual(['a', 'b']);
    expect(saveOfflineQrPass).toHaveBeenCalledTimes(2);
  });

  it('omite los ya guardados, los inválidos y los de otro usuario', async () => {
    (getOfflineQrPasses as jest.Mock).mockResolvedValue([{ id: 'a' }]);
    const ids = await autoSaveLoadedPasses('u1', [
      pass('a'), pass('b', { status: 'VENCIDO' as never }), pass('c', { userId: 'otro' }), pass('d'),
    ]);
    expect(ids).toEqual(['d']);
  });

  it('no vuelve a guardar un QR que el usuario quitó del dispositivo (HU02 CA-07)', async () => {
    markPassRemovedFromDevice('u1', 'a');
    expect(await autoSaveLoadedPasses('u1', [pass('a')])).toEqual([]);
    unmarkPassRemoved('u1', 'a');
    expect(await autoSaveLoadedPasses('u1', [pass('a')])).toEqual(['a']);
  });
});
