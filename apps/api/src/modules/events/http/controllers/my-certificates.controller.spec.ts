
import { NotFoundException } from '@nestjs/common';
import type { Response } from 'express';

import type { AuthRequest } from '../../../../shared/http/auth/contracts/auth-request';
import { AccessError } from '../../../../shared/security/errors/access-error';
import { DownloadMyCertificateService } from '../../application/download-my-certificate.service';
import { ListMyCertificatesService } from '../../application/list-my-certificates.service';
import { MyCertificatesController } from './my-certificates.controller';

describe('MyCertificatesController - HU19', () => {
  const listExecute = jest.fn();
  const downloadExecute = jest.fn();

  let controller: MyCertificatesController;

  const authenticatedRequest = (userId: string) =>
    ({
      auth: {
        actor: { id: userId },
      },
    }) as AuthRequest;

  const mockResponse = () => {
    const response = {
      set: jest.fn(),
      send: jest.fn(),
    };

    return response;
  };

  beforeEach(() => {
    jest.resetAllMocks();

    controller = new MyCertificatesController(
      { execute: listExecute } as unknown as ListMyCertificatesService,
      { execute: downloadExecute } as unknown as DownloadMyCertificateService,
    );
  });

  it('consulta los certificados del usuario autenticado', async () => {
    const certificates = [
      {
        id: 'certificado-123',
        eventName: 'Congreso de Sistemas',
        participationDate: '2026-11-18T10:00:00.000Z',
      },
    ];

    listExecute.mockResolvedValue(certificates);

    const result = await controller.listMyCertificates(
      authenticatedRequest('usuario-123'),
    );

    expect(listExecute).toHaveBeenCalledWith('usuario-123');
    expect(result).toEqual(certificates);
  });

  it('rechaza el listado sin autenticacion', async () => {
    await expect(
      controller.listMyCertificates({} as AuthRequest),
    ).rejects.toBeInstanceOf(AccessError);

    expect(listExecute).not.toHaveBeenCalled();
  });

  it('ignora un identificador de usuario enviado en la consulta', async () => {
    listExecute.mockResolvedValue([]);

    const request = {
      auth: { actor: { id: 'usuario-autenticado' } },
      query: { userId: 'otro-usuario' },
    } as unknown as AuthRequest;

    await controller.listMyCertificates(request);

    expect(listExecute).toHaveBeenCalledWith('usuario-autenticado');
    expect(listExecute).not.toHaveBeenCalledWith('otro-usuario');
  });

  it('devuelve el PDF con encabezados seguros', async () => {
    const pdf = Buffer.from('%PDF-1.4 archivo de prueba');
    const certificateId = 'a762c781-1f02-4e34-bc86-339c8e621bbc';
    const response = mockResponse();

    downloadExecute.mockResolvedValue(pdf);

    await controller.downloadMyCertificate(
      certificateId,
      authenticatedRequest('usuario-123'),
      response as unknown as Response,
    );

    expect(downloadExecute).toHaveBeenCalledWith(
      certificateId,
      'usuario-123',
    );

    expect(response.set).toHaveBeenCalledWith({
      'Content-Type': 'application/pdf',
      'Content-Disposition':
        `inline; filename="certificado-${certificateId}.pdf"`,
      'Content-Length': String(pdf.length),
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    });

    expect(response.send).toHaveBeenCalledWith(pdf);
  });

  it('rechaza descargar un certificado sin autenticacion', async () => {
    const response = mockResponse();

    await expect(
      controller.downloadMyCertificate(
        'a762c781-1f02-4e34-bc86-339c8e621bbc',
        {} as AuthRequest,
        response as unknown as Response,
      ),
    ).rejects.toBeInstanceOf(AccessError);

    expect(downloadExecute).not.toHaveBeenCalled();
    expect(response.send).not.toHaveBeenCalled();
  });

  it('no envia PDF si el servicio devuelve 404', async () => {
    const response = mockResponse();

    downloadExecute.mockRejectedValue(
      new NotFoundException('Certificado no encontrado'),
    );

    await expect(
      controller.downloadMyCertificate(
        'a762c781-1f02-4e34-bc86-339c8e621bbc',
        authenticatedRequest('usuario-123'),
        response as unknown as Response,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(response.send).not.toHaveBeenCalled();
  });
});
