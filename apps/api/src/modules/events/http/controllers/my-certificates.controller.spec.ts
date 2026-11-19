
import type { AuthRequest } from '../../../../shared/http/auth/contracts/auth-request';
import { AccessError } from '../../../../shared/security/errors/access-error';
import { ListMyCertificatesService } from '../../application/list-my-certificates.service';
import { MyCertificatesController } from './my-certificates.controller';

describe('MyCertificatesController - HU19', () => {
  const execute = jest.fn();

  let controller: MyCertificatesController;

  beforeEach(() => {
    jest.clearAllMocks();

    const service = {
      execute,
    } as unknown as ListMyCertificatesService;

    controller = new MyCertificatesController(service);
  });

  it('consulta los certificados del usuario autenticado', async () => {
    const certificates = [
      {
        id: 'certificado-123',
        eventName: 'Congreso de Sistemas',
        participationDate: '2026-11-18T10:00:00.000Z',
      },
    ];

    execute.mockResolvedValue(certificates);

    const request = {
      auth: {
        actor: {
          id: 'usuario-123',
        },
      },
    } as AuthRequest;

    const result = await controller.listMyCertificates(request);

    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledWith('usuario-123');
    expect(result).toEqual(certificates);
  });

  it('rechaza una solicitud sin usuario autenticado', async () => {
    const request = {
      auth: undefined,
    } as AuthRequest;

    await expect(
      controller.listMyCertificates(request),
    ).rejects.toBeInstanceOf(AccessError);

    expect(execute).not.toHaveBeenCalled();
  });

  it('no permite consultar usando un identificador enviado por el cliente', async () => {
    execute.mockResolvedValue([]);

    const request = {
      auth: {
        actor: {
          id: 'usuario-autenticado',
        },
      },
      query: {
        userId: 'otro-usuario',
      },
    } as unknown as AuthRequest;

    await controller.listMyCertificates(request);

    expect(execute).toHaveBeenCalledWith('usuario-autenticado');
    expect(execute).not.toHaveBeenCalledWith('otro-usuario');
  });
});
