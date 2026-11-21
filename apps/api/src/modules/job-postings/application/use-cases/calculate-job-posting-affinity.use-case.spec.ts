import type { JobPostingAffinityProfile } from '../ports/job-posting-affinity-data.port';
import { CalculateJobPostingAffinity } from './calculate-job-posting-affinity.use-case';

const profile: JobPostingAffinityProfile = {
  userId: 'user',
  tituladoId: 'graduate',
  texts: ['Java', 'SQL'],
  description: 'Backend',
  hasEducation: true,
  hasExperience: true,
  hasCertification: true,
  hasProject: true,
};
const date = new Date('2026-11-20T12:00:00.000Z');

describe('HU10: caso de uso CalculateJobPostingAffinity', () => {
  const extractor = { extractSkills: jest.fn<Promise<string[]>, [readonly string[]]>() };
  const clock = jest.fn(() => date);
  let useCase: CalculateJobPostingAffinity;

  beforeEach(() => {
    extractor.extractSkills.mockReset().mockResolvedValue(['java', 'sql']);
    clock.mockClear();
    useCase = new CalculateJobPostingAffinity(extractor, clock);
  });

  it('una extracción sirve para N vacantes y conserva orden y fecha común', async () => {
    const results = await useCase.execute({
      profile,
      vacancies: [
        { vacancyId: 'v3', requirements: ['Java', 'SQL', 'Docker'] },
        { vacancyId: 'v1', requirements: ['Python'] },
        { vacancyId: 'v2', requirements: ['Java'] },
      ],
    });
    expect(results.map((item) => item.vacancyId)).toEqual(['v3', 'v1', 'v2']);
    expect(results.map((item) => item.result.percentage)).toEqual([67, 0, 100]);
    expect(results.every((item) => item.result.calculatedAt === date.toISOString())).toBe(true);
    expect(extractor.extractSkills).toHaveBeenCalledTimes(1);
    expect(extractor.extractSkills).toHaveBeenCalledWith(profile.texts);
    expect(clock).toHaveBeenCalledTimes(1);
  });

  it('un perfil completo sin habilidades obtiene 0 %, no profile-incomplete', async () => {
    extractor.extractSkills.mockResolvedValue([]);
    const [item] = await useCase.execute({
      profile,
      vacancies: [{ vacancyId: 'v', requirements: ['Java'] }],
    });
    expect(item.result).toMatchObject({ status: 'ready', percentage: 0 });
  });

  it.each([null, { ...profile, hasProject: false }])(
    'no extrae ni fecha un perfil incompleto',
    async (incomplete) => {
      const [item] = await useCase.execute({
        profile: incomplete,
        vacancies: [{ vacancyId: 'v', requirements: ['Java'] }],
      });
      expect(item.result).toEqual({
        status: 'profile-incomplete',
        percentage: null,
        calculatedAt: null,
        comparison: [],
      });
      expect(extractor.extractSkills).not.toHaveBeenCalled();
      expect(clock).not.toHaveBeenCalled();
    },
  );

  it('sin requisitos prima sobre perfil incompleto y no requiere diccionario', async () => {
    const [item] = await useCase.execute({
      profile: null,
      vacancies: [{ vacancyId: 'v', requirements: ['  '] }],
    });
    expect(item.result).toEqual({
      status: 'no-requirements',
      percentage: null,
      calculatedAt: null,
      comparison: [],
    });
    expect(extractor.extractSkills).not.toHaveBeenCalled();
  });

  it('acepta lista vacía sin extracción ni fecha', async () => {
    await expect(useCase.execute({ profile, vacancies: [] })).resolves.toEqual([]);
    expect(extractor.extractSkills).not.toHaveBeenCalled();
    expect(clock).not.toHaveBeenCalled();
  });

  it('propaga el fallo sin resultado parcial ni porcentaje inventado', async () => {
    const failure = new Error('Motor no disponible');
    extractor.extractSkills.mockRejectedValue(failure);
    await expect(
      useCase.execute({
        profile,
        vacancies: [
          { vacancyId: 'v1', requirements: [] },
          { vacancyId: 'v2', requirements: ['Java'] },
        ],
      }),
    ).rejects.toBe(failure);
    expect(clock).not.toHaveBeenCalled();
  });

  it('recalcula en otra operación; no reutiliza habilidades obsoletas', async () => {
    const input = { profile, vacancies: [{ vacancyId: 'v', requirements: ['Java'] }] };
    await useCase.execute(input);
    extractor.extractSkills.mockResolvedValue(['python']);
    const [item] = await useCase.execute(input);
    expect(item.result.percentage).toBe(0);
    expect(extractor.extractSkills).toHaveBeenCalledTimes(2);
  });
});
