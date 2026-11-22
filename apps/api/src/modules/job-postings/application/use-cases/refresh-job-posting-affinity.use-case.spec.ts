import { RefreshJobPostingAffinity } from './refresh-job-posting-affinity.use-case';
import { jobPostingAffinityInputHash } from '../../domain/policies/job-posting-affinity-input-hash';

const profile = {
  userId: 'user', tituladoId: 'graduate', description: 'Java', texts: ['Java'],
  hasEducation: true, hasExperience: true, hasCertification: true, hasProject: true,
};
const vacancy = { vacancyId: 'vacancy', requirements: ['Java'] };
const application = {
  id: 'application', userId: 'user', vacancyId: 'vacancy', inputHash: null, matchStatus: null,
};
const ready = { status: 'ready' as const, percentage: 0, calculatedAt: '2026-11-21T00:00:00.000Z', comparison: [] };

function setup() {
  const data = {
    readProfiles: jest.fn().mockResolvedValue([profile]),
    readRequirements: jest.fn().mockResolvedValue([vacancy]),
  };
  const repository = {
    listForUser: jest.fn().mockResolvedValue([application]),
    listForVacancy: jest.fn().mockResolvedValue([application]),
    listOne: jest.fn().mockResolvedValue([application]),
    claim: jest.fn().mockResolvedValue('claim-id'),
    releaseClaim: jest.fn().mockResolvedValue(undefined),
    persistIfCurrent: jest.fn().mockResolvedValue(true),
  };
  const calculate = { execute: jest.fn().mockResolvedValue([{ vacancyId: 'vacancy', result: ready }]) };
  return {
    useCase: new RefreshJobPostingAffinity(data, repository, calculate as never),
    data, repository, calculate,
  };
}

describe('RefreshJobPostingAffinity HU-12', () => {
  it('recalcula una postulación antigua sin hash y conserva 0 % como ready', async () => {
    const { useCase, repository } = setup();
    expect((await useCase.forUser('user')).get('application')).toBe('ready');
    expect(repository.persistIfCurrent).toHaveBeenCalledWith(
      application, jobPostingAffinityInputHash(profile, vacancy), ready, 'claim-id',
    );
  });

  it('omite el motor y la escritura cuando el hash sigue vigente', async () => {
    const { useCase, repository, calculate } = setup();
    repository.listForUser.mockResolvedValue([{ ...application,
      inputHash: jobPostingAffinityInputHash(profile, vacancy), matchStatus: 'ready',
    }]);
    expect((await useCase.forUser('user')).get('application')).toBe('ready');
    expect(calculate.execute).not.toHaveBeenCalled();
    expect(repository.claim).not.toHaveBeenCalled();
    expect(repository.persistIfCurrent).not.toHaveBeenCalled();
  });

  it.each(['profile-incomplete', 'no-requirements'] as const)('conserva el estado %s sin porcentaje ficticio', async (status) => {
    const { useCase, repository, calculate } = setup();
    const result = { status, percentage: null, calculatedAt: null, comparison: [] };
    calculate.execute.mockResolvedValue([{ vacancyId: 'vacancy', result }]);
    expect((await useCase.forUser('user')).get('application')).toBe(status);
    expect(repository.persistIfCurrent).toHaveBeenCalledWith(application, expect.any(String), result, 'claim-id');
  });

  it('deja pendiente un cálculo que perdió la carrera con una edición', async () => {
    const { useCase, repository } = setup();
    repository.persistIfCurrent.mockResolvedValue(false);
    expect((await useCase.forUser('user')).get('application')).toBe('pending');
    expect(repository.releaseClaim).toHaveBeenCalledWith('application', 'claim-id');
  });

  it('evita ejecutar NLP cuando otra petición conserva el reclamo vigente', async () => {
    const { useCase, repository, calculate } = setup();
    repository.claim.mockResolvedValue(null);
    expect((await useCase.forUser('user')).get('application')).toBe('pending');
    expect(calculate.execute).not.toHaveBeenCalled();
  });

  it('deja el error reintentable si falla el motor sin persistir 0 %', async () => {
    const { useCase, repository, calculate } = setup();
    calculate.execute.mockRejectedValue(new Error('Diccionario no disponible'));
    expect((await useCase.forUser('user')).get('application')).toBe('error');
    expect(repository.persistIfCurrent).not.toHaveBeenCalled();
    expect(repository.releaseClaim).toHaveBeenCalledWith('application', 'claim-id');
  });

  it('conserva no-requirements aunque falle NLP de otra vacante del mismo Titulado', async () => {
    const { useCase, repository, data, calculate } = setup();
    repository.listForUser.mockResolvedValue([
      { ...application, id: 'empty', vacancyId: 'empty-vacancy' }, application,
    ]);
    data.readRequirements.mockResolvedValue([
      { vacancyId: 'empty-vacancy', requirements: [] }, vacancy,
    ]);
    calculate.execute.mockImplementation(async ({ vacancies }: { vacancies: typeof vacancy[] }) => {
      if (vacancies[0]?.vacancyId === 'vacancy') {throw new Error('NLP indisponible');}
      return [{ vacancyId: 'empty-vacancy', result: { status: 'no-requirements', percentage: null, calculatedAt: null, comparison: [] } }];
    });
    const statuses = await useCase.forUser('user');
    expect(statuses.get('empty')).toBe('no-requirements');
    expect(statuses.get('application')).toBe('error');
  });

  it('limita cada lectura a 50 postulaciones y conserva el alcance empresarial', async () => {
    const { useCase, repository } = setup();
    const first = Array.from({ length: 50 }, (_, index) => ({ ...application, id: `application-${index}` }));
    repository.listForVacancy.mockResolvedValueOnce(first).mockResolvedValueOnce([application]);
    const statuses = await useCase.forVacancy('vacancy', 'company-user');
    expect(statuses.size).toBe(51);
    expect(repository.listForVacancy).toHaveBeenNthCalledWith(1, 'vacancy', 'company-user', 0, 50);
    expect(repository.listForVacancy).toHaveBeenNthCalledWith(2, 'vacancy', 'company-user', 50, 50);
  });
});
