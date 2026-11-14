import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { Client } from '@elastic/elasticsearch';
import { IndexacionVacantesService } from './indexacion-vacantes.service';
import { ELASTICSEARCH_INDEX } from './indexacion-vacantes.constants';
import { VacanteIndexable } from './interfaces/vacante-indexable.interface';

interface ParametrosIndexacionFake {
  id: string;
  index: string;
  document: VacanteIndexable;
}

function crearServicioFake() {
  const documentos = new Map<string, VacanteIndexable>();
  let indiceCreado = false;
  let creaciones = 0;

  const fakeClient = {
    indices: {
      exists: async () => indiceCreado,
      create: async () => {
        indiceCreado = true;
        creaciones += 1;
        return {};
      },
    },
    index: async (params: ParametrosIndexacionFake) => {
      const yaExistia = documentos.has(params.id);
      documentos.set(params.id, params.document);

      return {
        _id: params.id,
        _index: params.index,
        result: yaExistia ? 'updated' : 'created',
      };
    },
    ping: async () => true,
  };

  const service = new IndexacionVacantesService(
    fakeClient as unknown as Client,
    ELASTICSEARCH_INDEX,
  );

  return { service, documentos, getCreaciones: () => creaciones };
}

const vacanteEjemplo: VacanteIndexable = {
  id: 'vacante-001',
  titulo: 'Desarrollador backend',
  descripcion: 'Desarrollo y mantenimiento de servicios API.',
  empresa: 'Empresa de prueba',
  ubicacion: 'Cochabamba',
  modalidad: 'Hibrida',
  tipoContrato: 'Tiempo completo',
  estado: 'Publicada',
  requerimientosLaborales: [
    { id: 'req-1', nombre: 'TypeScript', tipo: 'Tecnica', nivel: 'Intermedio' },
    { id: 'req-2', nombre: 'Trabajo en equipo', tipo: 'Profesional' },
  ],
};

test('crea el índice e indexa la vacante con el mismo ID', async () => {
  const { service, documentos, getCreaciones } = crearServicioFake();

  const resultado = await service.indexarVacante(vacanteEjemplo);

  assert.equal(getCreaciones(), 1);
  assert.equal(resultado.idDocumento, vacanteEjemplo.id);
  assert.equal(documentos.size, 1);
  assert.equal(
    documentos.get(vacanteEjemplo.id)?.requerimientosLaborales?.length,
    2,
  );
});

test('reindexar la misma vacante conserva un solo documento', async () => {
  const { service, documentos } = crearServicioFake();

  await service.indexarVacante(vacanteEjemplo);
  await service.indexarVacante({
    ...vacanteEjemplo,
    titulo: 'Desarrollador backend actualizado',
  });

  assert.equal(documentos.size, 1);
  assert.equal(
    documentos.get(vacanteEjemplo.id)?.titulo,
    'Desarrollador backend actualizado',
  );
});

test('rechaza una vacante sin título', async () => {
  const { service } = crearServicioFake();

  await assert.rejects(
    () => service.indexarVacante({ ...vacanteEjemplo, titulo: '' }),
    /El campo titulo es obligatorio/,
  );
});
