import type {
  GraduateSkills,
  RequiredJobSkill,
} from '../entities/graduate-skills.entity';
import { calculateJobPostingAffinity } from './job-posting-affinity.policy';

const graduate: GraduateSkills = {
  areaIds: ['area-software'],
  evidence: [
    'Desarrolladora con experiencia en TypeScript y análisis de datos.',
    'Certificación en seguridad informática.',
  ],
};

const requirements: RequiredJobSkill[] = [
  { areaId: 'area-software', name: 'Desarrollo de software' },
  { areaId: 'area-data', name: 'Análisis de datos' },
  { areaId: 'area-security', name: 'Seguridad informática' },
  { areaId: 'area-design', name: 'Diseño UX' },
];

describe('calculateJobPostingAffinity', () => {
  it('calculates the matched share of distinct required skills', () => {
    expect(calculateJobPostingAffinity(graduate, requirements)).toBe(75);
  });

  it('matches phrases without accents or letter-case differences', () => {
    expect(
      calculateJobPostingAffinity(
        { areaIds: [], evidence: ['Experiencia en ANALISIS DE DATOS'] },
        [{ areaId: 'area-data', name: 'Análisis de datos' }],
      ),
    ).toBe(100);
  });

  it('does not match partial words', () => {
    expect(
      calculateJobPostingAffinity(
        { areaIds: [], evidence: ['Desarrollo con JavaScript'] },
        [{ areaId: 'area-java', name: 'Java' }],
      ),
    ).toBe(0);
  });

  it('counts an explicitly selected profile area as matching skill evidence', () => {
    expect(
      calculateJobPostingAffinity(
        { areaIds: ['area-software'], evidence: [] },
        [{ areaId: 'area-software', name: 'Desarrollo de software' }],
      ),
    ).toBe(100);
  });

  it('returns no score when no graduate profile or skill requirements exist', () => {
    expect(calculateJobPostingAffinity(null, requirements)).toBeNull();
    expect(calculateJobPostingAffinity(graduate, [])).toBeNull();
  });

  it('returns zero when requirements exist but the profile has no matching evidence', () => {
    expect(
      calculateJobPostingAffinity(
        { areaIds: [], evidence: [] },
        [{ areaId: 'area-software', name: 'Desarrollo de software' }],
      ),
    ).toBe(0);
  });
});
