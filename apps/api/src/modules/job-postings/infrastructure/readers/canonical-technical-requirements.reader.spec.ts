import { BadRequestException } from '@nestjs/common';
import {
  CanonicalTechnicalRequirementsReader,
  InvalidCanonicalTechnicalRequirementError,
  type CanonicalTechnicalRequirementRow,
  type CanonicalTechnicalRequirementsSource,
} from './canonical-technical-requirements.reader';

const vacancyId = '10000000-0000-4000-8000-000000000001';
const row: CanonicalTechnicalRequirementRow = {
  id: '20000000-0000-4000-8000-000000000001',
  id_vacante: vacancyId,
  competencia_tecnica: 'PostgreSQL',
  nivel_esperado: 'AVANZADO',
  tipo: 'OBLIGATORIO',
  descripcion: 'Modelado relacional.',
  creado_en: new Date('2026-11-04T12:00:00.000Z'),
};

describe('CanonicalTechnicalRequirementsReader (HU8, isolated source)', () => {
  let source: jest.Mocked<CanonicalTechnicalRequirementsSource>;
  let reader: CanonicalTechnicalRequirementsReader;

  beforeEach(() => {
    source = { findMany: jest.fn().mockResolvedValue([row]) };
    reader = new CanonicalTechnicalRequirementsReader(source);
  });

  it.each([
    ['BASICO', 'Básico', 'OBLIGATORIO', 'Obligatorio'],
    ['BASICO', 'Básico', 'DESEABLE', 'Deseable'],
    ['INTERMEDIO', 'Intermedio', 'OBLIGATORIO', 'Obligatorio'],
    ['INTERMEDIO', 'Intermedio', 'DESEABLE', 'Deseable'],
    ['AVANZADO', 'Avanzado', 'OBLIGATORIO', 'Obligatorio'],
    ['AVANZADO', 'Avanzado', 'DESEABLE', 'Deseable'],
  ])('converts %s / %s / %s / %s to the existing frontend view', async (
    level, label, type, typeLabel,
  ) => {
    source.findMany.mockResolvedValue([{ ...row, nivel_esperado: level, tipo: type }]);

    await expect(reader.obtenerRequisitos(vacancyId)).resolves.toEqual([{
      id: row.id,
      idVacante: vacancyId,
      competencia: 'PostgreSQL',
      nivel: label,
      tipo: typeLabel,
      descripcion: 'Modelado relacional.',
      fechaCreacion: '2026-11-04T12:00:00.000Z',
    }]);
  });

  it('requests only canonical fields for the given UUID using a read-only source', async () => {
    await reader.obtenerRequisitos(` ${vacancyId} `);

    expect(source.findMany).toHaveBeenCalledTimes(1);
    expect(source.findMany).toHaveBeenCalledWith({
      where: { id_vacante: vacancyId },
      select: {
        id: true, id_vacante: true, competencia_tecnica: true,
        nivel_esperado: true, tipo: true, descripcion: true, creado_en: true,
      },
      orderBy: { competencia_normalizada: 'asc' },
    });
  });

  it('returns empty only when the canonical source confirms no requirements', async () => {
    source.findMany.mockResolvedValue([]);
    await expect(reader.obtenerRequisitos(vacancyId)).resolves.toEqual([]);
  });

  it('converts a nullable description without displaying null', async () => {
    source.findMany.mockResolvedValue([{ ...row, descripcion: null }]);
    const [requirement] = await reader.obtenerRequisitos(vacancyId);
    expect(requirement.descripcion).toBeUndefined();
  });

  it('does not query for a malformed UUID', async () => {
    await expect(reader.obtenerRequisitos('invalid')).rejects.toBeInstanceOf(BadRequestException);
    expect(source.findMany).not.toHaveBeenCalled();
  });

  it.each(['Experto', 'EXPERTO', 'Básico', 'toString'])(
    'rejects unsupported canonical level %s without guessing a substitute', async (level) => {
      source.findMany.mockResolvedValue([{ ...row, nivel_esperado: level }]);
      await expect(reader.obtenerRequisitos(vacancyId))
        .rejects.toBeInstanceOf(InvalidCanonicalTechnicalRequirementError);
    },
  );

  it.each(['Obligatorio', 'OTRO', 'toString'])(
    'rejects unsupported canonical type %s', async (type) => {
      source.findMany.mockResolvedValue([{ ...row, tipo: type }]);
      await expect(reader.obtenerRequisitos(vacancyId))
        .rejects.toBeInstanceOf(InvalidCanonicalTechnicalRequirementError);
    },
  );

  it.each([
    { ...row, id_vacante: '10000000-0000-4000-8000-000000000002' },
    { ...row, id: 'invalid' },
    { ...row, competencia_tecnica: ' ' },
    { ...row, creado_en: new Date('invalid') },
  ])('rejects inconsistent records instead of returning empty data', async (invalidRow) => {
    source.findMany.mockResolvedValue([invalidRow]);
    await expect(reader.obtenerRequisitos(vacancyId))
      .rejects.toBeInstanceOf(InvalidCanonicalTechnicalRequirementError);
  });

  it('preserves distinct requirements and all their fields in a mixed canonical result', async () => {
    source.findMany.mockResolvedValue([
      row,
      {
        ...row, id: '20000000-0000-4000-8000-000000000002',
        competencia_tecnica: 'Linux', nivel_esperado: 'BASICO', tipo: 'DESEABLE',
        descripcion: null, creado_en: new Date('2026-11-05T09:00:00.000Z'),
      },
    ]);

    await expect(reader.obtenerRequisitos(vacancyId)).resolves.toEqual([
      {
        id: row.id, idVacante: vacancyId, competencia: 'PostgreSQL',
        nivel: 'Avanzado', tipo: 'Obligatorio', descripcion: 'Modelado relacional.',
        fechaCreacion: '2026-11-04T12:00:00.000Z',
      },
      {
        id: '20000000-0000-4000-8000-000000000002', idVacante: vacancyId,
        competencia: 'Linux', nivel: 'Básico', tipo: 'Deseable', descripcion: undefined,
        fechaCreacion: '2026-11-05T09:00:00.000Z',
      },
    ]);
  });

  it('rejects the entire result when a later row is invalid instead of returning partial success', async () => {
    source.findMany.mockResolvedValue([
      row,
      { ...row, id: '20000000-0000-4000-8000-000000000002', nivel_esperado: 'EXPERTO' },
    ]);
    await expect(reader.obtenerRequisitos(vacancyId))
      .rejects.toBeInstanceOf(InvalidCanonicalTechnicalRequirementError);
  });

  it('propagates source failures without a legacy-table fallback', async () => {
    const failure = new Error('Canonical table unavailable');
    source.findMany.mockRejectedValue(failure);
    await expect(reader.obtenerRequisitos(vacancyId)).rejects.toBe(failure);
    expect(source.findMany).toHaveBeenCalledTimes(1);
  });
});
