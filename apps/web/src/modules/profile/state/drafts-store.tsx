'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';

import type { Certificacion } from '@/modules/profile/completar/certificaciones';
import type { Experiencia } from '@/modules/profile/completar/experiencia-laboral';
import type { FormacionAcademica } from '@/modules/profile/completar/formacion-academica';
import type { RecordSection } from '@/modules/profile/types/profile-record';

/**
 * Borradores de «Agregar registros» (HU-13). Forma de los datos:
 * - id: temporal, solo vive en el navegador (por ejemplo «borrador-3»); la API da el id real al guardar
 * - section: apartado del borrador (education | experience | certification)
 * - data: lo que devuelve el formulario de ese apartado, tal cual (los mismos tipos de Completar perfil)
 * HU-14 extiende este estado (borrador incompleto y conservación en el navegador).
 */
export type DraftDataBySection = {
  education: FormacionAcademica;
  experience: Experiencia;
  certification: Certificacion;
};

export type DraftSection = RecordSection;

export type DraftRecord = {
  [S in DraftSection]: { id: string; section: S; data: DraftDataBySection[S] };
}[DraftSection];

type DraftsStore = {
  drafts: DraftRecord[];
  // Agrega un borrador al final y devuelve su id temporal
  addDraft: <S extends DraftSection>(section: S, data: DraftDataBySection[S]) => string;
  // Reemplaza los datos de un borrador existente; si el id no existe no hace nada
  updateDraft: <S extends DraftSection>(id: string, section: S, data: DraftDataBySection[S]) => void;
  removeDraft: (id: string) => void;
  clearDrafts: () => void;
};

const DraftsStoreContext = createContext<DraftsStore | null>(null);

let nextDraftId = 0;
function createDraftId(): string {
  nextDraftId += 1;
  return `borrador-${nextDraftId}`;
}

export function DraftsStoreProvider({
  children,
  initialDrafts = [],
}: {
  children: React.ReactNode;
  // Solo para pruebas
  initialDrafts?: DraftRecord[];
}) {
  const [drafts, setDrafts] = useState<DraftRecord[]>(initialDrafts);

  const addDraft = useCallback(<S extends DraftSection>(section: S, data: DraftDataBySection[S]) => {
    const id = createDraftId();
    setDrafts((current) => [...current, { id, section, data } as DraftRecord]);
    return id;
  }, []);

  const updateDraft = useCallback(<S extends DraftSection>(id: string, section: S, data: DraftDataBySection[S]) => {
    setDrafts((current) =>
      current.map((draft) => (draft.id === id ? ({ id, section, data } as DraftRecord) : draft)),
    );
  }, []);

  const removeDraft = useCallback((id: string) => {
    setDrafts((current) => current.filter((draft) => draft.id !== id));
  }, []);

  const clearDrafts = useCallback(() => setDrafts([]), []);

  const value = useMemo<DraftsStore>(
    () => ({ drafts, addDraft, updateDraft, removeDraft, clearDrafts }),
    [drafts, addDraft, updateDraft, removeDraft, clearDrafts],
  );

  return <DraftsStoreContext.Provider value={value}>{children}</DraftsStoreContext.Provider>;
}

export function useDraftsStore(): DraftsStore {
  const store = useContext(DraftsStoreContext);
  if (!store) throw new Error('useDraftsStore debe usarse dentro de DraftsStoreProvider');
  return store;
}
