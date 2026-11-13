
export interface MiniAffinityResult {
  // "empty" cuando el perfil no tiene datos suficientes para calcular
  status: 'ok' | 'empty';
  // 6 porcentajes (0 a 100) en el orden de AFFINITY_AREAS
  values: number[];
}


export const SAMPLE_VALUES = [82, 64, 51, 45, 38, 30];

const SAMPLE_DELAY_MS = 600;

export async function fetchMiniAffinity(): Promise<MiniAffinityResult> {
  await new Promise((resolve) => setTimeout(resolve, SAMPLE_DELAY_MS));
  return { status: 'ok', values: SAMPLE_VALUES };
}