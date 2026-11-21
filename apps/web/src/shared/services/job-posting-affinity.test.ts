import type { MentorOnboardingResponse } from '@umsspira/shared-types';
import { getMentorOnboarding, getMyTechnicalInterests } from '@/features/mentorship/services/mentor-onboarding-api';
import { calculateVacancyAffinity, calculateVacancyAffinityWithSkills, loadTituladoSkills } from './job-posting-affinity';

jest.mock('@/features/mentorship/services/mentor-onboarding-api', () => ({
  getMentorOnboarding: jest.fn(),
  getMyTechnicalInterests: jest.fn(),
  MentorOnboardingError: class MentorOnboardingError extends Error {
    constructor(message: string, public status: number) { super(message); }
  },
}));

const onboarding = {
  isComplete: true,
  currentStep: 3 as const,
  totalSteps: 3,
  completedSteps: [1, 2, 3],
  steps: [],
  areas: { catalog: [], selectedIds: [], intereses: [{ id_area: 'area-1', nombre: 'React Native' }] },
  interests: { selectedIds: [], catalog: [] },
  availability: { availabilityStatus: null, schedules: [] },
} satisfies MentorOnboardingResponse;

const readOnboarding = jest.mocked(getMentorOnboarding);
const readCustomInterests = jest.mocked(getMyTechnicalInterests);

describe('afinidad de vacantes con tópicos de mentoría', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    readOnboarding.mockResolvedValue(onboarding);
    readCustomInterests.mockResolvedValue(['Spring Boot']);
  });

  it('lee intereses seleccionados y temas personalizados del perfil de mentoría', async () => {
    await expect(loadTituladoSkills()).resolves.toEqual({
      status: 'ready',
      skills: ['React Native', 'Spring Boot'],
    });
  });

  it('aplica comparación por palabras, la excepción JavaScript y porcentaje por requisito único', () => {
    const result = calculateVacancyAffinityWithSkills([
      { id: '1', nombre: 'Java' },
      { id: '2', nombre: 'React' },
      { id: '3', nombre: 'PostgreSQL' },
      { id: '4', nombre: 'TypeScript' },
      { id: '5', nombre: 'SQL' },
      { id: '6', nombre: 'Java Script' },
      { id: '7', nombre: 'Spring Boot' },
      { id: '8', nombre: 'java' },
    ], ['JavaScript', 'React Native', 'PostgreSQL avanzado', 'typescript', 'NoSQL', 'Spring Boot avanzado']);

    expect(result).toMatchObject({ status: 'ready', percentage: 71 });
    if (result.status === 'ready') {
      expect(result.comparison.map((item) => item.result)).toEqual([
        'similar', 'similar', 'similar', 'exact', 'not-found', 'not-found', 'similar',
      ]);
    }
  });

  it('no calcula si la vacante no tiene requisitos y da 0% si el perfil no tiene tópicos', async () => {
    await expect(calculateVacancyAffinity([])).resolves.toEqual({ status: 'insufficient-requirements' });
    readOnboarding.mockResolvedValue({ ...onboarding, areas: { ...onboarding.areas, intereses: [] } });
    readCustomInterests.mockResolvedValue([]);
    await expect(loadTituladoSkills()).resolves.toEqual({ status: 'ready', skills: [] });
    expect(calculateVacancyAffinityWithSkills([{ id: '1', nombre: 'React' }], [])).toMatchObject({ status: 'ready', percentage: 0 });
  });
});
