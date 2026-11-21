import type { Metadata } from 'next';
import { AyudaBolsaTrabajo } from '@/modules/ayuda/ayuda-bolsa-trabajo';
import { ComoFuncionaAfinidad } from '@/modules/ayuda/como-funciona-afinidad';

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

  return (
    <AyudaBolsaTrabajo
      key={initialTab}
      initialTab={initialTab}
      affinityContent={<ComoFuncionaAfinidad />}
    />
  );
}