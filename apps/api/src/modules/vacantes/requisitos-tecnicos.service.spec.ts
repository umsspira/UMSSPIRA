import { BadRequestException } from '@nestjs/common';
import { InMemoryRequisitosTecnicosRepository } from '../../../test/support/in-memory-requisitos-tecnicos.repository';
import { RequisitosTecnicosService } from './requisitos-tecnicos.service';

describe('RequisitosTecnicosService - HU2', () => {
  let service: RequisitosTecnicosService;

  const VACANTE_ID_1 = '11111111-1111-4111-8111-111111111111';
  const VACANTE_ID_2 = '22222222-2222-4222-8222-222222222222';

  beforeEach(() => {
    service = new RequisitosTecnicosService(
      new InMemoryRequisitosTecnicosRepository(),
    );
  });

  it('associates multiple technical requirements with the correct vacancy', async () => {
    const saved = await service.asociarRequisitos(VACANTE_ID_1, [
      { competencia: 'SQL', nivel: 'Avanzado', tipo: 'Obligatorio' },
      {
        competencia: 'Power BI',
        nivel: 'Intermedio',
        tipo: 'Deseable',
        descripcion: 'Creación de dashboards.',
      },
    ]);

    expect(saved).toHaveLength(2);
    expect(saved.every((item) => item.idVacante === VACANTE_ID_1)).toBe(true);
    expect(saved[1].descripcion).toBe('Creación de dashboards.');
  });

  it('retrieves only requirements belonging to the requested vacancy', async () => {
    await service.asociarRequisitos(VACANTE_ID_1, [
      { competencia: 'SQL', nivel: 'Avanzado', tipo: 'Obligatorio' },
    ]);
    await service.asociarRequisitos(VACANTE_ID_2, [
      { competencia: 'Python', nivel: 'Intermedio', tipo: 'Deseable' },
    ]);

    await expect(service.obtenerRequisitos(VACANTE_ID_1)).resolves.toMatchObject([
      { idVacante: VACANTE_ID_1, competencia: 'SQL' },
    ]);
    await expect(service.obtenerRequisitos(VACANTE_ID_2)).resolves.toMatchObject([
      { idVacante: VACANTE_ID_2, competencia: 'Python' },
    ]);
  });

  it('rejects duplicate competencies in one request or already stored', async () => {
    await expect(
      service.asociarRequisitos(VACANTE_ID_1, [
        { competencia: 'SQL', nivel: 'Avanzado', tipo: 'Obligatorio' },
        { competencia: ' sql ', nivel: 'Intermedio', tipo: 'Deseable' },
      ]),
    ).rejects.toThrow(BadRequestException);

    await service.asociarRequisitos(VACANTE_ID_1, [
      { competencia: 'Desarrollo web', nivel: 'Intermedio', tipo: 'Deseable' },
    ]);

    await expect(
      service.asociarRequisitos(VACANTE_ID_1, [
        { competencia: '  DESARROLLO   WEB ', nivel: 'Avanzado', tipo: 'Obligatorio' },
      ]),
    ).rejects.toThrow(
      "El requisito técnico 'DESARROLLO   WEB' ya está asociado a esta vacante.",
    );
    await expect(service.obtenerRequisitos(VACANTE_ID_1)).resolves.toHaveLength(1);
  });

  it('prepares the matching structure from persisted requirements', async () => {
    await service.asociarRequisitos(VACANTE_ID_1, [
      { competencia: 'SQL', nivel: 'Avanzado', tipo: 'Obligatorio' },
      { competencia: 'Excel', nivel: 'Intermedio', tipo: 'Deseable' },
    ]);

    await expect(
      service.obtenerEstructuraIndexacion(VACANTE_ID_1),
    ).resolves.toMatchObject({
      idVacante: VACANTE_ID_1,
      totalRequisitos: 2,
      metadatosMatching: {
        totalObligatorios: 1,
        totalDeseables: 1,
      },
    });
  });

  it('updates and deletes only a requirement associated with that vacancy', async () => {
    const [saved] = await service.asociarRequisitos(VACANTE_ID_1, [
      { competencia: 'SQL', nivel: 'Intermedio', tipo: 'Deseable' },
    ]);

    await expect(
      service.actualizarRequisito(VACANTE_ID_1, saved.id, {
        nivel: 'Experto',
        tipo: 'Obligatorio',
      }),
    ).resolves.toMatchObject({ nivel: 'Experto', tipo: 'Obligatorio' });
    await expect(
      service.eliminarRequisito(VACANTE_ID_2, saved.id),
    ).rejects.toThrow('El requisito técnico especificado no existe.');
    await expect(
      service.eliminarRequisito(VACANTE_ID_1, saved.id),
    ).resolves.toEqual({ eliminado: true, id: saved.id });
    await expect(service.obtenerRequisitos(VACANTE_ID_1)).resolves.toEqual([]);
  });
});
