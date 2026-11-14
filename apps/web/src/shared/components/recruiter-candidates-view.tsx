'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { NlpSearch, type SearchCandidateResult } from '@/shared/components/nlp-search';
import { CandidateCard } from '@/shared/components/candidate-card';
import { EvidenceBreakdown } from '@/shared/components/evidence-breakdown';
import { CandidatesEmptyState } from '@/shared/components/candidates-empty-state';
import { useCarouselPagination } from '@/shared/hooks/use-carousel-pagination';
import { rankCandidatesByQuery } from '@/shared/utils/candidate-search';

// Fixture de demostración. No se usa como dato operativo: la vista solo lo
// muestra cuando la persona pide explícitamente ver la demostración.
// Dependencia real: endpoint de candidatos con afinidad de la Épica 4,
// coordinado con el contrato de Radar de la Épica 3.
import candidatesData from '@/shared/mocks/candidates-mock.json';

export interface RecruiterCandidatesViewProps {
  // Permite abrir la demostración de forma explícita desde pruebas o demos.
  initialDemoMode?: boolean;
}

const DEMO_CANDIDATES = candidatesData.candidates as SearchCandidateResult[];

export const RecruiterCandidatesView: React.FC<RecruiterCandidatesViewProps> = ({
  initialDemoMode = false,
}) => {
  const [isDemoMode, setIsDemoMode] = useState<boolean>(initialDemoMode);
  const [candidates, setCandidates] = useState<SearchCandidateResult[]>(
    initialDemoMode ? DEMO_CANDIDATES : [],
  );
  const [selectedGraduateId, setSelectedGraduateId] = useState<string>(
    initialDemoMode ? DEMO_CANDIDATES[0]?.graduateId ?? '' : '',
  );
  const [, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Hook de paginación del carrusel
  const { currentIndex, itemsPerPage, handlePrev, handleNext, resetPagination } =
    useCarouselPagination(candidates.length);

  // Con la lista vacía no hay candidato seleccionado: se muestra el estado vacío
  const selectedCandidate: SearchCandidateResult | undefined =
    candidates.find((c) => c.graduateId === selectedGraduateId) ?? candidates[0];

  const enableDemo = () => {
    setCandidates(DEMO_CANDIDATES);
    setSelectedGraduateId(DEMO_CANDIDATES[0]?.graduateId ?? '');
    resetPagination();
    setIsDemoMode(true);
  };

  // Ajustes: Reiniciar paginación a 0 y seleccionar el primer resultado del buscador
  const handleSearchCompleted = (results: SearchCandidateResult[], query: string) => {
    setCandidates(results);
    setSearchQuery(query);
    resetPagination(); // Forzar el carrusel a volver a la página 1 (Índice 0)

    if (results.length > 0) {
      setSelectedGraduateId(results[0].graduateId); // Sincroniza el panel de evidencia con el primer resultado
    }
  };

  if (!isDemoMode) {
    return (
      <section className="space-y-6 rounded-2xl border border-amber-300 bg-amber-50 p-6 sm:p-8">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white text-abyssal-blue text-xs font-bold uppercase tracking-wider mb-2">
            <span>Búsqueda de talento y afinidad</span>
          </div>
          <h2 className="text-2xl font-black text-abyssal-blue tracking-tight">
            Esta vista aún no está disponible
          </h2>
          <p className="mt-3 max-w-2xl text-sm text-slate-700">
            La comparación de titulados por afinidad necesita un endpoint de candidatos
            que todavía no existe. El contrato actual de Radar solo expone el perfil del
            titulado autenticado y el rol empresa no tiene permiso para consultarlo.
          </p>
          <p className="mt-3 max-w-2xl text-sm text-slate-700">
            Dependencia: Épica 4 (contrato de candidatos) en coordinación con Épica 3.
            No se muestran datos de ejemplo como si fueran postulaciones reales.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={enableDemo}
            className="inline-flex items-center justify-center rounded-lg border border-amber-400 bg-white px-5 py-2.5 text-sm font-semibold text-amber-900 transition hover:bg-amber-100"
          >
            Ver demostración con datos de ejemplo
          </button>
          <Link
            href="/companies"
            className="inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-burning-flame transition hover:opacity-80"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Volver a mi perfil
          </Link>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-10 animate-fadeIn">
      <div
        role="status"
        data-testid="recruiter-demo-notice"
        className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-[13px] text-amber-900"
      >
        Demostración: los candidatos de esta pantalla son datos de ejemplo y no
        corresponden a postulaciones reales.
      </div>

      <section>
        <NlpSearch
          onSearchCompleted={handleSearchCompleted}
          isSearching={isSearching}
          setIsSearching={setIsSearching}
          totalCandidates={candidates.length}
          searchCandidates={(query) => rankCandidatesByQuery(DEMO_CANDIDATES, query)}
        />
      </section>

      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-300/60 pb-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-truffle-trouble" />
              <h3 className="text-lg font-black text-abyssal-blue tracking-tight uppercase">
                Comparativa de Titulados & Hexágonos de Afinidad
              </h3>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Selecciona un candidato para inspeccionar la trazabilidad de sus materias, actas de grado y diplomas.
            </p>
          </div>

          <div
            className={
              candidates.length > 0 ? 'flex items-center space-x-2 self-end sm:self-auto' : 'hidden'
            }
          >
            <span className="text-xs text-slate-500 font-mono mr-2">
              Mostrando {candidates.length > 0 ? currentIndex + 1 : 0} -{' '}
              {Math.min(currentIndex + itemsPerPage, candidates.length)} de {candidates.length} candidatos
            </span>
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={currentIndex + itemsPerPage >= candidates.length}
              className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {candidates.length === 0 && <CandidatesEmptyState />}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {candidates.slice(currentIndex, currentIndex + itemsPerPage).map((cand) => (
            <CandidateCard
              key={cand.graduateId}
              graduateId={cand.graduateId}
              name={cand.name}
              career={cand.career}
              graduationYear={cand.graduationYear}
              skills={cand.skills}
              professionalDescription={cand.professionalDescription}
              affinity={cand.affinity}
              nlpScore={cand.nlpScore}
              featured={cand.graduateId === candidates[0]?.graduateId}
              isSelected={selectedGraduateId === cand.graduateId}
              areas={cand.areas}
              location={cand.location}
              sisCode={cand.sisCode}
              concentrationArea={cand.concentrationArea}
              onSelectCandidate={(id) => setSelectedGraduateId(id)}
            />
          ))}
        </div>
      </section>

      <section id="evidence-section">
        {selectedCandidate && <EvidenceBreakdown candidateName={selectedCandidate.name} candidateData={selectedCandidate} />}
      </section>
    </div>
  );
};
