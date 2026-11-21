import { KeywordExtractorService } from '../../../nlp/application/services/keyword-extractor.service';
import { calculateJobPostingAffinity } from './calculate-job-posting-affinity';
import { buildProfileIndex } from './requirement-similarity';

const date = '2026-11-20T12:00:00.000Z';

const extractor = new KeywordExtractorService();
extractor.loadDictionary([
  { canonical: 'java', aliases: [] },
  { canonical: 'javascript', aliases: ['js'] },
  { canonical: 'sql', aliases: [] },
  { canonical: 'nosql', aliases: [] },
  { canonical: 'docker', aliases: [] },
  { canonical: 'c++', aliases: [] },
  { canonical: 'c#', aliases: [] },
  { canonical: 'node.js', aliases: ['node'] },
  { canonical: 'machine learning', aliases: ['ml'] },
  { canonical: 'gestion de ti', aliases: [] },
]);

function calculate(requirements: readonly string[], profileTexts: readonly string[]) {
  return calculateJobPostingAffinity(requirements, buildProfileIndex(profileTexts, extractor), extractor, date);
}

describe('HU10 + HU11: política de afinidad laboral', () => {
  it.each([
    [[], 0],
    [['Python'], 0],
    [['Java'], 33],
    [['Java', 'SQL'], 67],
    [['Java', 'SQL', 'Docker'], 100],
  ])('calcula con el perfil %j: %i %% entero', (profileTexts, expected) => {
    expect(calculate(['Java', 'SQL', 'Docker'], profileTexts)).toMatchObject({
      status: 'ready',
      percentage: expected,
      calculatedAt: date,
    });
  });

  it('normaliza tildes, mayúsculas y espacios sin alterar el texto del requisito', () => {
    expect(calculate(['  Gestión   de TI '], ['gestión de ti'])).toMatchObject({
      percentage: 100,
      comparison: [{ requirement: 'Gestión   de TI', matchedSkill: 'gestion de ti', result: 'exact' }],
    });
  });

  it('cuenta una vez cada requisito normalizado y no premia repeticiones del perfil', () => {
    const result = calculate(['Java', ' JAVA ', 'SQL', ''], ['Java', 'Java', 'Java']);
    expect(result.percentage).toBe(50);
    expect(result.comparison).toHaveLength(2);
    expect(result.comparison[1]).toEqual({ requirement: 'SQL', matchedSkill: null, result: 'not-found' });
  });

  it.each([{ requirements: [] }, { requirements: [' ', '\t'] }])(
    'sin requisitos $requirements no inventa porcentaje ni fecha',
    ({ requirements }) => {
      expect(calculate(requirements, ['Java'])).toEqual({
        status: 'no-requirements',
        percentage: null,
        calculatedAt: null,
        comparison: [],
      });
    },
  );

  it('no confunde Java con JavaScript, SQL con NoSQL ni C con C++', () => {
    expect(calculate(['Java', 'SQL', 'C'], ['JavaScript', 'NoSQL', 'C++']).percentage).toBe(0);
    expect(calculate(['JavaScript'], ['Java']).percentage).toBe(0);
  });

  it('preserva puntuación significativa y habilidades de varias palabras', () => {
    expect(calculate(['C++', 'C#', 'Node.js', 'Machine Learning'], ['c++', 'c#', 'node.js', 'machine learning']).percentage).toBe(100);
    expect(calculate(['Machine Learning'], ['Machine', 'Learning']).percentage).toBe(0);
  });

  it('no modifica entradas', () => {
    const requirements = Object.freeze(['Java', 'SQL']);
    const profileTexts = Object.freeze(['Java']);
    expect(calculate(requirements, profileTexts).percentage).toBe(50);
  });
});
