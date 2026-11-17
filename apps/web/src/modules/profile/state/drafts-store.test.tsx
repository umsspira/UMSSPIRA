import '@testing-library/jest-dom';
import { act, renderHook } from '@testing-library/react';

import { DraftsStoreProvider, type DraftRecord, useDraftsStore } from './drafts-store';

const FORMACION = { institucion: 'UMSS', titulo: 'Ingeniería de Sistemas', anioEgreso: '2024', grado: 'Licenciatura' };
const EXPERIENCIA = { empresa: 'Jalasoft', cargo: 'Desarrollador', fechaInicio: '2024-01-01' };

function renderDrafts(initialDrafts?: DraftRecord[]) {
  return renderHook(() => useDraftsStore(), {
    wrapper: ({ children }) => <DraftsStoreProvider initialDrafts={initialDrafts}>{children}</DraftsStoreProvider>,
  });
}

describe('DraftsStoreProvider', () => {
  it('empieza sin borradores', () => {
    const { result } = renderDrafts();
    expect(result.current.drafts).toEqual([]);
  });

  it('agrega borradores por sección con un id temporal distinto', () => {
    const { result } = renderDrafts();
    let primero = '';
    let segundo = '';
    act(() => {
      primero = result.current.addDraft('education', FORMACION);
      segundo = result.current.addDraft('experience', EXPERIENCIA);
    });
    expect(primero).not.toBe(segundo);
    expect(result.current.drafts).toEqual([
      { id: primero, section: 'education', data: FORMACION },
      { id: segundo, section: 'experience', data: EXPERIENCIA },
    ]);
  });

  it('actualiza solo el borrador indicado', () => {
    const { result } = renderDrafts([
      { id: 'b1', section: 'education', data: FORMACION },
      { id: 'b2', section: 'experience', data: EXPERIENCIA },
    ]);
    act(() => result.current.updateDraft('b1', 'education', { ...FORMACION, titulo: 'Informática' }));
    expect(result.current.drafts[0].data).toEqual({ ...FORMACION, titulo: 'Informática' });
    expect(result.current.drafts[1].data).toEqual(EXPERIENCIA);
  });

  it('quita un borrador y vacía todos', () => {
    const { result } = renderDrafts([
      { id: 'b1', section: 'education', data: FORMACION },
      { id: 'b2', section: 'experience', data: EXPERIENCIA },
    ]);
    act(() => result.current.removeDraft('b1'));
    expect(result.current.drafts.map((draft) => draft.id)).toEqual(['b2']);
    act(() => result.current.clearDrafts());
    expect(result.current.drafts).toEqual([]);
  });

  it('falla si se usa fuera del proveedor', () => {
    const consola = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useDraftsStore())).toThrow('useDraftsStore debe usarse dentro de DraftsStoreProvider');
    consola.mockRestore();
  });
});
