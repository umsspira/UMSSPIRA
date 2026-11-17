import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import type { SurveyRepositoryPort } from '../../application/ports/survey-repository.port';
import { ManageSurveysController } from './manage-surveys.controller';

describe('ManageSurveysController', () => {
  const careerId = '11111111-1111-4111-8111-111111111111';
  const surveyId = '22222222-2222-4222-8222-222222222222';

  const adminActor: ActorContext = {
    id: 'admin-1',
    email: 'admin.sistemas@umss.edu.bo',
    name: 'Admin Carrera',
    role: 'administrador',
    permissions: ['reportes:read'],
    scopes: { companyIds: [], graduateId: null, careerIds: [careerId] },
    credentialVersion: 1,
  };

  const record = {
    id: surveyId,
    title: 'Encuesta 2026',
    startDate: new Date('2026-11-01'),
    endDate: new Date('2026-11-30'),
    status: 'BORRADOR',
    format: 'WEB',
    createdAt: new Date('2026-11-01'),
    careerId,
  };

  let repository: {
    listManaged: jest.Mock;
    createManaged: jest.Mock;
    updateManaged: jest.Mock;
    publishManaged: jest.Mock;
    unpublishManaged: jest.Mock;
  };
  let controller: ManageSurveysController;

  beforeEach(() => {
    repository = {
      listManaged: jest.fn().mockResolvedValue([record]),
      createManaged: jest.fn().mockResolvedValue(record),
      updateManaged: jest.fn().mockResolvedValue({ ...record, title: 'Nuevo título' }),
      publishManaged: jest.fn().mockResolvedValue({ ...record, status: 'PUBLICADA' }),
      unpublishManaged: jest.fn().mockResolvedValue(record),
    };
    controller = new ManageSurveysController(repository as unknown as SurveyRepositoryPort);
  });

  it('lista las encuestas de la carrera del administrador', async () => {
    await expect(controller.list(adminActor)).resolves.toEqual({ data: [record] });
    expect(repository.listManaged).toHaveBeenCalledWith('admin-1', [careerId]);
  });

  it('crea la encuesta con título, fechas y formato', async () => {
    const body = {
      title: 'Encuesta 2026',
      startDate: new Date('2026-11-01'),
      endDate: new Date('2026-11-30'),
      format: 'WEB',
    };

    await expect(controller.create(adminActor, body)).resolves.toEqual({ data: record });
    expect(repository.createManaged).toHaveBeenCalledWith('admin-1', [careerId], body);
  });

  it('actualiza solo los campos enviados', async () => {
    const result = await controller.update(adminActor, surveyId, { title: 'Nuevo título' });

    expect(result.data.title).toBe('Nuevo título');
    expect(repository.updateManaged).toHaveBeenCalledWith('admin-1', [careerId], surveyId, {
      title: 'Nuevo título',
    });
  });

  it('publica la encuesta', async () => {
    const result = await controller.publish(adminActor, surveyId);

    expect(result.data.status).toBe('PUBLICADA');
    expect(repository.publishManaged).toHaveBeenCalledWith('admin-1', [careerId], surveyId);
  });

  it('despublica la encuesta y la devuelve en borrador', async () => {
    const result = await controller.unpublish(adminActor, surveyId);

    expect(result.data.status).toBe('BORRADOR');
    expect(repository.unpublishManaged).toHaveBeenCalledWith('admin-1', [careerId], surveyId);
  });
});