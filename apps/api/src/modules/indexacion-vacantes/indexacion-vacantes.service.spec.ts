import { BadRequestException } from '@nestjs/common';
import type { Client } from '@elastic/elasticsearch';
import type { Prisma } from '../../generated/prisma/client';
import type { JobPostingSearchDocument } from '../../shared/infrastructure/search/job-posting-search-document';
import { IndexacionVacantesService } from './indexacion-vacantes.service';
import { VACANTE_INDEXACION_SELECT } from './interfaces/vacante-indexable.interface';

interface ParametrosIndexacionFake {
  id: string;
  index: string;
  document: JobPostingSearchDocument;
}

function crearServicioFake() {
  const documentos = new Map<string, JobPostingSearchDocument>();
  let indiceCreado = false;
  const fakeClient = {
    indices: {
      exists: jest.fn(async () => indiceCreado),
      create: jest.fn(async (_params: unknown) => {
        indiceCreado = true;
        return {};
      }),
    },
    index: jest.fn(async (params: ParametrosIndexacionFake) => {
      const yaExistia = documentos.has(params.id);
      documentos.set(params.id, params.document);
      return {
        _id: params.id,
        _index: params.index,
        result: yaExistia ? 'updated' : 'created',
      };
    }),
    ping: jest.fn(async () => true),
  };
  const service = new IndexacionVacantesService(
    fakeClient as unknown as Client,
    'hu4-test',
  );
  return { service, documentos, fakeClient };
}

const ahora = new Date('2026-11-14T12:00:00.000Z');
// El tipo generado verifica que la proyeccion oficial es entrada valida del mapper compartido.
const vacanteEjemplo: Prisma.VacanteGetPayload<{
  select: typeof VACANTE_INDEXACION_SELECT;
}> = {
  id: '10000000-0000-4000-8000-000000000001',
  titulo: 'Desarrollador backend',
  id_empresa: '20000000-0000-4000-8000-000000000001',
  empresa: { razon_social: 'Empresa de prueba' },
  estado: 'PUBLICADO',
  created_at: new Date('2026-11-01T08:00:00-04:00'),
  fecha_cierre: new Date('2026-11-15T12:00:00.000Z'),
};

