import { ForbiddenException } from '@nestjs/common';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import type {
  JobPostingAffinityProfile,
  JobPostingAffinityRequirements,
} from '../ports/job-posting-affinity-data.port';
import { AffinityDictionaryUnavailableError } from '../../domain/errors/affinity-dictionary-unavailable.error';
import { CalculateJobPostingAffinityBatch } from './calculate-job-posting-affinity-batch.use-case';


const graduate: ActorContext = {
  id: 'user-graduate', email: 'graduate@example.com', name: null, role: 'titulado',
  permissions: ['perfil:self:read'], scopes: { companyIds: [], graduateId: null, careerIds: [] }, credentialVersion: 1,
};
const company: ActorContext = {
  ...graduate, id: 'user-company', role: 'empresa', permissions: ['empresas:self:read'],
};
const profile: JobPostingAffinityProfile = {
  userId: 'candidate-1', tituladoId: 'titulado-1', texts: ['Java'], description: 'Dev',
  hasEducation: true, hasExperience: true, hasCertification: true, hasProject: true,
};
const READY = { status: 'ready', percentage: 75, calculatedAt: '2026-11-20T12:00:00.000Z', comparison: [] } as const;
const noRequirements = { status: 'no-requirements', percentage: null, calculatedAt: null, comparison: [] } as const;
const VACANCY_1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const VACANCY_2 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const APPLICATION_1 = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const APPLICATION_2 = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';


