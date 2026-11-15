import type {
  AffinityArea,
  AffinityAreaScore,
  AffinityVectorResponse,
  RadarCertificationEvidenceResponse,
} from '@umsspira/shared-types';

import {
  AFFINITY_AREAS,
  RADAR_AREA_IDS,
} from '@umsspira/shared-types/src/affinity';

import { ApiError, apiFetch } from './api-client';

export interface AffinityAreaVector extends AffinityAreaScore {
  keywords: string[];
  evidence: never[];
}

export interface AffinityVectorResult
  extends Omit<AffinityVectorResponse, 'areas'> {
  areas: AffinityAreaVector[];
}

const AREA_BY_ID = Object.fromEntries(
  Object.entries(RADAR_AREA_IDS).map(([area, id]) => [id, area]),
) as Record<string, AffinityArea>;

const AFFINITY_ENDPOINT = '/api/v1/radar';
const RADAR_RECALCULATE_ENDPOINT = '/api/v1/radar/recalculate';

function normalizeArea(area: string): AffinityArea | undefined {
  if (AFFINITY_AREAS.includes(area as AffinityArea)) {
    return area as AffinityArea;
  }

  return AREA_BY_ID[area];
}

function adaptRadarResponse(
  response: AffinityVectorResponse,
): AffinityVectorResult {
  const areas = response.areas
    .flatMap((area) => {
      const normalizedArea = normalizeArea(area.area);

      if (!normalizedArea) {
        return [];
      }

      const topKeywords = area.topKeywords ?? [];

      return [{
        ...area,
        area: normalizedArea,
        previousAffinity: area.previousAffinity ?? null,
        weighting: area.weighting ?? null,
        topKeywords,
        explanation: area.explanation ?? null,
        keywords: topKeywords.map(({ keyword }) => keyword),
        evidence: [],
      }];
    })
    .sort(
      (a, b) =>
        AFFINITY_AREAS.indexOf(a.area) -
        AFFINITY_AREAS.indexOf(b.area),
    );

  return {
    ...response,
    areas,
  };
}

export const RECALCULATE_TIMEOUT_MS = 7000;

// Los datos simulados solo se permiten en pruebas automatizadas. Cualquier
// build de Next (desarrollo o producción) usa siempre los endpoints reales.
const USE_AFFINITY_MOCK =
  process.env.NODE_ENV === 'test' &&
  process.env.NEXT_PUBLIC_USE_AFFINITY_MOCK === 'true';

let snapshotIndex = 0;

export interface AffinityAxisConfig {
  area: AffinityArea;
  weight: number | null;
}

export interface AffinityConfigPayload {
  axes: AffinityAxisConfig[];
}

function orderConfigAxes(
  payload: AffinityConfigPayload,
): AffinityConfigPayload {
  const positionByArea = new Map<string, number>(
    AFFINITY_AREAS.map((area, index) => [area, index]),
  );

  const axes = payload.axes
    .filter((axis) => positionByArea.has(axis.area))
    .sort(
      (a, b) =>
        (positionByArea.get(a.area) ?? 0) -
        (positionByArea.get(b.area) ?? 0),
    );

  return { axes };
}

// Los mocks se importan dinámicamente para que el flag apagado no los cargue en producción.
async function loadAffinityVectorMock(): Promise<AffinityVectorResult> {
  const { default: mock } = await import('../mocks/affinity-vector-mock.json');
  return mock as unknown as AffinityVectorResult;
}

async function loadAffinityConfigMock(): Promise<AffinityConfigPayload> {
  const { default: mock } = await import('../mocks/affinity-config-mock.json');
  return mock as AffinityConfigPayload;
}

async function loadAffinitySnapshotsMock(): Promise<AffinityVectorResult[]> {
  const { default: mock } = await import('../mocks/affinity-snapshots-mock.json');
  return mock as unknown as AffinityVectorResult[];
}

export async function getAffinityVector(): Promise<AffinityVectorResult> {
  if (USE_AFFINITY_MOCK) {
    return loadAffinityVectorMock();
  }

  const response = await requestRadar(AFFINITY_ENDPOINT);

  return adaptRadarResponse(response);
}

export async function calculateAffinityVector(): Promise<AffinityVectorResult> {
  if (USE_AFFINITY_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return {
      ...(await loadAffinityVectorMock()),
      calculatedAt: new Date().toISOString(),
    };
  }

  return recalculateAffinity();
}

export async function getAffinityConfig(): Promise<AffinityConfigPayload> {
  const payload = USE_AFFINITY_MOCK
    ? await loadAffinityConfigMock()
    : {
        axes: (await getAffinityVector()).areas.map(({ area, weighting }) => ({
          area,
          weight: weighting ?? null,
        })),
      };

  return orderConfigAxes(payload);
}

export async function recalculateAffinity(): Promise<AffinityVectorResult> {
  if (USE_AFFINITY_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const snapshots = await loadAffinitySnapshotsMock();
    const snapshot = snapshots[snapshotIndex];

    snapshotIndex = (snapshotIndex + 1) % snapshots.length;

    return {
      ...snapshot,
      calculatedAt: new Date().toISOString(),
    };
  }

  return adaptRadarResponse(
    await requestRadar(RADAR_RECALCULATE_ENDPOINT, { method: 'POST' }),
  );
}

// El límite incluye autenticación, respuesta y lectura del cuerpo.
async function requestRadar<T = AffinityVectorResponse>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_resolve, reject) => {
    timeoutId = setTimeout(() => {
      controller.abort();
      reject(new Error('No se pudo actualizar tu radar'));
    }, RECALCULATE_TIMEOUT_MS);
  });

  try {
    return await Promise.race([
      apiFetch<T>(endpoint, { ...options, signal: controller.signal }),
      timeout,
    ]);
  } catch (error) {
    if (controller.signal.aborted ||
      (error instanceof ApiError && error.status === 0)) {
      throw new Error('No se pudo actualizar tu radar');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId!);
  }
}


export async function getAreaCertifications(area: AffinityArea): Promise<RadarCertificationEvidenceResponse> {
  const result = await requestRadar<RadarCertificationEvidenceResponse>(`/api/v1/radar/certifications/${encodeURIComponent(area)}`);
  if (result.area !== area || result.source !== 'current-profile' || !Array.isArray(result.certifications)) {
    throw new Error('Respuesta de certificaciones no válida');
  }
  return result;
}
