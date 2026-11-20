import { matchingAccuracy, passesMatchingRegression } from './integration/support/vacancy-matching-cases';

describe('HU-E5-17 · evaluación del corpus de afinidad', () => {
  it('cuenta las tres relaciones de orden y penaliza empates', () => {
    expect(matchingAccuracy({ exacta: 90, parcial: 40, 'sin-coincidencia': 0 })).toBe(1);
    expect(matchingAccuracy({ exacta: 40, parcial: 40, 'sin-coincidencia': 0 })).toBeCloseTo(2 / 3);
  });

  it('acepta solo tres aciertos, sin empates ni inversiones', () => {
    expect(passesMatchingRegression({ exacta: 90, parcial: 45, 'sin-coincidencia': 10 })).toBe(true);
    expect(passesMatchingRegression({ exacta: 90, parcial: 10, 'sin-coincidencia': 10 })).toBe(false);
    expect(passesMatchingRegression({ exacta: 45, parcial: 90, 'sin-coincidencia': 10 })).toBe(false);
  });

  it.each([NaN, Infinity, -1, 101])('rechaza el porcentaje inválido %s', percentage => {
    expect(() => matchingAccuracy({ exacta: percentage, parcial: 40, 'sin-coincidencia': 0 })).toThrow();
  });
});
