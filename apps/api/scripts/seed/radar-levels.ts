/**
 * Niveles de los cálculos de radar de QA: cantidad de keywords y frecuencia. Con el catálogo
 * real dan promedios cercanos a 10 %, 30 %, 50 %, 65 % y 85 %, así el mapa de calor muestra
 * una celda en cada tramo de 20 % (HU-002 CA-02). El nivel depende de la cohorte y del área.
 */
export const RADAR_LEVELS: ReadonlyArray<readonly [number, number]> = [
  [1, 1],
  [3, 1],
  [5, 1],
  [3, 2],
  [4, 2],
];

export function radarLevel(
  cohort: number | null | undefined,
  areaIndex: number,
): readonly [number, number] {
  const level = ((cohort ?? 0) + areaIndex * 2) % RADAR_LEVELS.length;
  return RADAR_LEVELS[level] ?? [1, 1];
}
