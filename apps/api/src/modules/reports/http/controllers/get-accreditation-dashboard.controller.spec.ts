import { GetAccreditationDashboardController } from './get-accreditation-dashboard.controller';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';

describe('GetAccreditationDashboardController (T3.1)', () => {
  let controller: GetAccreditationDashboardController;
  let useCase: { execute: jest.Mock };

  const actor: ActorContext = {
    id: 'admin-1',
    email: 'admin@umss.edu.bo',
    name: 'Admin',
    role: 'administrador',
    permissions: ['reportes:read'],
    scopes: { companyIds: [], graduateId: null, careerIds: ['career-1'] },
    credentialVersion: 1,
  };

  beforeEach(() => {
    useCase = { execute: jest.fn().mockResolvedValue({ totalResponses: 5 }) };
    controller = new GetAccreditationDashboardController(useCase as never);
  });

  it('llama al caso de uso pasando actor, careerId y filtros extraídos', async () => {
    const response = await controller.handle(actor, {
      careerId: 'career-1',
      cohort: 2023,
      semester: '2/2026',
    });

    expect(useCase.execute).toHaveBeenCalledWith(actor, 'career-1', {
      cohort: 2023,
      semester: '2/2026',
    });
    expect(response).toEqual({ data: { totalResponses: 5 } });
  });

  it('llama al caso de uso sin filtros si la query viene vacía', async () => {
    await controller.handle(actor, {});

    expect(useCase.execute).toHaveBeenCalledWith(actor, undefined, undefined);
  });
});