describe('IndexacionVacantesService (HU4, persistencia y Elasticsearch simulados)', () => {
  it('rechaza un UUID de borrado invalido sin llamar a Elasticsearch', async () => {
    const { service, fakeClient } = crearServicioFake();
    await expect(service.eliminarVacante('*')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(fakeClient.indices.exists).not.toHaveBeenCalled();
    expect(fakeClient.index).not.toHaveBeenCalled();
  });

  it('construye el documento compartido desde la proyeccion Prisma sin llamadas externas', () => {
    const { service, fakeClient } = crearServicioFake();
    const before = JSON.stringify(vacanteEjemplo);

    expect(service.construirDocumento(vacanteEjemplo, ahora)).toEqual({
      schema_version: 1,
      id: vacanteEjemplo.id,
      titulo: 'Desarrollador backend',
      id_empresa: vacanteEjemplo.id_empresa,
      razon_social: 'Empresa de prueba',
      estado: 'PUBLICADO',
      disponible: true,
      created_at: '2026-11-01T12:00:00.000Z',
      fecha_cierre: '2026-11-15T12:00:00.000Z',
    });
    expect(JSON.stringify(vacanteEjemplo)).toBe(before);
    expect(fakeClient.indices.exists).not.toHaveBeenCalled();
    expect(fakeClient.indices.create).not.toHaveBeenCalled();
    expect(fakeClient.index).not.toHaveBeenCalled();
    expect(fakeClient.ping).not.toHaveBeenCalled();
  });

  it.each([
    ['PUBLICADO', null, true],
    ['PUBLICADO', vacanteEjemplo.fecha_cierre, true],
    ['CERRADA', vacanteEjemplo.fecha_cierre, false],
    ['PUBLICADO', new Date(ahora.getTime() - 1), false],
    ['PUBLICADO', ahora, false],
    ['Publicada', vacanteEjemplo.fecha_cierre, false],
  ] as const)(
    'respeta HU8 para estado %s y cierre %s',
    (estado, fecha_cierre, disponible) => {
      const { service } = crearServicioFake();
      const document = service.construirDocumento(
        { ...vacanteEjemplo, estado, fecha_cierre },
        ahora,
      );
      expect(document.disponible).toBe(disponible);
      expect(document.estado).toBe(estado);
      expect(document.fecha_cierre).toBe(fecha_cierre?.toISOString() ?? null);
    },
  );

  it('conserva los nulos oficiales permitidos aunque el contrato antiguo de HU4 los rechazaba', () => {
    const { service } = crearServicioFake();
    const document = service.construirDocumento(
      {
        id: vacanteEjemplo.id,
        titulo: null,
        id_empresa: null,
        empresa: null,
        estado: 'PUBLICADO',
        created_at: null,
        fecha_cierre: null,
      },
      ahora,
    );
    expect(document).toMatchObject({
      titulo: null,
      id_empresa: null,
      razon_social: null,
      created_at: null,
      fecha_cierre: null,
      disponible: true,
    });
  });

  it('deriva disponibilidad y razon social de los datos oficiales sin copiar campos adicionales', () => {
    const { service } = crearServicioFake();
    const source = {
      ...vacanteEjemplo,
      estado: 'CERRADA',
      disponible: true,
      razon_social: 'Dato ajeno',
    };
    expect(service.construirDocumento(source, ahora)).toMatchObject({
      disponible: false,
      razon_social: 'Empresa de prueba',
    });
  });

  it('envia al cliente simulado el documento canonico con _id determinista y mappings compatibles', async () => {
    const { service, documentos, fakeClient } = crearServicioFake();
    const resultado = await service.indexarVacante(vacanteEjemplo, ahora);

    expect(fakeClient.index).toHaveBeenCalledWith({
      index: 'hu4-test',
      id: vacanteEjemplo.id,
      document: service.construirDocumento(vacanteEjemplo, ahora),
      refresh: 'wait_for',
    });
    expect(fakeClient.indices.create).toHaveBeenCalledWith({
      index: 'hu4-test',
      mappings: {
        properties: {
          schema_version: { type: 'integer' },
          id: { type: 'keyword' },
          titulo: { type: 'text' },
          id_empresa: { type: 'keyword' },
          razon_social: { type: 'text' },
          estado: { type: 'keyword' },
          disponible: { type: 'boolean' },
          created_at: {
            type: 'date',
            format: 'strict_date_optional_time||epoch_millis',
          },
          fecha_cierre: {
            type: 'date',
            format: 'strict_date_optional_time||epoch_millis',
          },
        },
      },
    });
    expect(resultado.idDocumento).toBe(vacanteEjemplo.id);
    expect(documentos.size).toBe(1);
  });

  it('reindexa una vacante cerrada sin duplicarla y reemplaza su disponibilidad anterior', async () => {
    const { service, documentos, fakeClient } = crearServicioFake();
    await service.indexarVacante(vacanteEjemplo, ahora);
    expect(documentos.get(vacanteEjemplo.id)?.disponible).toBe(true);

    await service.indexarVacante(
      { ...vacanteEjemplo, estado: 'CERRADA' },
      ahora,
    );
    expect(documentos.size).toBe(1);
    expect(documentos.get(vacanteEjemplo.id)?.disponible).toBe(false);
    expect(fakeClient.indices.create).toHaveBeenCalledTimes(1);
  });

  it.each([
    { ...vacanteEjemplo, id: 'vacante-001' },
    { ...vacanteEjemplo, id_empresa: 'empresa-001' },
    { ...vacanteEjemplo, created_at: new Date(NaN) },
    { ...vacanteEjemplo, fecha_cierre: new Date(NaN) },
  ])(
    'rechaza datos invalidos antes de consultar o escribir en el cliente simulado',
    async (source) => {
      const { service, fakeClient } = crearServicioFake();
      await expect(
        service.indexarVacante(source, ahora),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(fakeClient.indices.exists).not.toHaveBeenCalled();
      expect(fakeClient.index).not.toHaveBeenCalled();
    },
  );
});
