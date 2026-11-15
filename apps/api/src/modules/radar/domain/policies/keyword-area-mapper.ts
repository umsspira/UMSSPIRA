import { RADAR_AREA_IDS, type RadarArea } from '../entities/radar-area';
import type { KeywordMatch } from './affinity-calculator';

export interface MappedKeywordArea {
  term: string;
  area: RadarArea;
  areaId: string;
  peso: number;
}

const AREA_BY_ID = new Map<string, RadarArea>(
  Object.entries(RADAR_AREA_IDS).map(([area, id]) => [id, area as RadarArea]),
);
const AREA_ORDER = new Map(Object.keys(RADAR_AREA_IDS).map((area, index) => [area, index]));

/** Maps extracted canonical keywords to configured area weights inside Radar. */
export function mapKeywordsToRadarAreas(
  keywords: readonly KeywordMatch[],
  weightsByArea: Readonly<Record<string, readonly { term: string; peso: number }[]>>,
): MappedKeywordArea[] {
  const terms = new Set(
    keywords.map(({ term }) => term.trim().toLowerCase()).filter((term) => term.length > 0),
  );
  const mapped: MappedKeywordArea[] = [];

  for (const [areaId, weights] of Object.entries(weightsByArea)) {
    const area = AREA_BY_ID.get(areaId);

    for (const { term: rawTerm, peso } of weights) {
      const term = rawTerm.trim().toLowerCase();

      if (term.length > 0 && terms.has(term)) {
        if (!area) {
          throw new Error(`UUID de área no reconocido: ${areaId}`);
        }
        mapped.push({ term, area, areaId, peso });
      }
    }
  }

  if (mapped.length > 0) {
    return mapped.sort((left, right) => {
      const areaOrder = (AREA_ORDER.get(left.area) ?? 0) - (AREA_ORDER.get(right.area) ?? 0);
      return areaOrder || left.term.localeCompare(right.term);
    });
  }

  return mapped;
}
