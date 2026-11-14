'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import TechnicalRequirementsView from '../../components/TechnicalRequirementsView';

function NuevaVacanteRequisitosInner() {
  const searchParams = useSearchParams();
  const vacancyId = searchParams.get('id') || 'VAC-2026-047';
  const vacancyTitle =
    searchParams.get('titulo') || 'Analista de Datos Junior';

  return (
    <TechnicalRequirementsView
      initialVacancyId={vacancyId}
      initialVacancyTitle={vacancyTitle}
    />
  );
}

export default function NuevaVacanteRequisitosPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f3efe6] flex items-center justify-center p-8 text-gray-600">
          Cargando requisitos técnicos...
        </div>
      }
    >
      <NuevaVacanteRequisitosInner />
    </Suspense>
  );
}
