'use client';

import { Suspense, use } from 'react';
import TechnicalRequirementsView from '../../components/TechnicalRequirementsView';

function VacanteRequisitosInner({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <TechnicalRequirementsView
      initialVacancyId={id}
      initialVacancyTitle="Analista de Datos Junior"
    />
  );
}

export default function VacanteRequisitosPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f3efe6] flex items-center justify-center p-8 text-gray-600">
          Cargando requisitos técnicos...
        </div>
      }
    >
      <VacanteRequisitosInner params={params} />
    </Suspense>
  );
}
