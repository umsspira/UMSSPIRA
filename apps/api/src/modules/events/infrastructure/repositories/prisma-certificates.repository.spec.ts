import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { PrismaCertificatesRepository } from './prisma-certificates.repository';

describe('PrismaCertificatesRepository.getEmissionSummary', () => {
  it('counts confirmed registrations separately from attendance', async () => {
    const confirmedRegistration = {
      id_usuario: 'graduate-1',
      asistencia: null,
      usuario: {
        nombre: 'Titulado de demostración',
        nombre_completo: null,
        nombres: null,
        apellidos: null,
        email: 'graduate@example.test',
        certificados: [],
      },
    };
    const findMany = jest.fn().mockResolvedValue([confirmedRegistration]);
    const repository = new PrismaCertificatesRepository({
      inscripcionEvento: { findMany },
    } as unknown as PrismaService);

    await expect(repository.getEmissionSummary('event-1')).resolves.toEqual({
      inscripciones: 1,
      asistencias: 0,
      sinAsistencia: 1,
      emitidos: 0,
      detalles: [],
    });
    expect(findMany).toHaveBeenCalledWith({
      where: { id_evento: 'event-1', estado: 'CONFIRMADA' },
      include: {
        asistencia: true,
        usuario: {
          include: {
            certificados: { where: { id_evento: 'event-1' } },
          },
        },
      },
    });
  });
});
