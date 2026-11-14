import type { Metadata } from 'next';
import ConfirmacionVacanteCliente from './ConfirmacionVacanteCliente';

export const metadata: Metadata = {
  title: 'Vacante guardada | UMSSPIRA',
};

export const instant = false;

export default async function ConfirmacionVacantePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ConfirmacionVacanteCliente id={id} />;
}
