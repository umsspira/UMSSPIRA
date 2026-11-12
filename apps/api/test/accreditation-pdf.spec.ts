import { BusinessRuleError } from '../src/shared/errors/business-rule-error';
import type { ActorContext } from '../src/shared/security/contexts/actor-context';
import type { AccreditationReport } from '../src/modules/reports/domain/entities/accreditation-report';
import {
  accreditationFileName,
  heatmapTier,
  monthsLabel,
  percentLabel,
  periodLabel,
} from '../src/modules/reports/domain/policies/accreditation-format.policy';
import {
  AccreditationPdfWriter,
  accreditationDefinition,
} from '../src/modules/reports/infrastructure/exporters/accreditation-pdf.writer';
import { ExportAccreditationPdfUseCase } from '../src/modules/reports/application/use-cases/export-accreditation-pdf.use-case';
import { ExportAccreditationPdfController } from '../src/modules/reports/http/controllers/export-accreditation-pdf.controller';
import { accreditationFilterSchema } from '../src/modules/reports/http/schemas/reports.schemas';
import { toAccreditationReport } from '../src/modules/reports/infrastructure/repositories/accreditation-report.reader';

const AREAS = [
  'Desarrollo de Software',
  'Cloud, DevOps & Infraestructura',
  'Ciencia de Datos & IA',
  'Aseguramiento de Calidad (QA)',
  'Ciberseguridad & Redes',
  'Gestión de TI & Gobernanza',
];

const report: AccreditationReport = {
  careerNames: ['Ingeniería de Sistemas'],
  period: { cohort: 2021, semester: null },
  generatedAt: new Date('2026-11-12T15:00:00Z'),
  indicators: { totalResponses: 11, employedPercent: 73, averageInsertionMonths: 4.9 },
  salaryRanges: [
    { range: '0–2.999', count: 1 },
    { range: '3.000–5.000', count: 3 },
    { range: '5.001–8.000', count: 2 },
    { range: '8.001–12.000', count: 2 },
    { range: '12.001–21.000', count: 0 },
  ],
  cohorts: [
    { cohort: 2021, responses: 11, employedPercent: 73 },
    { cohort: 2023, responses: 4, employedPercent: null },
  ],
  heatmap: {
    areas: AREAS,
    rows: [
      {
        cohort: 2021,
        cells: [
          { kind: 'value', percent: 76, graduates: 10 },
          { kind: 'value', percent: 63, graduates: 10 },
          { kind: 'value', percent: 64, graduates: 9 },
          { kind: 'no-data' },
          { kind: 'value', percent: 41, graduates: 8 },
          { kind: 'insufficient' },
        ],
      },
    ],
    updatedAt: new Date('2026-11-12T14:40:00Z'),
  },
};

function actor(careerIds: string[]): ActorContext {
  return {
    id: 'admin',
    email: 'admin@example.com',
    name: 'Administrador',
    role: 'administrador',
    permissions: ['reportes:read'],
    scopes: { companyIds: [], graduateId: null, careerIds },
    credentialVersion: 1,
  };
}

