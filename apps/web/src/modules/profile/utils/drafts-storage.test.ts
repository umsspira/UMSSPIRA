import type { DraftRecord } from '@/modules/profile/state/drafts-store';

import { DRAFTS_STORAGE_PREFIX, clearAllProfileDrafts, draftsStorageKey, loadDrafts, saveDrafts } from './drafts-storage';

const TITULADO = 'titulado-1';
const DRAFTS_STORAGE_KEY = draftsStorageKey(TITULADO);

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
  beforeEach(() => window.localStorage.clear());

  it('guarda los borradores con una clave propia del titulado', async () => {
    await saveDrafts([FORMACION], TITULADO);
    expect(JSON.parse(window.localStorage.getItem(DRAFTS_STORAGE_KEY) ?? '[]')).toEqual([FORMACION]);
    expect(DRAFTS_STORAGE_KEY).toBe('umsspira.profile.drafts.titulado-1');
  });

  it('un titulado no ve los borradores de otro en el mismo navegador', async () => {
    await saveDrafts([FORMACION], 'titulado-1');
    expect(loadDrafts('titulado-2')).toEqual([]);
    expect(loadDrafts('titulado-1')).toEqual([FORMACION]);
  });

  it('sin titulado no se lee ni se guarda nada', async () => {
    await saveDrafts([FORMACION], '');
    expect(window.localStorage.length).toBe(0);
    expect(loadDrafts('')).toEqual([]);
  });

  it('descarta la clave antigua compartida por todos los usuarios', () => {
    window.localStorage.setItem(DRAFTS_STORAGE_PREFIX, JSON.stringify([FORMACION]));
    expect(loadDrafts(TITULADO)).toEqual([]);
    expect(window.localStorage.getItem(DRAFTS_STORAGE_PREFIX)).toBeNull();
  });

  it('al cerrar sesión se borran los borradores de todos los titulados, sin tocar otras claves', async () => {
    await saveDrafts([FORMACION], 'titulado-1');
    await saveDrafts([FORMACION], 'titulado-2');
    window.localStorage.setItem('otra.clave', 'x');
    clearAllProfileDrafts();
    expect(window.localStorage.getItem(draftsStorageKey('titulado-1'))).toBeNull();
    expect(window.localStorage.getItem(draftsStorageKey('titulado-2'))).toBeNull();
    expect(window.localStorage.getItem('otra.clave')).toBe('x');
  });

  it('guarda el respaldo como data URL base64 y lo restaura como archivo', async () => {
    const respaldo = new File(['contenido del respaldo'], 'respaldo.jpg', { type: 'image/jpeg' });
    await saveDrafts([certificacionCon(respaldo)], TITULADO);

    const guardado = window.localStorage.getItem(DRAFTS_STORAGE_KEY) ?? '';
    expect(guardado).toContain('data:image/jpeg;base64,');

    const [restaurado] = loadDrafts(TITULADO);
    if (restaurado.section !== 'certification') throw new Error('Se esperaba una certificación');
    const archivo = restaurado.data.respaldo as File;
    expect(archivo).toBeInstanceOf(File);
    expect(archivo.name).toBe('respaldo.jpg');
    expect(archivo.type).toBe('image/jpeg');
    expect(archivo.size).toBe(respaldo.size);
  });

  it('restaura los borradores guardados y conserva la marca de incompleto', async () => {
    const incompleto: DraftRecord = { ...FORMACION, id: 'borrador-3', isIncomplete: true };
    await saveDrafts([FORMACION, incompleto, certificacionCon(null)], TITULADO);
    expect(loadDrafts(TITULADO)).toEqual([FORMACION, incompleto, certificacionCon(null)]);
  });

  it('sin borradores quita la clave', async () => {
    await saveDrafts([FORMACION], TITULADO);
    await saveDrafts([], TITULADO);
    expect(window.localStorage.getItem(DRAFTS_STORAGE_KEY)).toBeNull();
  });

  it('devuelve una lista vacía si no hay nada guardado o está dañado', () => {
    expect(loadDrafts(TITULADO)).toEqual([]);
    window.localStorage.setItem(DRAFTS_STORAGE_KEY, '{no es json');
    expect(loadDrafts(TITULADO)).toEqual([]);
  });

  it('si el navegador está lleno avisa (false) y borra la copia vieja para que no vuelva al recargar', async () => {
    await saveDrafts([FORMACION], TITULADO);
    const setItem = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Sin espacio', 'QuotaExceededError');
    });
    await expect(saveDrafts([FORMACION, certificacionCon(null)], TITULADO)).resolves.toBe(false);
    setItem.mockRestore();
    expect(window.localStorage.getItem(DRAFTS_STORAGE_KEY)).toBeNull();
    expect(loadDrafts(TITULADO)).toEqual([]);
  });

  it('cuando se puede guardar devuelve true', async () => {
    await expect(saveDrafts([FORMACION], TITULADO)).resolves.toBe(true);
  });

  it('no rompe si el navegador no deja leer', () => {
    const getItem = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Acceso bloqueado');
    });
    expect(loadDrafts(TITULADO)).toEqual([]);
    getItem.mockRestore();
  });
});
