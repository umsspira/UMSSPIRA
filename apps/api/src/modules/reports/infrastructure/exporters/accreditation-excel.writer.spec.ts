import { Workbook } from 'exceljs';
import type { AccreditationReport } from '../../domain/entities/accreditation-report';
import { AccreditationExcelWriter } from './accreditation-excel.writer';
describe('AccreditationExcelWriter', () => {
  const sampleReport: AccreditationReport = {
    careerNames: ['Ingeniería de Sistemas'],
    period: { cohort: null, semester: '1/2026' },
    generatedAt: new Date('2026-11-18T12:00:00.000Z'),
    indicators: {
      totalResponses: 25,
      employedPercent: 80,
      averageInsertionMonths: 3.5,
    },
    salaryRanges: [
      { range: '3000 - 5000 Bs', count: 15 },
      { range: '5001 - 8000 Bs', count: 10 },
    ],
    cohorts: [
      { cohort: 2023, responses: 20, employedPercent: 85 },
      { cohort: 2024, responses: null, employedPercent: null },
    ],
    heatmap: {
      areas: ['Desarrollo Web', 'Bases de Datos'],
      updatedAt: new Date('2026-11-18T12:00:00.000Z'),
      rows: [
        {
          cohort: 2023,
          cells: [
            { kind: 'value', percent: 82, graduates: 20 },
            { kind: 'insufficient' },
          ],
        },
      ],
    },
  };
  it('genera un archivo .xlsx con las 3 hojas requeridas, valores numéricos y privacidad (< 5 respuestas)', async () => {
    const writer = new AccreditationExcelWriter();
    const file = await writer.build(sampleReport);
    expect(file.name).toBe('acreditacion-ingenieria-de-sistemas-2026-11-18.xlsx');
    expect(file.mime).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    const workbook = new Workbook();
    await workbook.xlsx.load(file.bytes as unknown as ArrayBuffer);
    expect(workbook.worksheets.map((s) => s.name)).toEqual([
      'Indicadores',
      'Empleabilidad por cohorte',
      'Mapa de calor',
    ]);
    const indicatorsSheet = workbook.getWorksheet('Indicadores')!;
    expect(indicatorsSheet.getRow(7).getCell(2).value).toBe(25);
    expect(indicatorsSheet.getRow(8).getCell(2).value).toBe(0.8);
    const cohortsSheet = workbook.getWorksheet('Empleabilidad por cohorte')!;
    expect(cohortsSheet.getRow(2).getCell(2).value).toBe(20);
    expect(cohortsSheet.getRow(3).getCell(2).value).toBe('Sin datos suficientes');
    const heatmapSheet = workbook.getWorksheet('Mapa de calor')!;
    expect(heatmapSheet.getRow(2).getCell(2).value).toBe(0.82);
    expect(heatmapSheet.getRow(2).getCell(3).value).toBe('Sin datos suficientes');
  });
});
