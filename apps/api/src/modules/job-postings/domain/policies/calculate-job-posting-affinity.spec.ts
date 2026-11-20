import { calculateJobPostingAffinity } from './calculate-job-posting-affinity';

const date = '2026-11-20T12:00:00.000Z';

describe('HU10: política base de afinidad laboral', () => {
  it.each([
    [[], 0],
    [['Python'], 0],
    [['Java'], 33],
    [['Java', 'SQL'], 67],
    [['Java', 'SQL', 'Docker'], 100],
  ])('calcula con habilidades %j: %i %% entero', (skills, expected) => {
    expect(calculateJobPostingAffinity(['Java', 'SQL', 'Docker'], skills, date)).toMatchObject({
      status: 'ready',
      percentage: expected,
      calculatedAt: date,
    });
  });

  it('normaliza tildes, mayúsculas y espacios sin alterar la evidencia', () => {
    expect(
      calculateJobPostingAffinity(['  Gestión   de TI '], ['gestión de ti'], date),
    ).toMatchObject({
      percentage: 100,
      comparison: [
        {
          requirement: 'Gestión   de TI',
          matchedSkill: 'gestión de ti',
          result: 'exact',
        },
      ],
    });
  });

  it('cuenta una vez cada requisito normalizado y no premia repeticiones del perfil', () => {
    const result = calculateJobPostingAffinity(
      ['Java', ' JAVA ', 'SQL', ''],
      ['Java', 'Java', 'Java'],
      date,
    );
    expect(result.percentage).toBe(50);
    expect(result.comparison).toHaveLength(2);
    expect(result.comparison[1]).toEqual({
      requirement: 'SQL',
      matchedSkill: null,
      result: 'not-found',
    });
  });

  it.each([[], [' ', '\t']])('sin requisitos %j no inventa 0 %% ni fecha', (requirements) => {
    expect(calculateJobPostingAffinity(requirements, ['Java'], date)).toEqual({
      status: 'no-requirements',
      percentage: null,
      calculatedAt: null,
      comparison: [],
    });
  });

  it('no confunde Java con JavaScript, SQL con NoSQL ni C con C++', () => {
    expect(
      calculateJobPostingAffinity(['Java', 'SQL', 'C'], ['JavaScript', 'NoSQL', 'C++'], date)
        .percentage,
    ).toBe(0);
    expect(calculateJobPostingAffinity(['JavaScript'], ['Java'], date).percentage).toBe(0);
  });

  it('preserva puntuación significativa y habilidades de varias palabras', () => {
    expect(
      calculateJobPostingAffinity(
        ['C++', 'C#', 'Node.js', 'Machine Learning'],
        ['c++', 'c#', 'node.js', 'machine learning'],
        date,
      ).percentage,
    ).toBe(100);
    expect(
      calculateJobPostingAffinity(['Machine Learning'], ['Machine', 'Learning'], date).percentage,
    ).toBe(0);
  });

  it('no modifica entradas', () => {
    const requirements = Object.freeze(['Java', 'SQL']);
    const skills = Object.freeze(['Java']);
    expect(calculateJobPostingAffinity(requirements, skills, date).percentage).toBe(50);
  });
});
