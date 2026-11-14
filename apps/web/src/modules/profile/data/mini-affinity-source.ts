import { AFFINITY_AREAS } from '@umsspira/shared-types/src/affinity';

import { getAffinityVector } from '@/shared/services/affinity-service';
import { ApiError } from '@/shared/services/api-client';

export interface MiniAffinityResult {
  // "empty" cuando el perfil no tiene datos suficientes para calcular
  status: 'ok' | 'empty';
  // 6 porcentajes (0 a 100) en el orden de AFFINITY_AREAS, el mismo del radar de Mi afinidad
  values: number[];
  // GET /radar avisa que el perfil cambió y falta recalcular; los valores son los del último cálculo guardado
  hasPendingChanges?: boolean;
}

const EMPTY_RESULT: MiniAffinityResult = { status: 'empty', values: [], hasPendingChanges: false };

// HU-17: valores del último cálculo, desde GET /api/v1/radar (Épica 3). No pide un recálculo: con cambios
// pendientes se muestra el último resultado guardado y Mi afinidad se encarga de recalcular
export async function fetchMiniAffinity(): Promise<MiniAffinityResult> {
  try {
    const vector = await getAffinityVector();
    if (vector.status === 'empty' || vector.areas.length === 0) return EMPTY_RESULT;
    const values = AFFINITY_AREAS.map(
      (area) => vector.areas.find((item) => item.area === area)?.affinity ?? 0,
    );
    return { status: 'ok', values, hasPendingChanges: Boolean(vector.hasPendingChanges) };
  } catch (error) {
    // 404: el egresado todavía no tiene ningún cálculo, es lo mismo que no tener datos suficientes
    if (error instanceof ApiError && error.status === 404) return EMPTY_RESULT;
    throw error;
  }
}
