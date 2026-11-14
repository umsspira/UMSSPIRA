import type { Metadata } from 'next';
import { Suspense } from 'react';
import DetalleVacanteCliente from './DetalleVacanteCliente';

export const instant = false;

export const metadata: Metadata = {
  title: 'Detalle de vacante | UMSSPIRA',
};

export default async function DetalleVacantePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <Suspense
      fallback={
        <main className="min-h-[calc(100vh-84px)] bg-[#eee9df] px-5 py-10 text-center text-sm text-[#6e7880]">
          Cargando detalle de la vacante...
        </main>
      }
    >
      <DetalleVacanteCliente id={id} />
    </Suspense>
  );
}
