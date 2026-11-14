import { act, renderHook, waitFor } from '@testing-library/react';

import { DRAFTS_STORAGE_KEY } from '@/modules/profile/utils/drafts-storage';

import { DraftsStoreProvider, type DraftRecord, useDraftsStore } from './drafts-store';

const FORMACION = { institucion: 'UMSS', titulo: 'Ingeniería de Sistemas', anioEgreso: '2024', grado: 'Licenciatura' };
const A_MEDIAS = { institucion: 'UCB', titulo: '', anioEgreso: '', grado: '' };
const EXPERIENCIA = { empresa: 'Jalasoft', cargo: '', fechaInicio: '' };

function renderDrafts(initialDrafts?: DraftRecord[]) {
  return renderHook(() => useDraftsStore(), {
    wrapper: ({ children }) => <DraftsStoreProvider initialDrafts={initialDrafts}>{children}</DraftsStoreProvider>,
  });
}

function guardados(): DraftRecord[] {
  return JSON.parse(window.localStorage.getItem(DRAFTS_STORAGE_KEY) ?? '[]');
}

describe('DraftsStoreProvider (HU-14)', () => {
  it('T14.1: sube los datos a medias marcados como incompletos', () => {
    const { result } = renderDrafts([{ id: 'b1', section: 'education', data: FORMACION }]);
    act(() => result.current.saveIncompleteDraft('education', A_MEDIAS));
    expect(result.current.drafts).toHaveLength(2);
    expect(result.current.drafts[1]).toMatchObject({ section: 'education', data: A_MEDIAS, isIncomplete: true });
  });

  it('T14.1: solo hay uno incompleto por apartado; el nuevo reemplaza al anterior', () => {
    const { result } = renderDrafts();
    act(() => result.current.saveIncompleteDraft('education', A_MEDIAS));
    act(() => result.current.saveIncompleteDraft('experience', EXPERIENCIA));
    act(() => result.current.saveIncompleteDraft('education', { ...A_MEDIAS, titulo: 'Derecho' }));
    const incompletos = result.current.drafts.filter((draft) => draft.isIncomplete);
    expect(incompletos).toHaveLength(2);
    expect(incompletos.find((draft) => draft.section === 'education')?.data).toEqual({ ...A_MEDIAS, titulo: 'Derecho' });
  });

  it('T14.1: al guardarlo completo con updateDraft deja de ser incompleto', () => {
    const { result } = renderDrafts([{ id: 'b1', section: 'education', data: A_MEDIAS, isIncomplete: true }]);
    act(() => result.current.updateDraft('b1', 'education', FORMACION));
    expect(result.current.drafts[0].isIncomplete).toBeUndefined();
  });

  it('T14.3: guarda en el navegador en cada cambio', async () => {
    const { result } = renderDrafts();
    let id = '';
    act(() => {
      id = result.current.addDraft('education', FORMACION);
    });
    await waitFor(() => expect(guardados()).toEqual([{ id, section: 'education', data: FORMACION }]));
    act(() => result.current.removeDraft(id));
    await waitFor(() => expect(window.localStorage.getItem(DRAFTS_STORAGE_KEY)).toBeNull());
  });

  it('T14.3: restaura lo guardado al montar y los ids nuevos no se repiten', async () => {
    const guardado: DraftRecord[] = [
      { id: 'borrador-90', section: 'education', data: FORMACION },
      { id: 'borrador-91', section: 'experience', data: EXPERIENCIA, isIncomplete: true },
    ];
    window.localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(guardado));
    const { result } = renderDrafts();
    await waitFor(() => expect(result.current.drafts).toEqual(guardado));
    let nuevo = '';
    act(() => {
      nuevo = result.current.addDraft('education', FORMACION);
    });
    expect(['borrador-90', 'borrador-91']).not.toContain(nuevo);
  });

  it('T14.3: no rompe si el navegador está lleno', async () => {
    const setItem = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Sin espacio', 'QuotaExceededError');
    });
    const { result } = renderDrafts();
    act(() => {
      result.current.addDraft('education', FORMACION);
    });
    await waitFor(() => expect(setItem).toHaveBeenCalled());
    expect(result.current.drafts).toHaveLength(1);
    setItem.mockRestore();
  });
});
