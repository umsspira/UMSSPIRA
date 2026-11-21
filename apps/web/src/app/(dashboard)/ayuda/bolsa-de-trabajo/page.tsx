import type { Metadata } from 'next';
import { AyudaBolsaTrabajo } from '@/modules/ayuda/ayuda-bolsa-trabajo';

export const metadata: Metadata = {
  title: 'Ayuda · Bolsa de trabajo',
  description: 'Guías para buscar vacantes, postularse y consultar postulantes en UMSSPIRA.',
};

export default function AyudaBolsaTrabajoPage({
  searchParams,
}: {
  searchParams?: { tab?: string | string[] };
}) {
  const requestedTab = searchParams?.tab;
  const initialTab = requestedTab === 'reclutador' || requestedTab === 'afinidad'
    ? requestedTab
    : 'titulado';

  return <AyudaBolsaTrabajo key={initialTab} initialTab={initialTab} />;
}