describe('Reporte ejecutivo de acreditación en PDF (HU-004)', () => {
  it('muestra carrera, periodo y fecha de emisión en la primera página (CA-02, CA-04 y CA-09)', () => {
    const texto = JSON.stringify(accreditationDefinition(report).content);
    expect(texto).toContain('Ingeniería de Sistemas');
    expect(texto).toContain('Cohorte: 2021 · Semestre: Todos');
    expect(texto).toContain('12/11/2026');
  });

  it('incluye indicadores, gráfico por cohorte y mapa de calor (CA-03)', () => {
    const texto = JSON.stringify(accreditationDefinition(report).content);
    for (const titulo of [
      'Indicadores',
      'Empleabilidad por cohorte',
      'Mapa de calor de competencias',
    ]) {
      expect(texto).toContain(titulo);
    }
    expect(texto).toContain('73 %');
    expect(texto).toContain('4,9 meses');
    expect(texto).toContain('Sin datos suficientes');
    expect(texto).toContain('Sin datos');
  });

  it('no muestra la cantidad de titulados de las celdas con 1 a 4 titulados', () => {
    const texto = JSON.stringify(accreditationDefinition(report).content);
    expect(texto).not.toContain('Calculado sobre');
  });

  it('construye un PDF válido con el nombre de la carrera y la fecha', async () => {
    const file = await new AccreditationPdfWriter().build(report);
    expect(file.bytes.subarray(0, 5).toString()).toBe('%PDF-');
    expect(file.bytes.subarray(-20).toString()).toContain('%%EOF');
    expect(file.mime).toBe('application/pdf');
    expect(file.name).toBe('acreditacion-ingenieria-de-sistemas-2026-11-12.pdf');
  });

  it('da formato al periodo, los porcentajes y los meses', () => {
    expect(periodLabel({ cohort: null, semester: '2/2026' })).toBe(
      'Cohorte: Todas · Semestre: 2/2026',
    );
    expect(percentLabel(72.4)).toBe('72 %');
    expect(monthsLabel(5.45)).toBe('5,5 meses');
    expect(monthsLabel(null)).toBe('Sin datos');
    expect(accreditationFileName(['A', 'B'], new Date('2026-11-12'), 'xlsx')).toBe(
      'acreditacion-varias-carreras-2026-11-12.xlsx',
    );
  });

  it.each([
    [0, 0],
    [19.9, 0],
    [20, 1],
    [59, 2],
    [80, 4],
    [100, 4],
  ])('ubica %p %% en el tramo %p del mapa', (percent, tier) => {
    expect(heatmapTier(percent)).toBe(tier);
  });
});

describe('Exportación del reporte ejecutivo (caso de uso)', () => {
  const writer = {
    build: jest
      .fn()
      .mockResolvedValue({ bytes: Buffer.from('%PDF-'), name: 'a.pdf', mime: 'application/pdf' }),
  };

  beforeEach(() => writer.build.mockClear());

  it('lee solo las carreras del administrador y arma el PDF', async () => {
    const reader = { read: jest.fn().mockResolvedValue(report) };
    await new ExportAccreditationPdfUseCase(reader, writer).execute(actor(['c1', 'c2']), {
      cohort: 2021,
    });
    expect(reader.read).toHaveBeenCalledWith(['c1', 'c2'], { cohort: 2021 });
    expect(writer.build).toHaveBeenCalledWith(report);
  });

  it('rechaza una carrera que no es del administrador', async () => {
    const reader = { read: jest.fn() };
    await expect(
      new ExportAccreditationPdfUseCase(reader, writer).execute(actor(['c1']), {
        careerId: 'otra',
      }),
    ).rejects.toBeInstanceOf(BusinessRuleError);
    expect(reader.read).not.toHaveBeenCalled();
  });

  it('no genera archivo si el periodo no tiene datos (CA-08)', async () => {
    const vacio = { ...report, indicators: { ...report.indicators, totalResponses: 0 } };
    const reader = { read: jest.fn().mockResolvedValue(vacio) };
    await expect(
      new ExportAccreditationPdfUseCase(reader, writer).execute(actor(['c1']), {}),
    ).rejects.toThrow('No hay información para exportar en este periodo');
    expect(writer.build).not.toHaveBeenCalled();
  });
});

describe('Filtros de la URL del reporte ejecutivo (HU-003 y HU-004 CA-04)', () => {
  it('convierte cohorte y semestre de la URL al filtro del tablero', () => {
    expect(accreditationFilterSchema.parse({ cohorte: '2023', semestre: '1-2026' })).toEqual({
      cohort: 2023,
      semester: '1/2026',
    });
    expect(accreditationFilterSchema.parse({})).toEqual({});
  });

  it.each([
    { cohorte: '23' },
    { semestre: '3-2026' },
    { semestre: '1/2026' },
    { careerId: 'no-es-uuid' },
    { anio: '2023' },
  ])('rechaza un filtro inválido: %p', (query) => {
    expect(accreditationFilterSchema.safeParse(query).success).toBe(false);
  });
});

