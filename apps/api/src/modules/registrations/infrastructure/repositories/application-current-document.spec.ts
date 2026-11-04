import { PrismaApplicationsRepository } from './prisma-applications.repository';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';

jest.mock('../../../../shared/infrastructure/database/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

const actor = { id: 'admin', scopes: { careerIds: ['career'] } } as unknown as ActorContext;
const currentFile = { id: 'new-file', nombre: 'corregido.png', mime: 'image/png',
  contenido: new Uint8Array([1, 2]), size_bytes: 2 };

function setup() {
  const prisma = {
    solicitud: { findFirst: jest.fn().mockResolvedValue({
      id: 'same-application', estado: 'PENDIENTE',
      detalle_solicitud: { nombre: 'Nombre corregido', email: 'ana@example.com' },
      documento_respaldo: { ruta_storage: 'new-file' },
      registro: { archivo: { id: 'old-file', nombre: 'anterior.pdf', mime: 'application/pdf' } },
    }) },
    archivoRegistro: { findUnique: jest.fn().mockResolvedValue(currentFile), findFirst: jest.fn() },
    dictamen: { count: jest.fn().mockResolvedValue(1), findFirst: jest.fn().mockResolvedValue(null) },
    $queryRaw: jest.fn().mockResolvedValue([]),
    auditoriaDictamen: { findFirst: jest.fn().mockResolvedValue(null) },
  };
  return { prisma, repository: new PrismaApplicationsRepository(prisma as never) };
}

describe('Documento vigente de la solicitud corregida', () => {
  it('conserva el expediente y muestra los datos y metadatos actualizados', async () => {
    const { repository } = setup();
    expect(await repository.find(actor, 'same-application')).toMatchObject({
      id: 'same-application', firstName: 'Nombre corregido',
      documentPath: 'new-file', documentName: 'corregido.png', documentFormat: 'image/png',
    });
  });

  it('entrega los bytes actuales y consulta primero el alcance del administrador', async () => {
    const { repository, prisma } = setup();
    expect(await repository.document(actor, 'same-application')).toMatchObject({
      id: 'new-file', bytes: currentFile.contenido, mime: 'image/png',
    });
    expect(prisma.solicitud.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'same-application',
        detalle_solicitud: { is: { id_carrera: { in: ['career'] } } } },
    }));
    expect(prisma.archivoRegistro.findUnique).toHaveBeenCalledWith({ where: { id: 'new-file' } });
    expect(prisma.archivoRegistro.findFirst).not.toHaveBeenCalled();
  });

  it('no entrega archivos de un expediente fuera del alcance del administrador', async () => {
    const { repository, prisma } = setup();
    prisma.solicitud.findFirst.mockResolvedValueOnce(null);
    await expect(repository.document(actor, 'other')).rejects.toMatchObject({ code: 'DOCUMENT_NOT_FOUND' });
    expect(prisma.archivoRegistro.findUnique).not.toHaveBeenCalled();
    expect(prisma.archivoRegistro.findFirst).not.toHaveBeenCalled();
  });

  it('no vuelve al archivo antiguo si falta el reemplazo', async () => {
    const { repository, prisma } = setup();
    prisma.archivoRegistro.findUnique.mockResolvedValueOnce(null);
    await expect(repository.document(actor, 'same-application')).rejects.toMatchObject({ code: 'DOCUMENT_NOT_FOUND' });
    expect(prisma.archivoRegistro.findFirst).not.toHaveBeenCalled();
  });
});
