import { deserialize, serialize } from 'node:v8';

if (typeof globalThis.structuredClone !== 'function') {
  globalThis.structuredClone = <T>(value: T): T => deserialize(serialize(value)) as T;
}

import 'fake-indexeddb/auto';
import type { EventPassDto } from '@umsspira/shared-types';
import { getOfflinePass, listOfflinePasses, saveOfflinePass } from './offline-pass-storage';

function crearPase(userId: string, id: string): EventPassDto {
  return {
    id,
    userId,
    registrationId: `inscripcion-${id}`,
    eventId: `evento-${id}`,
    qrToken: `qr-${id}`,
    status: 'ACTIVO',
    isValidForAccess: true,
    issuedAt: '2026-11-11T12:00:00Z',
    expiresAt: null,
  };
}

describe('Almacenamiento local de pases', () => {
  it('guarda y recupera un pase del titular', async () => {
    const pase = crearPase('usuario-a', 'pase-1');

    await saveOfflinePass('usuario-a', pase);
    const guardado = await getOfflinePass('usuario-a', 'pase-1');

    expect(guardado?.pass).toEqual(pase);
    expect(guardado?.savedAt).toBeTruthy();
  });

  it('no entrega el pase al consultar con otro titular', async () => {
    const pase = crearPase('usuario-a', 'pase-2');

    await saveOfflinePass('usuario-a', pase);

    await expect(getOfflinePass('usuario-b', 'pase-2')).resolves.toBeNull();
  });

  it('rechaza guardar el pase bajo una cuenta diferente', async () => {
    const pase = crearPase('usuario-a', 'pase-3');

    await expect(saveOfflinePass('usuario-b', pase)).rejects.toThrow(
      'El pase no pertenece a la cuenta actual.',
    );
  });

  it('mantiene separados los pases de distintos eventos', async () => {
    const primero = crearPase('usuario-a', 'pase-4');
    const segundo = crearPase('usuario-a', 'pase-5');

    await saveOfflinePass('usuario-a', primero);
    await saveOfflinePass('usuario-a', segundo);

    expect((await getOfflinePass('usuario-a', 'pase-4'))?.pass).toEqual(primero);
    expect((await getOfflinePass('usuario-a', 'pase-5'))?.pass).toEqual(segundo);
  });
});


it('lista únicamente los pases del titular indicado', async () => {
  const paseA = crearPase('titular-lista-a', 'pase-lista-a');
  const paseB = crearPase('titular-lista-b', 'pase-lista-b');

  await saveOfflinePass('titular-lista-a', paseA);
  await saveOfflinePass('titular-lista-b', paseB);

  const resultado = await listOfflinePasses('titular-lista-a');

  expect(resultado.map((registro) => registro.pass)).toEqual([paseA]);
});
