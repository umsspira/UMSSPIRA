import { obtenerResumenPerfil } from '@/modules/profile/services/perfil-api';
import { apiFetch } from './api-client';
import { calculateVacancyAffinity, loadTituladoSkills } from './job-posting-affinity';

jest.mock('@/modules/profile/services/perfil-api', () => ({
  obtenerResumenPerfil: jest.fn(),
}));

jest.mock('./api-client', () => ({
  apiFetch: jest.fn(),
}));

const getProfile = jest.mocked(obtenerResumenPerfil);
const extractKeywords = jest.mocked(apiFetch);

const profile = {
  header: { id: 'graduate-1', name: 'Titulado', career: 'Sistemas', graduationYear: null },
  records: {
    education: [],
    experience: [],
    certification: [],
    project: [{
      id: 'project-1',
      ownerId: 'graduate-1',
      name: 'Portafolio',
      url: 'https://example.test',
      description: 'Aplicación web',
      technologies: 'React, SQL',
    }],
  },
  description: '',
};

describe('calculateVacancyAffinity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getProfile.mockResolvedValue(profile);
    extractKeywords.mockResolvedValue({
      keywords: [{ term: 'React', count: 1 }, { term: 'SQL', count: 1 }],
      unmapped: [],
    });
  });

  describe('loadTituladoSkills', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      getProfile.mockResolvedValue(profile);
      extractKeywords.mockRejectedValue(new Error('NLP no disponible'));
    });

    it('conserva las tecnologías del portafolio cuando falla el extractor NLP', async () => {
      await expect(loadTituladoSkills()).resolves.toEqual({
        status: 'ready',
        skills: ['React', 'SQL'],
      });
    });

    it('indica que falta completar el perfil cuando no hay tecnologías ni texto extraíble', async () => {
      getProfile.mockResolvedValue({
        ...profile,
        records: { ...profile.records, project: [] },
      });

      await expect(loadTituladoSkills()).resolves.toEqual({ status: 'profile-incomplete' });
    });
  });

  it('cuenta SQL dentro de PostgreSQL y React dentro de React14 como requisitos cumplidos', async () => {
    const result = await calculateVacancyAffinity([
      { id: 'r1', nombre: 'PostgresSQL' },
      { id: 'r2', nombre: 'React14' },
    ]);

    expect(result).toMatchObject({
      status: 'ready',
      percentage: 100,
      comparison: [
        { requirement: 'PostgresSQL', matchedSkill: 'SQL', result: 'similar' },
        { requirement: 'React14', matchedSkill: 'React', result: 'similar' },
      ],
    });
    expect(extractKeywords).toHaveBeenCalledWith(
      '/api/v1/nlp/extract',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('calcula el porcentaje por requisitos cumplidos y no por cantidad de habilidades', async () => {
    const result = await calculateVacancyAffinity([
      { id: 'r1', nombre: 'PostgresSQL' },
      { id: 'r2', nombre: 'React14' },
      { id: 'r3', nombre: 'Python' },
    ]);

    expect(result).toMatchObject({ status: 'ready', percentage: 67 });
  });

  it('conserva las tecnologías explícitas aunque falle el extractor NLP', async () => {
    extractKeywords.mockRejectedValue(new Error('NLP no disponible'));

    await expect(calculateVacancyAffinity([
      { id: 'r1', nombre: 'PostgresSQL' },
      { id: 'r2', nombre: 'React14' },
    ])).resolves.toMatchObject({ status: 'ready', percentage: 100 });
  });

  it('no calcula 0% cuando la oferta no tiene requisitos identificados', async () => {
    await expect(calculateVacancyAffinity([])).resolves.toEqual({
      status: 'insufficient-requirements',
    });
    expect(getProfile).not.toHaveBeenCalled();
  });

  it('solicita completar el perfil cuando no hay habilidades extraídas', async () => {
    extractKeywords.mockResolvedValue({ keywords: [], unmapped: [] });
    getProfile.mockResolvedValue({ ...profile, records: { ...profile.records, project: [] } });

    await expect(calculateVacancyAffinity([{ id: 'r1', nombre: 'React' }])).resolves.toEqual({
      status: 'profile-incomplete',
    });
  });
});
