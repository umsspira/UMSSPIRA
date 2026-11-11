'use client';

import { useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
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

import { DraftCard } from './draft-card';

export const RECORDS_ROUTE = '/profile/records';
const DRAFT_BUTTON_TEXT = 'Guardar en borrador';

// Figma «E2S3 · P8 · Agregar registros» (archivo Epic 2 - Grupo 7)
const CARD_CLASS = 'rounded-xl border border-oatmeal bg-white';

const SECTION_NUMBERS: Record<DraftSection, number> = { education: 1, experience: 2, certification: 3 };

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
  const { records, isLoading, loadError, retryLoad } = useProfileStore();
  const { drafts, addDraft, updateDraft, removeDraft } = useDraftsStore();
  // Borrador cargado en su formulario con «Editar»; al guardarlo se reemplaza en vez de agregar otro
  const [editingId, setEditingId] = useState<string | null>(null);
  const editingDraft = drafts.find((draft) => draft.id === editingId) ?? null;

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
      setEditingId(null);
      return;
    }
    addDraft(section, data);
  }

  function editDraft(draft: DraftRecord) {
    setEditingId(draft.id);
    // jsdom no implementa scrollIntoView, por eso la llamada es opcional
    document.getElementById(`seccion-${SECTION_NUMBERS[draft.section]}`)?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }

  function removeDraftById(id: string) {
    removeDraft(id);
    if (editingId === id) setEditingId(null);
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
                valoresIniciales={editingDraft?.section === 'education' ? editingDraft.data : undefined}
                formaciones={existingEducation}
                mostrarRegistradas={false}
                textoBoton={DRAFT_BUTTON_TEXT}
                onAgregar={(formacion) => saveDraft('education', formacion)}
              />
            </DraftSectionCard>
            <DraftSectionCard number={2} title="Experiencia laboral">
              <FormularioExperiencia
                key={formKey('experience')}
                valoresIniciales={editingDraft?.section === 'experience' ? editingDraft.data : undefined}
                experiencias={[]}
                textoBoton={DRAFT_BUTTON_TEXT}
                onAgregar={(experiencia) => saveDraft('experience', experiencia)}
              />
            </DraftSectionCard>
            <DraftSectionCard number={3} title="Certificaciones">
              <FormularioCertificaciones
                key={formKey('certification')}
                valoresIniciales={editingDraft?.section === 'certification' ? editingDraft.data : undefined}
                certificaciones={[]}
                textoBoton={DRAFT_BUTTON_TEXT}
                textoGuardada="Certificación guardada en borrador"
                onAgregar={(certificacion) => saveDraft('certification', certificacion)}
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
    </div>
  );
}
