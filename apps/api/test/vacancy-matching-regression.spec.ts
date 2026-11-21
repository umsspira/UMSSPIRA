import { calculateJobPostingAffinity } from '../src/modules/job-postings/domain/policies/calculate-job-posting-affinity';
import { passesMatchingRegression, vacancyMatchingCases } from './integration/support/vacancy-matching-cases';

type CaseId = (typeof vacancyMatchingCases)[number]['id'];

const CALCULATED_AT = '2026-11-20T12:00:00.000Z';

/** Aplica la regla real de HU-10 a un caso sintético, sin base de datos ni NLP. */
function evaluateCase(id: CaseId) {
  const found = vacancyMatchingCases.find((item) => item.id === id);
  if (!found) {
    throw new Error(`Caso sintético inexistente: ${id}`);
  }
  return calculateJobPostingAffinity(found.requiredSkills, found.profileSkills, CALCULATED_AT);
}

function readPercentages(): Record<CaseId, number> {
  const percentages = {} as Record<CaseId, number>;
  for (const { id } of vacancyMatchingCases) {
    const { percentage } = evaluateCase(id);
    if (percentage === null) {
      throw new Error(`El motor no devolvió porcentaje para el caso ${id}`);
    }
    percentages[id] = percentage;
  }
  return percentages;
}

// Cubre solo la regla de cálculo (cumplidos sobre total). La extracción NLP del perfil y
// el endpoint por lote se verifican en la prueba de integración con PostgreSQL (CA-07).
describe('HU-E5-17 · regresión de afinidad con el motor real de HU-10 (CA-08)', () => {
  it('devuelve 100, 50 y 0 por ciento para los tres pares sintéticos', () => {
    expect(readPercentages()).toEqual({ exacta: 100, parcial: 50, 'sin-coincidencia': 0 });
  });

  it('marca cada requisito como exacto o no encontrado según el perfil', () => {
    expect(evaluateCase('exacta').comparison.map((item) => item.result)).toEqual(['exact', 'exact']);
    expect(evaluateCase('parcial').comparison).toEqual([
      { requirement: 'SQL', matchedSkill: 'SQL', result: 'exact' },
      { requirement: 'Python', matchedSkill: null, result: 'not-found' },
    ]);
    expect(evaluateCase('sin-coincidencia').comparison.map((item) => item.result)).toEqual([
      'not-found',
      'not-found',
    ]);
  });

  it('cumple las tres comparaciones estrictas: exacta > parcial > sin coincidencia', () => {
    const percentages = readPercentages();

    expect(percentages.exacta).toBeGreaterThan(percentages.parcial);
    expect(percentages.parcial).toBeGreaterThan(percentages['sin-coincidencia']);
    expect(percentages.exacta).toBeGreaterThan(percentages['sin-coincidencia']);
    expect(passesMatchingRegression(percentages)).toBe(true);
  });
});
