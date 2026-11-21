
import { ListMyCertificatesService } from './list-my-certificates.service';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';

describe('ListMyCertificatesService - HU19', () => {
  const findMany = jest.fn();

  let service: ListMyCertificatesService;

  beforeEach(() => {
    jest.clearAllMocks();

    const prisma = {
      certificado: {
        findMany,
      },
    } as unknown as PrismaService;

    service = new ListMyCertificatesService(prisma);
  });

  it('consulta exclusivamente los certificados del usuario autenticado', async () => {
    const userId = 'usuario-123';
    const emissionDate = new Date('2026-11-19T10:00:00.000Z');
    const eventDate = new Date('2026-11-18T10:00:00.000Z');

    findMany.mockResolvedValue([
      {
        id: 'certificado-123',
        fecha_emision: emissionDate,
        evento: {
          titulo: 'Congreso de Ingeniería de Sistemas',
          fecha_inicio: eventDate,
          fecha_fin: null,
        },
      },
    ]);

    const result = await service.execute(userId);

    expect(findMany).toHaveBeenCalledWith({
      where: {
        id_usuario: userId,
      },
      select: {
        id: true,
        fecha_emision: true,
        evento: {
          select: {
            titulo: true,
            fecha_inicio: true,
            fecha_fin: true,
          },
        },
      },
      orderBy: {
        fecha_emision: 'desc',
      },
    });

    expect(result).toEqual([
      {
        id: 'certificado-123',
        eventName: 'Congreso de Ingeniería de Sistemas',
        participationDate: eventDate.toISOString(),
      },
    ]);
  });

  it('devuelve un arreglo vacío cuando el usuario no tiene certificados', async () => {
    findMany.mockResolvedValue([]);

    const result = await service.execute('usuario-sin-certificados');

    expect(result).toEqual([]);
  });

  it('no devuelve el contenido PDF en el listado', async () => {
    findMany.mockResolvedValue([
      {
        id: 'certificado-456',
        fecha_emision: new Date('2026-11-19T10:00:00.000Z'),
        evento: {
          titulo: 'Evento de prueba',
          fecha_inicio: null,
          fecha_fin: null,
        },
      },
    ]);

    const result = await service.execute('usuario-456');

    expect(result[0]).not.toHaveProperty('contenido');
    expect(result[0].participationDate).toBe(
      '2026-11-19T10:00:00.000Z',
    );
  });
});