describe('T10.5 batch affinity authorization and isolation', () => {
  const data = { readProfiles: jest.fn() };
  const batchData = { readPublicVacancies: jest.fn(), readCompanyVacancyApplications: jest.fn() };
  const calculate = { execute: jest.fn() };
  let useCase: CalculateJobPostingAffinityBatch;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new CalculateJobPostingAffinityBatch(data as never, batchData as never, calculate as never);
  });

  it('rechaza empresa en modo egresado antes de acceder a datos', async () => {
    await expect(useCase.execute(company, { mode: 'vacancies', vacancyIds: [VACANCY_1] })).rejects.toBeInstanceOf(ForbiddenException);
    expect(batchData.readPublicVacancies).not.toHaveBeenCalled();
    expect(data.readProfiles).not.toHaveBeenCalled();
    expect(calculate.execute).not.toHaveBeenCalled();
  });

  it('rechaza titulado en modo empresa antes de acceder a postulaciones', async () => {
    await expect(useCase.execute(graduate, { mode: 'applicants', vacancyId: VACANCY_1, applicationIds: [APPLICATION_1] })).rejects.toBeInstanceOf(ForbiddenException);
    expect(batchData.readCompanyVacancyApplications).not.toHaveBeenCalled();
    expect(calculate.execute).not.toHaveBeenCalled();
  });

  it('egresado conserva orden y marca solo elementos con fallo de cálculo como error individual', async () => {
    batchData.readPublicVacancies.mockResolvedValue([
      { vacancyId: VACANCY_1, requirements: [] },
      { vacancyId: VACANCY_2, requirements: ['Java'] },
    ]);
    data.readProfiles.mockResolvedValue([profile]);
    calculate.execute.mockImplementation(async ({ vacancies }: {
      profile: JobPostingAffinityProfile | null;
      vacancies: readonly JobPostingAffinityRequirements[];
    }) => {
      if (vacancies.some(({ vacancyId }) => vacancyId === VACANCY_2)) {
        throw new Error('simulated single vacancy failure');
      }
      return vacancies.map(({ vacancyId }) => ({ vacancyId, result: noRequirements }));
    });
    const response = await useCase.execute(graduate, { mode: 'vacancies', vacancyIds: [VACANCY_1, VACANCY_2] });
    expect(response.data.map((item) => item.vacancyId)).toEqual([VACANCY_1, VACANCY_2]);
    expect(data.readProfiles).toHaveBeenCalledWith([graduate.id]);
    expect(response.data[0]).toMatchObject({ result: noRequirements, error: null });
    expect(response.data[1]).toMatchObject({ result: null, error: { code: 'AFFINITY_CALCULATION_FAILED', retryable: true } });
  });

  it('un recurso fuera del alcance de empresa bloquea todo el lote antes de NLP', async () => {
    batchData.readCompanyVacancyApplications.mockResolvedValue(null);
    await expect(useCase.execute(company, { mode: 'applicants', vacancyId: VACANCY_1, applicationIds: [APPLICATION_1] })).rejects.toBeInstanceOf(ForbiddenException);
    expect(data.readProfiles).not.toHaveBeenCalled();
    expect(calculate.execute).not.toHaveBeenCalled();
  });

  it('postulación ajena a la vacante produce 403 global antes del cálculo', async () => {
    batchData.readCompanyVacancyApplications.mockResolvedValue({
      vacancy: { vacancyId: VACANCY_1, requirements: ['Java'] },
      applications: [],
    });
    await expect(useCase.execute(company, { mode: 'applicants', vacancyId: VACANCY_1, applicationIds: [APPLICATION_1] })).rejects.toBeInstanceOf(ForbiddenException);
    expect(data.readProfiles).not.toHaveBeenCalled();
    expect(calculate.execute).not.toHaveBeenCalled();
  });

  it('aisla el error de un perfil y permite calcular los demás; conserva el orden de entrada', async () => {
    batchData.readCompanyVacancyApplications.mockResolvedValue({
      vacancy: { vacancyId: VACANCY_1, requirements: ['Java'] },
      applications: [
        { applicationId: APPLICATION_1, userId: 'candidate-1' },
        { applicationId: APPLICATION_2, userId: 'candidate-2' },
      ],
    });
    data.readProfiles.mockResolvedValue([profile, { ...profile, userId: 'candidate-2', tituladoId: 'titulado-2' }]);
    calculate.execute.mockImplementation(async ({ profile: candidate }: { profile: JobPostingAffinityProfile | null; vacancies: readonly JobPostingAffinityRequirements[] }) => {
      if (candidate?.userId === 'candidate-1') {throw new Error('simulated individual calculation failure');}
      return [{ vacancyId: VACANCY_1, result: READY }];
    });
    const response = await useCase.execute(company, {
      mode: 'applicants', vacancyId: VACANCY_1, applicationIds: [APPLICATION_2, APPLICATION_1],
    });
    expect(response.data.map((item) => item.applicationId)).toEqual([APPLICATION_2, APPLICATION_1]);
    expect(response.data[0]).toMatchObject({ result: READY, error: null });
    expect(response.data[1]).toMatchObject({ result: null, error: { retryable: true } });
  });


  it('la caída del diccionario aborta globalmente como error 503 (sin persistencia en este caso de uso)', async () => {
    batchData.readPublicVacancies.mockResolvedValue([{ vacancyId: VACANCY_1, requirements: ['Java'] }]);
    data.readProfiles.mockResolvedValue([profile]);
    calculate.execute.mockRejectedValue(new AffinityDictionaryUnavailableError());
    await expect(useCase.execute(graduate, { mode: 'vacancies', vacancyIds: [VACANCY_1] })).rejects.toBeInstanceOf(AffinityDictionaryUnavailableError);
  });

  it('rechaza el modo si el actor no posee el permiso requerido aunque el rol sea correcto', async () => {
    await expect(useCase.execute({ ...graduate, permissions: [] }, { mode: 'vacancies', vacancyIds: [VACANCY_1] })).rejects.toBeInstanceOf(ForbiddenException);
    expect(batchData.readPublicVacancies).not.toHaveBeenCalled();
  });

  it('mantiene ready 0% y profile-incomplete distintos en batch', async () => {
    batchData.readPublicVacancies.mockResolvedValue([
      { vacancyId: VACANCY_1, requirements: ['JavaScript'] },
      { vacancyId: VACANCY_2, requirements: ['Java'] },
    ]);
    data.readProfiles.mockResolvedValue([profile]);
    calculate.execute.mockImplementation(async ({ vacancies }: { profile: JobPostingAffinityProfile | null; vacancies: readonly JobPostingAffinityRequirements[] }) => vacancies.map(({ vacancyId }) => ({
      vacancyId, result: vacancyId === VACANCY_1
        ? { ...READY, percentage: 0 }
        : { status: 'profile-incomplete', percentage: null, calculatedAt: null, comparison: [] },
    })));
    const response = await useCase.execute(graduate, { mode: 'vacancies', vacancyIds: [VACANCY_1, VACANCY_2] });
    expect(response.data[0].result).toMatchObject({ status: 'ready', percentage: 0 });
    expect(response.data[1].result).toMatchObject({ status: 'profile-incomplete', percentage: null });
  });


  it('modo empresa devuelve no-requirements para postulaciones de vacante sin requisitos', async () => {
    batchData.readCompanyVacancyApplications.mockResolvedValue({
      vacancy: { vacancyId: VACANCY_1, requirements: [] },
      applications: [{ applicationId: APPLICATION_1, userId: null }],
    });
    calculate.execute.mockResolvedValue([{ vacancyId: VACANCY_1, result: noRequirements }]);
    const response = await useCase.execute(company, {
      mode: 'applicants', vacancyId: VACANCY_1, applicationIds: [APPLICATION_1],
    });
    expect(response.data[0]).toMatchObject({
      vacancyId: VACANCY_1, applicationId: APPLICATION_1, result: noRequirements, error: null,
    });
    expect(data.readProfiles).not.toHaveBeenCalled();
  });

});
