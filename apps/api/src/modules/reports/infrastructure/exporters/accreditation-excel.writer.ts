import { Workbook, type FillPattern, type Worksheet } from 'exceljs';
import type { AccreditationReportWriter } from '../../application/ports/accreditation-report.port';
import type { ReportFile } from '../../application/contracts/report-inputs';
import type { AccreditationReport } from '../../domain/entities/accreditation-report';
import {
  accreditationFileName,
  HEATMAP_EMPTY,
  HEATMAP_TIERS,
  heatmapTextColor,
  heatmapTier,
  periodLabel,
} from '../../domain/policies/accreditation-format.policy';
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const HEADER_FILL: FillPattern = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF1E3A5F' },
};
const HEADER_FONT = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
function hexToArgb(hex: string): string {
  return 'FF' + hex.replace('#', '').toUpperCase();
}
function styleTableHeader(row: ReturnType<Worksheet['getRow']>): void {
  row.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  });
  row.height = 24;
}
export class AccreditationExcelWriter implements AccreditationReportWriter {
  async build(report: AccreditationReport): Promise<ReportFile> {
    const workbook = new Workbook();
    workbook.creator = 'UMSSPIRA';
    workbook.created = report.generatedAt;
    this.buildIndicatorsSheet(workbook, report);
    this.buildCohortsSheet(workbook, report);
    this.buildHeatmapSheet(workbook, report);
    const buffer = await workbook.xlsx.writeBuffer();
    return {
      bytes: Buffer.from(buffer),
      name: accreditationFileName(report.careerNames, report.generatedAt, 'xlsx'),
      mime: XLSX_MIME,
    };
  }
  private buildIndicatorsSheet(workbook: Workbook, report: AccreditationReport): void {
    const sheet = workbook.addWorksheet('Indicadores');
    sheet.columns = [{ width: 38 }, { width: 24 }, { width: 18 }];
    const careerTitle =
      report.careerNames.length === 1
        ? report.careerNames[0]
        : `Varias carreras (${report.careerNames.length})`;
    sheet.addRow(['Reporte Ejecutivo de Acreditación']);
    sheet.getRow(1).font = { bold: true, size: 14 };
    sheet.addRow(['Carrera(s):', careerTitle]);
    sheet.addRow(['Periodo:', periodLabel(report.period)]);
    sheet.addRow(['Fecha de generación:', report.generatedAt.toISOString().slice(0, 10)]);
    sheet.addRow([]);
    const kpiHeader = sheet.addRow(['Indicador', 'Valor', 'Unidad']);
    styleTableHeader(kpiHeader);
    const totalRow = sheet.addRow([
      'Total de respuestas válidas',
      report.indicators.totalResponses,
      'Respuestas',
    ]);
    totalRow.getCell(2).numFmt = '#,##0';
    const employedRow = sheet.addRow([
      'Tasa de empleabilidad',
      report.indicators.employedPercent / 100,
      'Porcentaje',
    ]);
    employedRow.getCell(2).numFmt = '0%';
    const insertionRow = sheet.addRow([
      'Tiempo promedio de inserción laboral',
      report.indicators.averageInsertionMonths ?? 'Sin datos',
      'Meses',
    ]);
    if (typeof report.indicators.averageInsertionMonths === 'number') {
      insertionRow.getCell(2).numFmt = '0.0';
    }
    sheet.addRow([]);
    const salaryHeader = sheet.addRow(['Rango salarial', 'Cantidad de titulados', 'Proporción']);
    styleTableHeader(salaryHeader);
    const total = report.indicators.totalResponses;
    for (const item of report.salaryRanges) {
      const row = sheet.addRow([
        item.range,
        item.count,
        total > 0 ? item.count / total : 0,
      ]);
      row.getCell(2).numFmt = '#,##0';
      row.getCell(3).numFmt = '0.0%';
    }
  }
  private buildCohortsSheet(workbook: Workbook, report: AccreditationReport): void {
    const sheet = workbook.addWorksheet('Empleabilidad por cohorte');
    sheet.columns = [{ width: 14 }, { width: 22 }, { width: 22 }, { width: 28 }];
    const header = sheet.addRow(['Cohorte', 'Respuestas', 'Empleabilidad (%)', 'Observación']);
    styleTableHeader(header);
    for (const item of report.cohorts) {
      const hasEnoughData = item.responses !== null && item.employedPercent !== null;
      const row = sheet.addRow([
        item.cohort,
        hasEnoughData ? item.responses : 'Sin datos suficientes',
        item.employedPercent !== null ? item.employedPercent / 100 : 'Sin datos suficientes',
        hasEnoughData ? 'Muestra válida (>= 5 respuestas)' : 'Oculto por privacidad (< 5 respuestas)',
      ]);
      row.getCell(1).numFmt = '0';
      if (hasEnoughData) {
        row.getCell(2).numFmt = '#,##0';
        row.getCell(3).numFmt = '0%';
      }
    }
  }
  private buildHeatmapSheet(workbook: Workbook, report: AccreditationReport): void {
    const sheet = workbook.addWorksheet('Mapa de calor');
    const areas = report.heatmap.areas;
    sheet.columns = [{ width: 14 }, ...areas.map(() => ({ width: 24 }))];
    const header = sheet.addRow(['Cohorte', ...areas]);
    styleTableHeader(header);
    for (const rowData of report.heatmap.rows) {
      const values: Array<number | string> = [rowData.cohort];
      for (const cell of rowData.cells) {
        if (cell.kind === 'value') {
          values.push(cell.percent / 100);
        } else if (cell.kind === 'insufficient') {
          values.push('Sin datos suficientes');
        } else {
          values.push('Sin datos');
        }
      }
      const row = sheet.addRow(values);
      row.getCell(1).numFmt = '0';
      row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      rowData.cells.forEach((cell, index) => {
        const excelCell = row.getCell(index + 2);
        excelCell.alignment = { horizontal: 'center', vertical: 'middle' };
        if (cell.kind === 'value') {
          const tier = heatmapTier(cell.percent);
          excelCell.numFmt = '0%';
          excelCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: hexToArgb(HEATMAP_TIERS[tier]) },
          };
          excelCell.font = {
            bold: true,
            color: { argb: hexToArgb(heatmapTextColor(cell.percent)) },
          };
        } else {
          excelCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: hexToArgb(HEATMAP_EMPTY) },
          };
          excelCell.font = { color: { argb: 'FF5A626A' } };
        }
      });
    }
  }
}