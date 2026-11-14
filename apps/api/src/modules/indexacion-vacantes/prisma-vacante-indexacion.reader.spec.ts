import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import type { PrismaService } from '../../shared/infrastructure/database/prisma.service';
import type { ActorContext } from '../../shared/security/contexts/actor-context';
import { VACANTE_INDEXACION_SELECT } from './interfaces/vacante-indexable.interface';
import { PrismaVacanteIndexacionReader } from './prisma-vacante-indexacion.reader';

const idVacante = '10000000-0000-4000-8000-000000000001';
const idEmpresa = '20000000-0000-4000-8000-000000000001';
const actor: ActorContext = {
  id: '30000000-0000-4000-8000-000000000001',
  email: 'empresa@example.test',
  name: null,
  role: 'empresa',
  permissions: ['vacantes:create'],
  scopes: { companyIds: [idEmpresa], graduateId: null, careerIds: [] },
  credentialVersion: 1,
};
type Proyeccion = Prisma.VacanteGetPayload<{
  select: typeof VACANTE_INDEXACION_SELECT;
}>;

function preparar() {
  const vacante: Proyeccion = {
    id: idVacante,
    id_empresa: idEmpresa,
    titulo: 'Backend',
    estado: 'PUBLICADO',
    created_at: null,
    fecha_cierre: null,
    empresa: { razon_social: 'Empresa oficial' },
  };
  const findFirst = jest.fn<
    Promise<Proyeccion | null>,
    [Prisma.VacanteFindFirstArgs]
  >();
  findFirst.mockResolvedValue(vacante);
  const prisma = { vacante: { findFirst } } as unknown as Pick<
    PrismaService,
    'vacante'
  >;
  return {
    reader: new PrismaVacanteIndexacionReader(prisma),
    findFirst,
    vacante,
  };
}

describe('PrismaVacanteIndexacionReader (Prisma simulado)', () => {
  it('lee el modelo oficial con la proyeccion compartida y el alcance de empresa', async () => {
    const { reader, findFirst, vacante } = preparar();
    await expect(reader.obtenerAutorizada(actor, idVacante)).resolves.toBe(
      vacante,
    );
    expect(findFirst).toHaveBeenCalledTimes(1);
    expect(findFirst).toHaveBeenCalledWith({
      where: { id: idVacante, id_empresa: { in: [idEmpresa] } },
      select: VACANTE_INDEXACION_SELECT,
    });
  });

  it('rechaza la ausencia de actor antes de consultar Prisma', async () => {
    const { reader, findFirst } = preparar();
    await expect(
      reader.obtenerAutorizada(undefined as unknown as ActorContext, idVacante),
    ).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
    expect(findFirst).not.toHaveBeenCalled();
  });

  it.each([
    { ...actor, permissions: [] },
    { ...actor, scopes: { ...actor.scopes, companyIds: [] } },
    { ...actor, role: 'administrador' as const, permissions: [] },
  ])('exige permiso y alcance incluso para administrador', async (contexto) => {
    const { reader, findFirst } = preparar();
    await expect(
      reader.obtenerAutorizada(contexto, idVacante),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(findFirst).not.toHaveBeenCalled();
  });

  it.each(['no-uuid', '', '*', { id: idVacante }])(
    'rechaza identificadores invalidos y documentos completos antes de consultar',
    async (entrada) => {
      const { reader, findFirst } = preparar();
      await expect(
        reader.obtenerAutorizada(actor, entrada as string),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(findFirst).not.toHaveBeenCalled();
    },
  );

  it('no distingue una vacante inexistente de una ajena', async () => {
    const { reader, findFirst } = preparar();
    findFirst.mockResolvedValue(null);
    await expect(
      reader.obtenerAutorizada(actor, idVacante),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(findFirst.mock.calls[0][0].where?.id_empresa).toEqual({
      in: [idEmpresa],
    });
  });

  it('traduce fallos Prisma sin exponer detalles de infraestructura', async () => {
    const { reader, findFirst } = preparar();
    findFirst.mockRejectedValue(new Error('detalle privado'));
    await expect(
      reader.obtenerAutorizada(actor, idVacante),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(reader.obtenerAutorizada(actor, idVacante)).rejects.toThrow(
      'No se pudo consultar la vacante para sincronizar el indice.',
    );
  });
});
