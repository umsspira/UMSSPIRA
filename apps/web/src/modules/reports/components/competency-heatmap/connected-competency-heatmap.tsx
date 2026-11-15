'use client';

import { CompetencyHeatmap } from './competency-heatmap';
import type { HeatmapLoader } from './heatmap.types';
import { useCompetencyHeatmap } from '../../hooks/use-competency-heatmap';

interface Props {
  careerName: string;
  /** Debe ser estable (useMemo / definicion de modulo) para evitar recreaciones. */
  load: HeatmapLoader;
}

/** Componente listo para HU-001: integra carga, sesión y render, sin URL fija. */
export function ConnectedCompetencyHeatmap({ careerName, load }: Props) {
  const state = useCompetencyHeatmap(load);
  return (
    <CompetencyHeatmap
      careerName={careerName}
      data={state.data}
      error={state.error}
      loading={state.loading}
      onRefresh={state.refresh}
    />
  );
}
