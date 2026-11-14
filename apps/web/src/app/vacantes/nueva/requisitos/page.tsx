'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import TechnicalRequirementsView from '../../components/TechnicalRequirementsView';

function NuevaVacanteRequisitosInner() {
  const searchParams = useSearchParams();
  const vacancyId = searchParams.get('id');
  const vacancyTitle = searchParams.get('titulo') || 'Nueva vacante';

  if (!vacancyId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(vacancyId)) {
    return (
      <main className="min-h-screen bg-[#f3efe6] p-8">
        <div className="mx-auto max-w-2xl rounded-xl bg-white p-6 shadow-sm">
          <h1 className="text-xl font-bold text-gray-900">
            Guarda primero la vacante
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Para asociar requisitos técnicos necesitamos el identificador real
            que devuelve el servidor al guardar la vacante.
          </p>
          <Link
            href="/vacantes/nueva"
            className="mt-5 inline-flex rounded-lg bg-[#ed9635] px-4 py-2 text-sm font-semibold text-white"
          >
            Crear vacante
          </Link>
        </div>
      </main>
    );
  }

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
