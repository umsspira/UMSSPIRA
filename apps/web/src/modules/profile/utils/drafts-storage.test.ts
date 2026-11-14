import type { DraftRecord } from '@/modules/profile/state/drafts-store';

import { DRAFTS_STORAGE_KEY, loadDrafts, saveDrafts } from './drafts-storage';

const FORMACION: DraftRecord = {
  id: 'borrador-1',
  section: 'education',
  data: { institucion: 'UMSS', titulo: 'Ingeniería de Sistemas', anioEgreso: '2024', grado: 'Licenciatura' },
};

function certificacionCon(respaldo: File | null): DraftRecord {
  return {
    id: 'borrador-2',
    section: 'certification',
    data: { nombre: 'AWS Cloud Practitioner', entidadEmisora: 'AWS', anioEmision: '2023', grado: '', respaldo },
  };
}

describe('Conservación de borradores en el navegador (HU-14, T14.3)', () => {
  it('guarda los borradores con la clave umsspira.profile.drafts', async () => {
    await saveDrafts([FORMACION]);
    expect(JSON.parse(window.localStorage.getItem(DRAFTS_STORAGE_KEY) ?? '[]')).toEqual([FORMACION]);
    expect(DRAFTS_STORAGE_KEY).toBe('umsspira.profile.drafts');
  });

  it('guarda el respaldo como data URL base64 y lo restaura como archivo', async () => {
    const respaldo = new File(['contenido del respaldo'], 'respaldo.jpg', { type: 'image/jpeg' });
    await saveDrafts([certificacionCon(respaldo)]);

    const guardado = window.localStorage.getItem(DRAFTS_STORAGE_KEY) ?? '';
    expect(guardado).toContain('data:image/jpeg;base64,');

    const [restaurado] = loadDrafts();
    if (restaurado.section !== 'certification') throw new Error('Se esperaba una certificación');
    const archivo = restaurado.data.respaldo as File;
    expect(archivo).toBeInstanceOf(File);
    expect(archivo.name).toBe('respaldo.jpg');
    expect(archivo.type).toBe('image/jpeg');
    expect(archivo.size).toBe(respaldo.size);
  });

  it('restaura los borradores guardados y conserva la marca de incompleto', async () => {
    const incompleto: DraftRecord = { ...FORMACION, id: 'borrador-3', isIncomplete: true };
    await saveDrafts([FORMACION, incompleto, certificacionCon(null)]);
    expect(loadDrafts()).toEqual([FORMACION, incompleto, certificacionCon(null)]);
  });

  it('sin borradores quita la clave', async () => {
    await saveDrafts([FORMACION]);
    await saveDrafts([]);
    expect(window.localStorage.getItem(DRAFTS_STORAGE_KEY)).toBeNull();
  });

  it('devuelve una lista vacía si no hay nada guardado o está dañado', () => {
    expect(loadDrafts()).toEqual([]);
    window.localStorage.setItem(DRAFTS_STORAGE_KEY, '{no es json');
    expect(loadDrafts()).toEqual([]);
  });

  it('no rompe si el navegador está lleno (QuotaExceededError)', async () => {
    const setItem = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Sin espacio', 'QuotaExceededError');
    });
    await expect(saveDrafts([FORMACION])).resolves.toBeUndefined();
    setItem.mockRestore();
  });

  it('no rompe si el navegador no deja leer', () => {
    const getItem = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Acceso bloqueado');
    });
    expect(loadDrafts()).toEqual([]);
    getItem.mockRestore();
  });
});
