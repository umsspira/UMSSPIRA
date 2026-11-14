import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { PrismaCertificationReaderAdapter } from './prisma-certification-reader.adapter';

describe('PrismaCertificationReaderAdapter', () => {
  it('consulta únicamente al propietario y devuelve presencia de respaldo sin leer sus bytes', async () => {
    const findMany = jest.fn().mockResolvedValue([
      { id: 'aws', nombre: 'AWS', entidad_emisora: 'Amazon', anio_emision: 2026, certificacion_respaldo_registros: [{ archivo: { id_respaldo: 'jpg' } }] },
      { id: 'cloud', nombre: 'Cloud', entidad_emisora: 'Google', anio_emision: null, certificacion_respaldo_registros: [] },
    ]);
    const adapter = new PrismaCertificationReaderAdapter({ certificacion: { findMany } } as unknown as PrismaService);
    const result = await adapter.getCertifications('owner-id');
    expect(findMany).toHaveBeenCalledWith({
      where: { id_titulado: 'owner-id' },
      orderBy: [{ anio_emision: { sort: 'desc', nulls: 'last' } }, { id: 'asc' }],
      select: {
        id: true, nombre: true, entidad_emisora: true, anio_emision: true,
        certificacion_respaldo_registros: { select: { archivo: { select: { id_respaldo: true } } } },
      },
    });
    expect(result).toEqual([
      { id: 'aws', title: 'AWS', issuer: 'Amazon', issuedYear: 2026, hasBackup: true },
      { id: 'cloud', title: 'Cloud', issuer: 'Google', issuedYear: null, hasBackup: false },
    ]);
  });

  it('los proyectos no cambian el contador de respaldos: solo se leen certificaciones', async () => {
    const findMany = jest.fn().mockResolvedValue([
      { id: 'aws', nombre: 'AWS', entidad_emisora: 'Amazon', anio_emision: 2026, certificacion_respaldo_registros: [{ archivo: { id_respaldo: 'jpg' } }] },
    ]);
    const proyectoFindMany = jest.fn().mockResolvedValue([
      { nombre: 'Tienda', descripcion: 'Catálogo web', tecnologias: 'React, TypeScript' },
    ]);
    const adapter = new PrismaCertificationReaderAdapter({
      certificacion: { findMany },
      proyecto: { findMany: proyectoFindMany },
    } as unknown as PrismaService);

    const result = await adapter.getCertifications('owner-id');

    expect(proyectoFindMany).not.toHaveBeenCalled();
    expect(result.filter(({ hasBackup }) => hasBackup)).toHaveLength(1);
    expect(result).toHaveLength(1);
  });
});
