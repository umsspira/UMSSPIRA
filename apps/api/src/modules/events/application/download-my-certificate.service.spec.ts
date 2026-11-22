
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import { DownloadMyCertificateService } from './download-my-certificate.service';

describe('DownloadMyCertificateService - HU19', () => {
  const findFirst = jest.fn();
  let service: DownloadMyCertificateService;

  beforeEach(() => {
    jest.resetAllMocks();

    const prisma = {
      certificado: { findFirst },
    } as unknown as PrismaService;

    service = new DownloadMyCertificateService(prisma);
  });

  it('devuelve el PDF cuando pertenece al usuario autenticado', async () => {
    const pdf = Buffer.from('%PDF-1.4 archivo de prueba');

    findFirst.mockResolvedValue({ contenido: pdf });

    const result = await service.execute(
      'certificado-123',
      'usuario-123',
    );

    expect(findFirst).toHaveBeenCalledWith({
      where: {
        id: 'certificado-123',
        id_usuario: 'usuario-123',
      },
      select: {
        contenido: true,
      },
    });

    expect(result).toEqual(pdf);
  });

  it('devuelve 404 cuando el certificado no existe o no pertenece al usuario', async () => {
    findFirst.mockResolvedValue(null);

    await expect(
      service.execute('certificado-ajeno', 'usuario-123'),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'certificado-ajeno',
          id_usuario: 'usuario-123',
        },
      }),
    );
  });

  it('no consulta el PDF sin filtrar por propietario', async () => {
    findFirst.mockResolvedValue({
      contenido: Buffer.from('%PDF-1.4'),
    });

    await service.execute('certificado-456', 'usuario-456');

    const query = findFirst.mock.calls[0][0];

    expect(query.where.id).toBe('certificado-456');
    expect(query.where.id_usuario).toBe('usuario-456');
    expect(query.select).toEqual({ contenido: true });
  });
});
