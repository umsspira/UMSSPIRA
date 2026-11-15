
import { IDBFactory } from 'fake-indexeddb';
if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = (value) =>
    JSON.parse(JSON.stringify(value));
}
import {
  deleteOfflineQrPass,
  getOfflineQrPass,
  getOfflineQrPasses,
  saveOfflineQrPass,
  type OfflineQrPassInput,
} from './offline-qr-storage';

const createPass = (
  overrides: Partial<OfflineQrPassInput> = {}
): OfflineQrPassInput => ({
  id: 'pass-001',
  userId: 'user-001',
  qrToken: 'qr-token-001',
  eventDetails: {
    name: 'Congreso UMSS',
    userName: 'Usuario de prueba',
    dateTime: '2026-11-15T10:00:00',
    location: 'Auditorio UMSS',
  },
  ...overrides,
});

describe('offline-qr-storage', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'indexedDB', {
      value: new IDBFactory(),
      configurable: true,
    });

    jest.resetModules();
  });

  it('guarda un pase QR localmente', async () => {
    const { saveOfflineQrPass: save } = await import('./offline-qr-storage');

    const savedPass = await save(createPass());

    expect(savedPass.id).toBe('pass-001');
    expect(savedPass.userId).toBe('user-001');
    expect(savedPass.qrToken).toBe('qr-token-001');
    expect(savedPass.savedAt).toBeTruthy();
  });

  it('consulta solamente los pases del usuario indicado', async () => {
    const { saveOfflineQrPass: save, getOfflineQrPasses: getAll } =
      await import('./offline-qr-storage');

    await save(createPass());

    await save(
      createPass({
        id: 'pass-002',
        userId: 'user-002',
      })
    );

    const passes = await getAll('user-001');

    expect(passes).toHaveLength(1);
    expect(passes[0].id).toBe('pass-001');
  });

  it('consulta un pase específico de su propietario', async () => {
    const { saveOfflineQrPass: save, getOfflineQrPass: getOne } =
      await import('./offline-qr-storage');

    await save(createPass());

    const pass = await getOne('pass-001', 'user-001');

    expect(pass).not.toBeNull();
    expect(pass?.qrToken).toBe('qr-token-001');
  });

  it('no devuelve un pase cuando pertenece a otro usuario', async () => {
    const { saveOfflineQrPass: save, getOfflineQrPass: getOne } =
      await import('./offline-qr-storage');

    await save(createPass());

    const pass = await getOne('pass-001', 'user-002');

    expect(pass).toBeNull();
  });

  it('elimina un pase del dispositivo', async () => {
    const {
      saveOfflineQrPass: save,
      getOfflineQrPass: getOne,
      deleteOfflineQrPass: remove,
    } = await import('./offline-qr-storage');

    await save(createPass());

    const deleted = await remove('pass-001', 'user-001');
    const pass = await getOne('pass-001', 'user-001');

    expect(deleted).toBe(true);
    expect(pass).toBeNull();
  });

  it('no permite eliminar el pase de otro usuario', async () => {
    const { saveOfflineQrPass: save, deleteOfflineQrPass: remove } =
      await import('./offline-qr-storage');

    await save(createPass());

    const deleted = await remove('pass-001', 'user-002');

    expect(deleted).toBe(false);
  });

  it('rechaza guardar un pase sin identificador de usuario', async () => {
    const { saveOfflineQrPass: save } = await import('./offline-qr-storage');

    await expect(
      save(createPass({ userId: ' ' }))
    ).rejects.toThrow('Los datos del pase QR están incompletos.');
  });
it('elimina todos los pases QR almacenados localmente', async () => {
  const {
    saveOfflineQrPass: save,
    getOfflineQrPasses: getAll,
    clearOfflineQrPasses: clearAll,
  } = await import('./offline-qr-storage');

  await save(createPass());

  await save(
    createPass({
      id: 'pass-002',
      userId: 'user-002',
    })
  );

  await clearAll();

  expect(await getAll('user-001')).toHaveLength(0);
  expect(await getAll('user-002')).toHaveLength(0);
});
});
