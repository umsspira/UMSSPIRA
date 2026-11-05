export interface RadarAreaPercentage {
  areaId: string;
  percentage: number;
}

export function calculateJobAffinity(
  requiredAreaIds: readonly (string | null | undefined)[],
  radarAreas: readonly RadarAreaPercentage[] | null,
): number | null {
  const requiredAreas = Array.from(new Set(requiredAreaIds.filter((areaId): areaId is string => Boolean(areaId))));
  if (requiredAreas.length === 0 || radarAreas === null) {
    return null;
  }

  const percentageByArea = new Map(
    radarAreas.map(({ areaId, percentage }) => [
      areaId,
      Number.isFinite(percentage) ? Math.min(100, Math.max(0, percentage)) : 0,
    ]),
  );
  const average = requiredAreas.reduce((sum, areaId) => sum + (percentageByArea.get(areaId) ?? 0), 0)
    / requiredAreas.length;

  return Math.round((average + Number.EPSILON) * 100) / 100;
}
