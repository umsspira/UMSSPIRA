/** Casos sintéticos para el contrato de HU-10. */
export const vacancyMatchingCases = [
  { id: 'exacta', profileSkills: ['SQL', 'Python'], requiredSkills: ['SQL', 'Python'] },
  { id: 'parcial', profileSkills: ['SQL'], requiredSkills: ['SQL', 'Python'] },
  { id: 'sin-coincidencia', profileSkills: ['Diseño gráfico'], requiredSkills: ['SQL', 'Python'] },
] as const;

type CaseId = (typeof vacancyMatchingCases)[number]['id'];

/** Evalúa el orden relativo sin inventar porcentajes para el motor. */
export function matchingAccuracy(percentages: Record<CaseId, number>): number {
  for (const { id } of vacancyMatchingCases) {
    const percentage = percentages[id];
    if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
      throw new Error(`Porcentaje inválido en el caso ${id}`);
    }
  }
  const comparisons = [
    percentages.exacta > percentages.parcial,
    percentages.parcial > percentages['sin-coincidencia'],
    percentages.exacta > percentages['sin-coincidencia'],
  ];
  return comparisons.filter(Boolean).length / comparisons.length;
}

/** CA-08 exige las tres comparaciones estrictas. */
export function passesMatchingRegression(percentages: Record<CaseId, number>): boolean {
  return matchingAccuracy(percentages) === 1;
}
