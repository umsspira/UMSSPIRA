import { KeywordExtractorService } from '../../../nlp/application/services/keyword-extractor.service';
import type { KeywordExtractor } from '../../domain/policies/requirement-similarity';
import type { JobPostingAffinityProfile } from '../ports/job-posting-affinity-data.port';
import { CalculateJobPostingAffinity } from './calculate-job-posting-affinity.use-case';

const profile: JobPostingAffinityProfile = {
  userId: 'user',
  tituladoId: 'graduate',
  texts: ['Experiencia con Java', 'Consultas SQL'],
  description: 'Backend',
  hasEducation: true,
  hasExperience: true,
  hasCertification: true,
  hasProject: true,
};
const date = new Date('2026-11-20T12:00:00.000Z');

const nlp = new KeywordExtractorService();
nlp.loadDictionary([
  { canonical: 'java', aliases: [] },
  { canonical: 'sql', aliases: [] },
  { canonical: 'docker', aliases: [] },
  { canonical: 'python', aliases: [] },
]);

describe('HU10: caso de uso CalculateJobPostingAffinity', () => {
  const extractor = { loadExtractor: jest.fn<Promise<KeywordExtractor>, []>() };
  const clock = jest.fn(() => date);
  let useCase: CalculateJobPostingAffinity;
  let extract: jest.SpyInstance;

  beforeEach(() => {
    extractor.loadExtractor.mockReset().mockResolvedValue(nlp);
    extract = jest.spyOn(nlp, 'extract');
    extract.mockClear();
    clock.mockClear();
    useCase = new CalculateJobPostingAffinity(extractor, clock);
  });

  afterEach(() => extract.mockRestore());

  it('un diccionario y un perfil procesado sirven para N vacantes y conservan orden y fecha común', async () => {
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
    expect(extractor.loadExtractor).toHaveBeenCalledTimes(1);
    // El perfil se extrae una sola vez, campo por campo (Java y SQL), no por cada vacante
    expect(extract.mock.calls.filter(([text]) => profile.texts.includes(text as string))).toHaveLength(2);
    expect(clock).toHaveBeenCalledTimes(1);
  });

  it('un perfil completo sin habilidades obtiene 0 %, no profile-incomplete', async () => {
    const [item] = await useCase.execute({
      profile: { ...profile, texts: ['Atención al cliente'] },
      vacancies: [{ vacancyId: 'v', requirements: ['Java'] }],
    });
    expect(item.result).toMatchObject({ status: 'ready', percentage: 0 });
  });

  it.each([null, { ...profile, hasProject: false }])(
    'no carga el diccionario ni fecha un perfil incompleto',
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
      expect(extractor.loadExtractor).not.toHaveBeenCalled();
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
    expect(extractor.loadExtractor).not.toHaveBeenCalled();
  });

  it('acepta lista vacía sin diccionario ni fecha', async () => {
    await expect(useCase.execute({ profile, vacancies: [] })).resolves.toEqual([]);
    expect(extractor.loadExtractor).not.toHaveBeenCalled();
    expect(clock).not.toHaveBeenCalled();
  });

  it('propaga el fallo sin resultado parcial ni porcentaje inventado', async () => {
    const failure = new Error('Motor no disponible');
    extractor.loadExtractor.mockRejectedValue(failure);
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

  it('recalcula en otra operación; no reutiliza un perfil procesado antes', async () => {
    const vacancies = [{ vacancyId: 'v', requirements: ['Java'] }];
    await useCase.execute({ profile, vacancies });
    const [item] = await useCase.execute({ profile: { ...profile, texts: ['Python'] }, vacancies });
    expect(item.result.percentage).toBe(0);
    expect(extractor.loadExtractor).toHaveBeenCalledTimes(2);
  });
});
