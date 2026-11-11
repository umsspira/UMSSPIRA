'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { FormularioCertificaciones } from '@/modules/profile/completar/certificaciones';
import { FormularioExperiencia } from '@/modules/profile/completar/experiencia-laboral';
import { FormacionAcademicaForm } from '@/modules/profile/completar/formacion-academica';
import { DraftsStoreProvider, useDraftsStore } from '@/modules/profile/state/drafts-store';
import { useProfileStore } from '@/modules/profile/state/profile-store';

export const RECORDS_ROUTE = '/profile/records';

/** Pantalla «Agregar registros» (HU-13): los registros se preparan como borradores y se guardan juntos. */
export function AddRecordsScreen() {
  return (
    <DraftsStoreProvider>
      <AddRecordsContent />
    </DraftsStoreProvider>
  );
}

// Apartado siempre abierto y más grande que en Completar perfil (CA-01): número y título arriba, formulario debajo
function DraftSectionCard({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  const headingId = `apartado-${number}`;
  return (
    <section aria-labelledby={headingId} className="rounded-2xl border border-abyssal-blue/10 bg-white px-4 py-5 md:px-6">
      <h2 id={headingId} className="mb-4 flex items-center gap-3 text-lg font-semibold text-blue-fantastic">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-truffle-trouble text-sm font-bold text-white">
          {number}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function AddRecordsContent() {
  const { isLoading, loadError, retryLoad } = useProfileStore();
  const { drafts, addDraft } = useDraftsStore();

  return (
    <div className="flex flex-col gap-5">
      {/* TODO(HU-11): cambiar por el BackButton compartido en la integración */}
      <Link
        href={RECORDS_ROUTE}
        className="inline-flex min-h-11 w-fit items-center gap-2 rounded-lg border border-blue-fantastic bg-white px-4 text-sm font-semibold text-blue-fantastic transition hover:bg-palladian"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Volver a Mis registros
      </Link>

      <header className="flex flex-col gap-1 rounded-2xl border border-abyssal-blue/10 bg-white px-5 py-5 md:px-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-truffle-trouble">Perfil profesional</p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-bold text-blue-fantastic md:text-[28px]">Agregar registros</h1>
          <span className="rounded-full bg-burning-flame/20 px-2.5 py-0.5 text-xs font-semibold text-truffle-trouble">Borrador</span>
        </div>
        <p className="text-sm text-blue-fantastic/70">
          Llena uno o más apartados y guárdalos como borrador. Al final presiona «Guardar perfil profesional» para
          guardar todos los borradores a la vez.
        </p>
      </header>

      {isLoading ? (
        <p role="status" className="rounded-2xl border border-abyssal-blue/10 bg-white px-6 py-10 text-center text-sm text-blue-fantastic/70">
          Cargando tu perfil…
        </p>
      ) : loadError ? (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-2xl border border-abyssal-blue/10 bg-white px-6 py-6 text-sm">
          <p>No se pudo cargar tu perfil. {loadError}</p>
          <button type="button" onClick={retryLoad} className="rounded-lg bg-burning-flame px-4 py-2 font-bold text-abyssal-blue">
            Reintentar
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
          <div className="flex min-w-0 flex-1 flex-col gap-5">
            {/* Se reutilizan los formularios de Completar perfil; aquí el alta va a borradores, no a la API */}
            <DraftSectionCard number={1} title="Formación académica">
              <FormacionAcademicaForm formaciones={[]} onAgregar={(formacion) => void addDraft('education', formacion)} />
            </DraftSectionCard>
            <DraftSectionCard number={2} title="Experiencia laboral">
              <FormularioExperiencia experiencias={[]} onAgregar={(experiencia) => void addDraft('experience', experiencia)} />
            </DraftSectionCard>
            <DraftSectionCard number={3} title="Certificaciones">
              <FormularioCertificaciones
                certificaciones={[]}
                onAgregar={(certificacion) => void addDraft('certification', certificacion)}
              />
            </DraftSectionCard>
            {/* El apartado 4 «Proyectos y portafolio» lo suma HU-19 en la integración */}
          </div>

          {/* Bloque «Borradores»: la lista con «Editar» y «Quitar» llega en T13.4; el aviso de provisionales es de HU-14 */}
          <aside
            aria-label="Borradores"
            className="flex flex-col gap-3 rounded-2xl border border-abyssal-blue/10 bg-white p-5 lg:sticky lg:top-6 lg:w-[320px] lg:shrink-0"
          >
            <h2 className="flex items-center gap-2 text-base font-semibold text-blue-fantastic">
              Borradores
              <span className="text-xs font-bold text-truffle-trouble">{drafts.length}</span>
            </h2>
            {drafts.length === 0 && (
              <p className="text-xs text-blue-fantastic/60">
                Aún no hay borradores. Llena un apartado y presiona «Guardar en borrador».
              </p>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
