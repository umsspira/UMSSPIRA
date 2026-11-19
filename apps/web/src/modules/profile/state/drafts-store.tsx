'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import type { Certificacion } from '@/modules/profile/completar/certificaciones';
import type { Experiencia } from '@/modules/profile/completar/experiencia-laboral';
import type { FormacionAcademica } from '@/modules/profile/completar/formacion-academica';
import type { Proyecto } from '@/modules/profile/completar/proyectos';
import type { RecordSection } from '@/modules/profile/types/profile-record';
import { loadDrafts, saveDrafts } from '@/modules/profile/utils/drafts-storage';

/**
 * Borradores de «Agregar registros» (HU-13). Forma de los datos:
 * - id: temporal, solo vive en el navegador (por ejemplo «borrador-3»); la API da el id real al guardar
 * - section: apartado del borrador (education | experience | certification | project)
 * - data: lo que devuelve el formulario de ese apartado, tal cual (los mismos tipos de Completar perfil)
 * HU-14 extiende este estado (borrador incompleto y conservación en el navegador).
 */
export type DraftDataBySection = {
  education: FormacionAcademica;
  experience: Experiencia;
  certification: Certificacion;
  // HU-19: proyectos y portafolio
  project: Proyecto;
};

export type DraftSection = RecordSection;

export type DraftRecord = {
  [S in DraftSection]: {
    id: string;
    section: S;
    data: DraftDataBySection[S];
    // HU-14 (T14.1): datos a medias subidos al pulsar «Editar» en otro borrador; uno por sección como máximo
    isIncomplete?: boolean;
  };
}[DraftSection];

type DraftsStore = {
  drafts: DraftRecord[];
  // Agrega un borrador al final y devuelve su id temporal
  addDraft: <S extends DraftSection>(section: S, data: DraftDataBySection[S]) => string;
  // Reemplaza los datos de un borrador existente; si el id no existe no hace nada
  updateDraft: <S extends DraftSection>(id: string, section: S, data: DraftDataBySection[S]) => void;
  removeDraft: (id: string) => void;
  clearDrafts: () => void;
  // Sube los datos a medias de un apartado como «borrador incompleto»; si ya hay uno en ese apartado, lo reemplaza
  saveIncompleteDraft: <S extends DraftSection>(section: S, data: DraftDataBySection[S]) => void;
};

const DraftsStoreContext = createContext<DraftsStore | null>(null);

let nextDraftId = 0;
function createDraftId(): string {
  nextDraftId += 1;
  return `borrador-${nextDraftId}`;
}

// Los ids restaurados del navegador no deben repetirse con los nuevos
function skipRestoredIds(drafts: DraftRecord[]) {
  for (const draft of drafts) {
    const number = Number(draft.id.replace('borrador-', ''));
    if (Number.isInteger(number) && number > nextDraftId) nextDraftId = number;
  }
}

export function DraftsStoreProvider({
  children,
  initialDrafts,
}: {
  children: React.ReactNode;
  // Solo para pruebas; con ellos no se restaura lo guardado en el navegador
  initialDrafts?: DraftRecord[];
}) {
  const [drafts, setDrafts] = useState<DraftRecord[]>(initialDrafts ?? []);
  // T14.3: hasta restaurar no se guarda, para no pisar lo conservado con la lista vacía del inicio
  const [isRestored, setIsRestored] = useState(false);

  useEffect(() => {
    if (!initialDrafts) {
      const saved = loadDrafts();
      skipRestoredIds(saved);
      if (saved.length > 0) setDrafts(saved);
    }
    setIsRestored(true);
    // Solo al montar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isRestored) void saveDrafts(drafts);
  }, [drafts, isRestored]);

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

  const saveIncompleteDraft = useCallback(<S extends DraftSection>(section: S, data: DraftDataBySection[S]) => {
    setDrafts((current) => {
      const previous = current.find((draft) => draft.section === section && draft.isIncomplete);
      if (!previous) return [...current, { id: createDraftId(), section, data, isIncomplete: true } as DraftRecord];
      return current.map((draft) =>
        draft.id === previous.id ? ({ id: previous.id, section, data, isIncomplete: true } as DraftRecord) : draft,
      );
    });
  }, []);

  const value = useMemo<DraftsStore>(
    () => ({ drafts, addDraft, updateDraft, removeDraft, clearDrafts, saveIncompleteDraft }),
    [drafts, addDraft, updateDraft, removeDraft, clearDrafts, saveIncompleteDraft],
  );

  return <DraftsStoreContext.Provider value={value}>{children}</DraftsStoreContext.Provider>;
}

export function useDraftsStore(): DraftsStore {
  const store = useContext(DraftsStoreContext);
  if (!store) throw new Error('useDraftsStore debe usarse dentro de DraftsStoreProvider');
  return store;
}
