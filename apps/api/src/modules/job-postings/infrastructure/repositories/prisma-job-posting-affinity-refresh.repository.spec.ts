import { PrismaJobPostingAffinityRefreshRepository } from './prisma-job-posting-affinity-refresh.repository';
import { jobPostingAffinityInputHash } from '../../domain/policies/job-posting-affinity-input-hash';

const userId = '20000000-0000-4000-8000-000000000003';
const vacancyId = '44500000-0000-4000-8000-000000000001';
const application = {
  id: '44800000-0000-4000-8000-000000000001', userId, vacancyId,
  inputHash: null, matchStatus: null,
};
const profile = {
  userId, tituladoId: 'graduate', texts: ['Java'], description: 'Java',
  hasEducation: true, hasExperience: true, hasCertification: true, hasProject: true,
};
const vacancy = { vacancyId, requirements: ['Java'] };
const ready = { status: 'ready' as const, percentage: 0, calculatedAt: '2026-11-21T00:00:00.000Z', comparison: [] };

function setup() {
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([{ id: 'graduate' }]),
    $executeRaw: jest.fn().mockResolvedValue(0),
    postulacion: {
      findFirst: jest.fn().mockResolvedValue({ hash_entrada: null, estado_match: null, reclamo_match_id: 'claim-id' }),
      update: jest.fn().mockResolvedValue({}),
    },
  };
  const prisma = {
    postulacion: { findMany: jest.fn().mockResolvedValue([]), updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    $transaction: jest.fn((operation: (client: typeof tx) => Promise<unknown>) => operation(tx)),
  };
  const data = {
    readProfiles: jest.fn().mockResolvedValue([profile]),
    readRequirements: jest.fn().mockResolvedValue([vacancy]),
  };
  const repository = new PrismaJobPostingAffinityRefreshRepository(prisma as never, data as never);
  return { repository, prisma, tx, data };
}

describe('persistencia concurrente de afinidad HU-12', () => {
  it('escribe porcentaje, fecha, estado y hash juntos bajo bloqueo', async () => {
    const { repository, tx, data } = setup();
    const hash = jobPostingAffinityInputHash(profile, vacancy);
    await expect(repository.persistIfCurrent(application, hash, ready, 'claim-id')).resolves.toBe(true);
    expect(data.readProfiles).toHaveBeenCalledWith([userId], tx);
    expect(data.readRequirements).toHaveBeenCalledWith([vacancyId], tx);
    expect(tx.$executeRaw).toHaveBeenCalledTimes(2);
    expect(tx.postulacion.update).toHaveBeenCalledWith({
      where: { id: application.id },
      data: { porcentaje_match: 0, fecha_match: new Date(ready.calculatedAt), hash_entrada: hash, estado_match: 'ready',
        hash_en_calculo: null, reclamo_match_id: null, reclamo_match_hasta: null },
    });
  });

  it('no sobrescribe un resultado cuando el perfil cambió durante el cálculo', async () => {
    const { repository, tx, data } = setup();
    data.readProfiles.mockResolvedValue([{ ...profile, texts: ['Docker'] }]);
    await expect(repository.persistIfCurrent(application, jobPostingAffinityInputHash(profile, vacancy), ready, 'claim-id')).resolves.toBe(false);
    expect(tx.postulacion.update).not.toHaveBeenCalled();
  });

  it('no sobrescribe un resultado cuando los requisitos cambiaron durante el cálculo', async () => {
    const { repository, tx, data } = setup();
    data.readRequirements.mockResolvedValue([{ ...vacancy, requirements: ['Docker'] }]);
    await expect(repository.persistIfCurrent(application, jobPostingAffinityInputHash(profile, vacancy), ready, 'claim-id')).resolves.toBe(false);
    expect(tx.postulacion.update).not.toHaveBeenCalled();
  });

  it('rechaza el resultado antiguo si otro intento tomó el reclamo vencido', async () => {
    const { repository, tx } = setup();
    tx.postulacion.findFirst.mockResolvedValue({ hash_entrada: null, estado_match: null, reclamo_match_id: 'claim-new' });
    await expect(repository.persistIfCurrent(application, jobPostingAffinityInputHash(profile, vacancy), ready, 'claim-old')).resolves.toBe(false);
    expect(tx.postulacion.update).not.toHaveBeenCalled();
  });

  it('omite la escritura concurrente del mismo hash', async () => {
    const { repository, tx } = setup();
    const hash = jobPostingAffinityInputHash(profile, vacancy);
    tx.postulacion.findFirst.mockResolvedValue({ hash_entrada: hash, estado_match: 'ready', reclamo_match_id: 'claim-id' });
    await expect(repository.persistIfCurrent(application, hash, ready, 'claim-id')).resolves.toBe(true);
    expect(tx.postulacion.update).toHaveBeenCalledWith({ where: { id: application.id }, data: {
      hash_en_calculo: null, reclamo_match_id: null, reclamo_match_hasta: null,
    } });
  });

  it('concede un solo reclamo temporal por hash y permite liberar el intento', async () => {
    const { repository, prisma } = setup();
    const hash = jobPostingAffinityInputHash(profile, vacancy);
    expect(await repository.claim(application, hash)).toMatch(/^[0-9a-f-]{36}$/);
    expect(prisma.postulacion.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: application.id, id_usuario: userId, id_vacante: vacancyId }),
      data: expect.objectContaining({ hash_en_calculo: hash, reclamo_match_hasta: expect.any(Date) }),
    }));
    const condition = prisma.postulacion.updateMany.mock.calls[0][0].where.AND[1].OR;
    expect(condition).toEqual(expect.arrayContaining([
      { reclamo_match_hasta: { lte: expect.any(Date) } },
      { hash_en_calculo: { not: hash } },
    ]));
    prisma.postulacion.updateMany.mockResolvedValueOnce({ count: 0 });
    expect(await repository.claim(application, hash)).toBeNull();
    await repository.releaseClaim(application.id, 'claim-id');
    expect(prisma.postulacion.updateMany).toHaveBeenCalledWith({
      where: { id: application.id, reclamo_match_id: 'claim-id' },
      data: { hash_en_calculo: null, reclamo_match_id: null, reclamo_match_hasta: null },
    });
  });

  it('refiltra postulantes por empresa y vacante antes de leer sus identidades', async () => {
    const { repository, prisma } = setup();
    await repository.listForVacancy(vacancyId, 'company-user', 0, 50);
    expect(prisma.postulacion.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id_vacante: vacancyId, vacante: { empresa: { OR: [
        { id_usuario: 'company-user' },
        { empresa_usuario_registros: { some: { id_usuario: 'company-user', estado: 'activo' } } },
      ] } } }),
      take: 50,
    }));
  });
});
