import { KeywordExtractorService } from '../../../nlp/application/services/keyword-extractor.service';

import {
  ALGORITHM_VERSION,
  MATCH_WEIGHTS,
  compareRequirements,
} from './requirement-similarity';

const extractor = new KeywordExtractorService();
extractor.loadDictionary([
  { canonical: 'javascript', aliases: ['js'] },
  { canonical: 'postgresql', aliases: ['postgres'] },
  { canonical: 'react', aliases: ['reactjs'] },
  { canonical: 'spring boot', aliases: [] },
  { canonical: 'docker', aliases: [] },
]);

describe('compareRequirements (HU-11)', () => {
  it('la coincidencia exacta suma el 100 % y pasa por los alias del diccionario', () => {
    const outcome = compareRequirements(['JS', 'Postgres'], ['JavaScript y PostgreSQL'], extractor);

    expect(outcome.percentage).toBe(100);
    expect(outcome.comparison).toEqual([
      { requirement: 'JS', matchedSkill: 'javascript', result: 'exact', weight: 1 },
      { requirement: 'Postgres', matchedSkill: 'postgresql', result: 'exact', weight: 1 },
    ]);
  });

  it('la coincidencia parcial suma un peso menor y se distingue en comparison[]', () => {
    const outcome = compareRequirements(['React Native'], ['Desarrollo con React'], extractor);

    expect(outcome.comparison[0]).toMatchObject({ result: 'similar', matchedSkill: 'react' });
    expect(outcome.percentage).toBe(MATCH_WEIGHTS.similar * 100);
  });

  it('requisitos fuera del diccionario se comparan por raíces, no por substring', () => {
    const outcome = compareRequirements(
      ['Bases de datos relacionales', 'Java'],
      ['Diseño de base de datos relacional', 'Programación en JavaScript'],
      extractor,
    );

    expect(outcome.comparison.map(({ result }) => result)).toEqual(['exact', 'not-found']);
    expect(outcome.percentage).toBe(50);
  });

  it('cobertura parcial: la mitad de las palabras del requisito aparece en un mismo texto', () => {
    const outcome = compareRequirements(['Pruebas unitarias automatizadas'], ['Hice pruebas automatizadas'], extractor);

    expect(outcome.comparison[0]).toMatchObject({ result: 'similar', matchedSkill: 'pruebas automatizadas' });
  });

  it('una canónica contenida en otra es parcial', () => {
    const outcome = compareRequirements(['Spring Boot'], ['Proyectos en Spring'], extractor);

    expect(outcome.comparison[0]?.result).toBe('similar');
  });

  it('sin coincidencias da 0 % y sin requisitos válidos no inventa porcentaje', () => {
    expect(compareRequirements(['Docker'], ['React'], extractor).percentage).toBe(0);
    expect(compareRequirements(['  ', ''], ['React'], extractor)).toEqual({
      algorithmVersion: ALGORITHM_VERSION,
      percentage: 0,
      comparison: [],
    });
  });

  it('no arma n-gramas entre campos distintos del perfil', () => {
    const outcome = compareRequirements(['Spring Boot'], ['Spring', 'Boot camp'], extractor);

    expect(outcome.comparison[0]?.result).not.toBe('exact');
  });
});
