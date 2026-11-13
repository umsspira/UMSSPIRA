'use client';

import { useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import Link from 'next/link';

import { FormularioCertificaciones } from '@/modules/profile/completar/certificaciones';
import { FormularioExperiencia } from '@/modules/profile/completar/experiencia-laboral';
import { FormacionAcademicaForm, type FormacionAcademica } from '@/modules/profile/completar/formacion-academica';
import {
  type DraftDataBySection,
  type DraftRecord,
  type DraftSection,
  DraftsStoreProvider,
  useDraftsStore,
} from '@/modules/profile/state/drafts-store';
import { useProfileStore } from '@/modules/profile/state/profile-store';
import type { EducationRecord } from '@/modules/profile/types/profile-record';

import { afterBatchSave } from './after-batch-save';
import { DraftCard } from './draft-card';
import { type CertificationAttempt, type SavedDraft, persistDraft } from './save-draft';

export const RECORDS_ROUTE = '/profile/records';
const DRAFT_BUTTON_TEXT = 'Guardar en borrador';

// Figma «E2S3 · P8 · Agregar registros» (archivo Epic 2 - Grupo 7)
const CARD_CLASS = 'rounded-xl border border-oatmeal bg-white';

type SaveStatus = { status: 'idle' | 'saving' | 'error' } | { status: 'saved'; count: number };

const SECTION_NUMBERS: Record<DraftSection, number> = { education: 1, experience: 2, certification: 3 };

// Algún campo escrito o un respaldo elegido
function hasData(data: DraftDataBySection[DraftSection]): boolean {
  return Object.values(data).some((value) => (typeof value === 'string' ? value.trim() !== '' : value != null));
}

/** Pantalla «Agregar registros» (HU-13): los registros se preparan como borradores y se guardan juntos. */
export function AddRecordsScreen({ initialDrafts }: { initialDrafts?: DraftRecord[] }) {
  return (
    <DraftsStoreProvider initialDrafts={initialDrafts}>
      <AddRecordsContent />
    </DraftsStoreProvider>
  );
}

// Apartado siempre abierto y más grande que en Completar perfil (CA-01): número y título arriba, formulario debajo
function DraftSectionCard({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  const headingId = `apartado-${number}`;
  return (
    <section id={`seccion-${number}`} aria-labelledby={headingId} className={`${CARD_CLASS} flex flex-col gap-4 p-5 md:p-7`}>
      <h2 id={headingId} className="flex items-center gap-3 text-lg font-semibold text-blue-fantastic md:text-xl">
        <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-truffle-trouble text-sm font-bold text-white">
          {number}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function AddRecordsContent() {
  const { records, isLoading, loadError, retryLoad, addEducation, addExperience, addCertification } = useProfileStore();
  const { drafts, addDraft, updateDraft, removeDraft, saveIncompleteDraft } = useDraftsStore();
  const [saveStatus, setSaveStatus] = useState<SaveStatus>({ status: 'idle' });
  const certificationAttempts = useRef(new Map<string, CertificationAttempt>());
  const isSaving = saveStatus.status === 'saving';
  // Borrador cargado en su formulario con «Editar»; al guardarlo se reemplaza en vez de agregar otro
  const [editingId, setEditingId] = useState<string | null>(null);
  const editingDraft = drafts.find((draft) => draft.id === editingId) ?? null;
  // T14.1: lo que hay escrito en el formulario de cada apartado, para subirlo como borrador incompleto
  const formData = useRef<Partial<DraftDataBySection>>({});
  const trackForm = useMemo(
    () => ({
      education: (data: DraftDataBySection['education']) => {
        formData.current.education = data;
      },
      experience: (data: DraftDataBySection['experience']) => {
        formData.current.experience = data;
      },
      certification: (data: DraftDataBySection['certification']) => {
        formData.current.certification = data;
      },
    }),
    [],
  );
  // T14.2: datos con los que arranca el formulario nuevo de cada apartado (el borrador incompleto devuelto)
  const [formStart, setFormStart] = useState<Partial<DraftDataBySection>>({});

  // Formaciones ya guardadas y en borrador (menos la que se edita): con ellas la regla existente avisa de duplicadas
  const existingEducation = useMemo<FormacionAcademica[]>(
    () => [
      ...(records.education as EducationRecord[]).map((record) => ({
        institucion: record.institution,
        titulo: record.title,
        anioEgreso: record.graduationYear,
        grado: record.degree,
      })),
      ...drafts.flatMap((draft) => (draft.section === 'education' && draft.id !== editingId ? [draft.data] : [])),
    ],
    [records.education, drafts, editingId],
  );

  // Con un borrador en edición, el formulario de su apartado arranca con sus datos; el key lo vuelve a montar
  function formKey(section: DraftSection) {
    return editingDraft?.section === section ? editingDraft.id : `${section}-nuevo`;
  }

  function saveDraft<S extends DraftSection>(section: S, data: DraftDataBySection[S]) {
    if (editingDraft && editingDraft.section === section) {
      updateDraft(editingDraft.id, section, data);
      // Con otros datos ya no vale el intento anterior de esa certificación
      certificationAttempts.current.delete(editingDraft.id);
      finishEditing(editingDraft);
      return;
    }
    addDraft(section, data);
  }

  // T14.2: al terminar de editar, el borrador incompleto de ese apartado vuelve a sus casillas y sale de la lista
  function finishEditing(edited: DraftRecord) {
    const incomplete = drafts.find(
      (draft) => draft.section === edited.section && draft.isIncomplete && draft.id !== edited.id,
    );
    if (incomplete) removeDraft(incomplete.id);
    setFormStart((current) => ({ ...current, [edited.section]: incomplete?.data }));
    setEditingId(null);
  }

  function editDraft(draft: DraftRecord) {
    // T14.1: si el formulario nuevo de ese apartado tiene datos a medias, no se pierden al cargar el borrador
    const pending = formData.current[draft.section];
    if (editingDraft?.section !== draft.section && pending && hasData(pending)) {
      saveIncompleteDraft(draft.section, pending);
    }
    setEditingId(draft.id);
    // jsdom no implementa scrollIntoView, por eso la llamada es opcional
    document.getElementById(`seccion-${SECTION_NUMBERS[draft.section]}`)?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }

  function removeDraftById(id: string) {
    removeDraft(id);
    certificationAttempts.current.delete(id);
    if (editingDraft?.id === id) finishEditing(editingDraft);
  }

  function addToRecords(saved: SavedDraft) {
    if (saved.section === 'education') addEducation(saved.record);
    else if (saved.section === 'experience') addExperience(saved.record);
    else addCertification(saved.record);
  }

  // «Guardar perfil profesional» (CA-04): guarda los borradores uno por uno; cada uno guardado pasa a Mis
  // registros y sale de la lista. Si uno falla, se detiene y los que faltan siguen como borradores
  async function saveProfile() {
    if (drafts.length === 0 || isSaving) return;
    setEditingId(null);
    setSaveStatus({ status: 'saving' });
    let savedCount = 0;
    let hasFailed = false;
    for (const draft of drafts) {
      try {
        addToRecords(await persistDraft(draft, certificationAttempts.current));
      } catch {
        hasFailed = true;
        break;
      }
      removeDraft(draft.id);
      savedCount += 1;
    }
    // T13.6: un solo recálculo para todo lo guardado, no uno por registro
    if (savedCount > 0) void afterBatchSave(savedCount);
    setSaveStatus(hasFailed ? { status: 'error' } : { status: 'saved', count: savedCount });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* TODO(HU-11): cambiar por el BackButton compartido en la integración */}
      <Link
        href={RECORDS_ROUTE}
        className="inline-flex h-11 w-fit items-center gap-2.5 rounded-[10px] border-[1.5px] border-blue-fantastic bg-white pl-4 pr-5 text-[15px] font-semibold text-blue-fantastic transition hover:bg-palladian"
      >
        <ArrowLeft className="h-[18px] w-[18px]" aria-hidden="true" />
        Volver a Mis registros
      </Link>

      <header className="flex flex-col gap-2 rounded-2xl border border-oatmeal bg-white px-5 py-5 md:px-8 md:py-6">
        <p className="text-xs font-semibold uppercase text-truffle-trouble">Perfil profesional</p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-[28px] font-semibold leading-tight text-blue-fantastic md:text-[32px]">
            Agregar registros
          </h1>
          <span className="rounded-full bg-burning-flame/[0.16] px-2.5 py-1 text-xs font-semibold text-truffle-trouble">
            Borrador
          </span>
        </div>
        <p className="text-sm text-blue-fantastic/55">
          Llena uno o más apartados y guárdalos como borrador. Al final presiona «Guardar perfil profesional» para
          guardar todos los borradores a la vez.
        </p>
      </header>

      {saveStatus.status === 'saved' && (
        <div role="status" className={`${CARD_CLASS} flex flex-wrap items-center gap-3 px-5 py-4 text-sm text-blue-fantastic`}>
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-fantastic text-white">
            <Check className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="font-semibold">
            {saveStatus.count === 1
              ? 'Se guardó 1 registro en tu perfil.'
              : `Se guardaron ${saveStatus.count} registros en tu perfil.`}
          </span>
          <Link href={RECORDS_ROUTE} className="font-semibold text-truffle-trouble underline">
            Ver en Mis registros
          </Link>
        </div>
      )}
      {saveStatus.status === 'error' && (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-burning-flame bg-burning-flame/15 px-5 py-4 text-sm text-blue-fantastic">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-truffle-trouble font-bold text-white" aria-hidden="true">
            !
          </span>
          <span className="font-semibold">No se pudieron guardar los registros. Tus borradores siguen en este navegador.</span>
          <button type="button" onClick={() => void saveProfile()} className="font-semibold text-truffle-trouble underline">
            Reintentar
          </button>
        </div>
      )}

      {isLoading ? (
        <p role="status" className={`${CARD_CLASS} px-6 py-10 text-center text-sm text-blue-fantastic/70`}>
          Cargando tu perfil…
        </p>
      ) : loadError ? (
        <div role="alert" className={`${CARD_CLASS} flex flex-col items-start gap-3 px-6 py-6 text-sm`}>
          <p>No se pudo cargar tu perfil. {loadError}</p>
          <button type="button" onClick={retryLoad} className="rounded-lg bg-burning-flame px-4 py-2 font-bold text-abyssal-blue">
            Reintentar
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:gap-8">
          <div className="flex min-w-0 flex-1 flex-col gap-5">
            {/* Se reutilizan los formularios de Completar perfil; aquí el alta va a borradores, no a la API */}
            <DraftSectionCard number={1} title="Formación académica">
              <FormacionAcademicaForm
                key={formKey('education')}
                valoresIniciales={editingDraft?.section === 'education' ? editingDraft.data : formStart.education}
                formaciones={existingEducation}
                mostrarRegistradas={false}
                textoBoton={DRAFT_BUTTON_TEXT}
                onAgregar={(formacion) => saveDraft('education', formacion)}
                onDatosChange={trackForm.education}
              />
            </DraftSectionCard>
            <DraftSectionCard number={2} title="Experiencia laboral">
              <FormularioExperiencia
                key={formKey('experience')}
                valoresIniciales={editingDraft?.section === 'experience' ? editingDraft.data : formStart.experience}
                experiencias={[]}
                textoBoton={DRAFT_BUTTON_TEXT}
                onAgregar={(experiencia) => saveDraft('experience', experiencia)}
                onDatosChange={trackForm.experience}
              />
            </DraftSectionCard>
            <DraftSectionCard number={3} title="Certificaciones">
              <FormularioCertificaciones
                key={formKey('certification')}
                valoresIniciales={editingDraft?.section === 'certification' ? editingDraft.data : formStart.certification}
                certificaciones={[]}
                textoBoton={DRAFT_BUTTON_TEXT}
                textoGuardada="Certificación guardada en borrador"
                onAgregar={(certificacion) => saveDraft('certification', certificacion)}
                onDatosChange={trackForm.certification}
              />
            </DraftSectionCard>
            {/* El apartado 4 «Proyectos y portafolio» lo suma HU-19 en la integración */}
          </div>

          {/* Bloque «Borradores» (CA-03): solo borradores, cada uno con «Editar» y «Quitar». En celular va debajo
              de los apartados. El aviso «Los borradores son provisionales…» es de HU-14 */}
          <aside aria-label="Borradores" className={`${CARD_CLASS} flex flex-col gap-3.5 p-5 md:p-6 lg:w-[380px] lg:shrink-0`}>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-blue-fantastic">
              Borradores
              <span className="rounded-[10px] bg-burning-flame/[0.16] px-2 py-0.5 text-xs font-semibold text-truffle-trouble">
                {drafts.length}
              </span>
            </h2>
            {drafts.length === 0 ? (
              <p className="text-xs text-blue-fantastic/55">
                Aún no hay borradores. Llena un apartado y presiona «Guardar en borrador».
              </p>
            ) : (
              <ul className="flex flex-col gap-3.5">
                {drafts.map((draft) => (
                  <DraftCard
                    key={draft.id}
                    draft={draft}
                    isEditing={draft.id === editingId}
                    onEdit={() => editDraft(draft)}
                    onRemove={() => removeDraftById(draft.id)}
                  />
                ))}
              </ul>
            )}
          </aside>
        </div>
      )}

      {!isLoading && !loadError && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => void saveProfile()}
              disabled={drafts.length === 0 || isSaving}
              aria-describedby={drafts.length === 0 ? 'ayuda-guardar-perfil' : undefined}
              className="flex-1 rounded-lg bg-burning-flame px-6 py-3.5 text-[15px] font-bold text-abyssal-blue transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? 'Guardando…' : 'Guardar perfil profesional'}
            </button>
            <Link
              href={RECORDS_ROUTE}
              className="rounded-lg border border-oatmeal bg-white px-6 py-3.5 text-center text-[15px] font-semibold text-blue-fantastic transition hover:bg-palladian"
            >
              Cancelar
            </Link>
          </div>
          {drafts.length === 0 && (
            <p id="ayuda-guardar-perfil" className="text-xs text-blue-fantastic/55">
              Agrega al menos un borrador para poder guardar.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
