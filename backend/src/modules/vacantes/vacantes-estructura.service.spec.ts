import { VacantesEstructuraService } from './vacantes-estructura.service';

describe('VacantesEstructuraService', () => {
  const service = new VacantesEstructuraService();

  it('conserva el identificador y prepara la estructura canónica', () => {
    const resultado = service.preparar({
      id: '11111111-1111-4111-8111-111111111111',
      titulo: 'Desarrollador Backend',
      idEmpresa: '22222222-2222-4222-8222-222222222222',
      estado: 'Publicada',
      requisitosTecnicos: {
        requerimientoLaboralIds: ['33333333-3333-4333-8333-333333333333'],
      },
    });

    expect(resultado.vacante).toEqual({
      id: '11111111-1111-4111-8111-111111111111',
      titulo: 'Desarrollador Backend',
      idEmpresa: '22222222-2222-4222-8222-222222222222',
      estado: 'Publicada',
      requisitosTecnicos: {
        requerimientoLaboralIds: ['33333333-3333-4333-8333-333333333333'],
      },
    });
  });

  it('mantiene distintos los identificadores de vacantes diferentes', () => {
    const base = {
      titulo: 'Analista de Datos',
      idEmpresa: '22222222-2222-4222-8222-222222222222',
      estado: 'Publicada',
      requisitosTecnicos: { requerimientoLaboralIds: [] },
    };
    const primera = service.preparar({
      ...base,
      id: '11111111-1111-4111-8111-111111111111',
    });
    const segunda = service.preparar({
      ...base,
      id: '44444444-4444-4444-8444-444444444444',
    });

    expect(primera.vacante.id).not.toBe(segunda.vacante.id);
  });
});