describe('GET /reports/accreditation/pdf (controlador)', () => {
  it('descarga el PDF con su nombre y sin guardarlo en caché', async () => {
    const file = {
      bytes: Buffer.from('%PDF-1.7'),
      name: 'acreditacion-ingenieria-de-sistemas-2026-11-12.pdf',
      mime: 'application/pdf',
    };
    const useCase = { execute: jest.fn().mockResolvedValue(file) };
    const response = { type: jest.fn(), setHeader: jest.fn(), send: jest.fn() };
    response.type.mockReturnValue(response);
    response.setHeader.mockReturnValue(response);

    await new ExportAccreditationPdfController(
      useCase as unknown as ExportAccreditationPdfUseCase,
    ).handle(actor(['c1']), { cohort: 2023 }, response as never);

    expect(useCase.execute).toHaveBeenCalledWith(actor(['c1']), { cohort: 2023 });
    expect(response.type).toHaveBeenCalledWith('application/pdf');
    expect(response.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      'attachment; filename="acreditacion-ingenieria-de-sistemas-2026-11-12.pdf"',
    );
    expect(response.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store');
    expect(response.send).toHaveBeenCalledWith(file.bytes);
  });
});

describe('Lector del reporte ejecutivo (T1.1 + T2.1)', () => {
  const dashboard = {
    totalResponses: 11,
    employedGraduates: 8,
    employedPercentage: 73,
    averageInsertionMonths: 4.9,
    salaryRanges: {
      '0–2.999': 1,
      '3.000–5.000': 3,
      '5.001–8.000': 2,
      '8.001–12.000': 2,
      '12.001–21.000': 0,
    },
    employabilityByCohort: [
      { cohort: 2021, status: 'ok' as const, totalResponses: 11, employedPercentage: 73 },
      { cohort: 2023, status: 'insufficient' as const },
    ],
  };
  const heatmap = {
    areas: [
      { id: 'a1', name: 'Desarrollo de Software' },
      { id: 'a2', name: 'Cloud, DevOps & Infraestructura' },
      { id: 'a3', name: 'Ciencia de Datos & IA' },
    ],
    cohorts: ['2021'],
    cells: [
      {
        cohort: '2021',
        areaId: 'a1',
        areaName: 'Desarrollo de Software',
        status: 'ok' as const,
        percentage: 76,
        graduateCount: 10,
      },
      {
        cohort: '2021',
        areaId: 'a2',
        areaName: 'Cloud, DevOps & Infraestructura',
        status: 'insufficient' as const,
      },
      {
        cohort: '2021',
        areaId: 'a3',
        areaName: 'Ciencia de Datos & IA',
        status: 'no-data' as const,
      },
    ],
    updatedAt: new Date('2026-11-12T14:40:00Z'),
  };

  it('usa los mismos indicadores, rangos y cohortes del tablero', () => {
    const result = toAccreditationReport(
      dashboard,
      heatmap,
      ['Ingeniería de Sistemas'],
      { cohort: 2021 },
      new Date('2026-11-13T12:00:00Z'),
    );
    expect(result.indicators).toEqual({
      totalResponses: 11,
      employedPercent: 73,
      averageInsertionMonths: 4.9,
    });
    expect(result.salaryRanges).toHaveLength(5);
    expect(result.salaryRanges[1]).toEqual({ range: '3.000–5.000', count: 3 });
    expect(result.period).toEqual({ cohort: 2021, semester: null });
    expect(result.cohorts).toEqual([
      { cohort: 2021, responses: 11, employedPercent: 73 },
      { cohort: 2023, responses: null, employedPercent: null },
    ]);
  });

  it('traduce el mapa de calor a filas por cohorte, en el orden de las áreas', () => {
    const result = toAccreditationReport(
      dashboard,
      heatmap,
      ['Ingeniería de Sistemas'],
      {},
      new Date(),
    );
    expect(result.heatmap.areas).toEqual([
      'Desarrollo de Software',
      'Cloud, DevOps & Infraestructura',
      'Ciencia de Datos & IA',
    ]);
    expect(result.heatmap.rows).toEqual([
      {
        cohort: 2021,
        cells: [
          { kind: 'value', percent: 76, graduates: 10 },
          { kind: 'insufficient' },
          { kind: 'no-data' },
        ],
      },
    ]);
    expect(result.heatmap.updatedAt).toEqual(new Date('2026-11-12T14:40:00Z'));
  });

  it('el PDF armado con esos datos no muestra la cantidad de la cohorte con 1 a 4 respuestas', () => {
    const result = toAccreditationReport(
      dashboard,
      heatmap,
      ['Ingeniería de Sistemas'],
      {},
      new Date(),
    );
    const texto = JSON.stringify(accreditationDefinition(result).content);
    expect(texto).toContain('Sin datos suficientes');
    expect(texto).toContain('2023');
  });
});
