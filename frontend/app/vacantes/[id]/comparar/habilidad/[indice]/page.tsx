import type { Metadata } from 'next';
import MissingSkillClient from './MissingSkillClient';

export const metadata: Metadata = {
  title: 'Detalle de habilidad pendiente | UMSSPIRA',
};

export const instant = false;

export default async function DetalleHabilidadPage({
  params,
}: {
  params: Promise<{ id: string; indice: string }>;
}) {
  const { id, indice } = await params;
  return <MissingSkillClient id={id} indice={indice} />;
}
