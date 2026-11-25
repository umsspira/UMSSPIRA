import { KeywordExtractorService } from '../../../nlp/application/services/keyword-extractor.service';
import { calculateJobPostingAffinity } from './calculate-job-posting-affinity';
import { buildProfileIndex } from './requirement-similarity';

const date = '2026-11-20T12:00:00.000Z';

const extractor = new KeywordExtractorService();
extractor.loadDictionary([
  { canonical: 'javascript', aliases: ['js'] },
  { canonical: 'postgresql', aliases: ['postgres'] },
  { canonical: 'react', aliases: ['reactjs'] },
  { canonical: 'docker', aliases: [] },
  { canonical: 'kubernetes', aliases: ['k8s'] },
]);

function calculate(requirements: readonly string[], profileTexts: readonly string[]) {
  return calculateJobPostingAffinity(requirements, buildProfileIndex(profileTexts, extractor), extractor, date);
}

describe('Motor de matching con la similitud de la HU-11', () => {
  it('los requisitos pasan por los alias del diccionario: JS y Postgres cumplen al 100 %', () => {
    expect(calculate(['JS', 'Postgres'], ['JavaScript', 'PostgreSQL'])).toMatchObject({
      status: 'ready',
      percentage: 100,
      comparison: [
        { requirement: 'JS', matchedSkill: 'javascript', result: 'exact' },
        { requirement: 'Postgres', matchedSkill: 'postgresql', result: 'exact' },
      ],
    });
  });

  it('una coincidencia parcial suma el 50 % y se marca como similar', () => {
    const result = calculate(['React Native', 'Docker'], ['Aplicaciones con React', 'Docker']);

    expect(result.percentage).toBe(75);
    expect(result.comparison).toEqual([
      { requirement: 'React Native', matchedSkill: 'react', result: 'similar' },
      { requirement: 'Docker', matchedSkill: 'docker', result: 'exact' },
    ]);
  });

  it('requisitos fuera del diccionario se comparan por raíces', () => {
    expect(calculate(['Bases de datos relacionales'], ['Diseño de base de datos relacional']).comparison[0]).toMatchObject({
      result: 'exact',
    });
  });

  it('el porcentaje sigue siendo entero como exige el contrato compartido', () => {
    const result = calculate(['React Native', 'Docker', 'Kubernetes'], ['React', 'k8s']);

    // (0,5 + 0 + 1) / 3 = 50 %
    expect(result.percentage).toBe(50);
    expect(Number.isInteger(result.percentage)).toBe(true);
  });
});
