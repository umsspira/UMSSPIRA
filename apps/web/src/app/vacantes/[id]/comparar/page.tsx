import type { Metadata } from 'next';
import ComparisonClient from './ComparisonClient';

export const metadata: Metadata = {
  title: 'Comparación de habilidades | UMSSPIRA',
};

export default async function CompararVacantePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ComparisonClient id={id} />;
}
