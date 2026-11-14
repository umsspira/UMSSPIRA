import type { Metadata } from 'next';
import { Suspense } from 'react';
import MisVacantesCliente from './MisVacantesCliente';

export const metadata: Metadata = {
  title: 'Mis vacantes | UMSSPIRA',
};

export default function MisVacantesPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-[calc(100vh-84px)] bg-[#eee9df] px-5 py-10 sm:px-8">
          <p className="mx-auto max-w-[1328px] text-sm text-[#6e7880]">
            Cargando vacantes...
          </p>
        </main>
      }
    >
      <MisVacantesCliente />
    </Suspense>
  );
}
