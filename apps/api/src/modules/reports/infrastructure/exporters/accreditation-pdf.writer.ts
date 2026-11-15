import PdfPrinter from 'pdfmake';
import type { Content, TableCell, TDocumentDefinitions } from 'pdfmake/interfaces';
import type { AccreditationReportWriter } from '../../application/ports/accreditation-report.port';
import type { ReportFile } from '../../application/contracts/report-inputs';
import type {
  AccreditationReport,
  CohortEmployability,
  HeatmapCell,
} from '../../domain/entities/accreditation-report';
import {
  accreditationFileName,
  HEATMAP_EMPTY,
  HEATMAP_TIERS,
  heatmapTextColor,
  heatmapTier,
  monthsLabel,
  percentLabel,
  periodLabel,
} from '../../domain/policies/accreditation-format.policy';
import { reportDate } from '../../domain/policies/report-format.policy';
import { UMSS_LOGO_DATA_URL } from './assets/umss-logo';

const FONTS = {
  Helvetica: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique',
  },
};
const BLUE = '#2C3B4D';
const MUTED = '#536372';
const TRUFFLE = '#A35139';
const BAR_HEIGHT = 90;
const INSUFFICIENT = 'Sin datos suficientes';

const softLayout = {
  hLineColor: () => '#D9DFE4',
  vLineColor: () => '#D9DFE4',
  hLineWidth: () => 0.5,
  vLineWidth: () => 0.5,
  paddingTop: () => 5,
  paddingBottom: () => 5,
};

function sectionTitle(text: string): Content {
  return { text, bold: true, fontSize: 11, color: BLUE, margin: [0, 16, 0, 6] };
}

/** Primera página: carrera, periodo consultado y fecha de emisión (HU-004 CA-02 y CA-09). */
function header(report: AccreditationReport): Content {
  return {
    columns: [
      { image: UMSS_LOGO_DATA_URL, width: 56 },
      {
        width: '*',
        margin: [14, 2, 0, 0],
        stack: [
          { text: 'Universidad Mayor de San Simón', bold: true, fontSize: 12 },
          {
            text: 'Reporte ejecutivo de empleabilidad',
            fontSize: 15,
            bold: true,
            margin: [0, 4, 0, 6],
          },
          { text: [{ text: 'Carrera: ', bold: true }, report.careerNames.join(', ')], fontSize: 9 },
          {
            text: [{ text: 'Periodo: ', bold: true }, periodLabel(report.period)],
            fontSize: 9,
            margin: [0, 3, 0, 0],
          },
          {
            text: [{ text: 'Fecha de emisión: ', bold: true }, reportDate(report.generatedAt)],
            fontSize: 9,
            margin: [0, 3, 0, 0],
          },
        ],
      },
    ],
  };
}

function indicators(report: AccreditationReport): Content {
  const items = [
    ['Total de respuestas', String(report.indicators.totalResponses)],
    ['Titulados empleados', percentLabel(report.indicators.employedPercent)],
    ['Tiempo promedio de inserción', monthsLabel(report.indicators.averageInsertionMonths)],
  ];
  return {
    table: {
      widths: ['*', '*', '*'],
      body: [
        items.map(([label, value]) => ({
          stack: [
            { text: label, fontSize: 8, color: MUTED },
            { text: value, fontSize: 16, bold: true, margin: [0, 4, 0, 0] },
          ],
          margin: [6, 4, 6, 4],
        })),
      ],
    },
    layout: softLayout,
  };
}

function salaryRanges(report: AccreditationReport): Content {
  const body: TableCell[][] = [
    [
      { text: 'Rango (Bs)', bold: true, color: '#FFFFFF', fillColor: BLUE },
      { text: 'Titulados', bold: true, color: '#FFFFFF', fillColor: BLUE, alignment: 'right' },
    ],
    ...report.salaryRanges.map((item): TableCell[] => [
      item.range,
      { text: String(item.count), alignment: 'right' },
    ]),
  ];
  return { table: { widths: ['*', 80], body }, fontSize: 9, layout: softLayout };
}

function cohortBar(item: CohortEmployability): TableCell {
  if (item.employedPercent === null) {
    return {
      text: INSUFFICIENT,
      fontSize: 7,
      bold: true,
      color: TRUFFLE,
      alignment: 'center',
      margin: [0, BAR_HEIGHT - 8, 0, 0],
    };
  }
  // El porcentaje va justo encima de su barra: el margen superior completa la altura del gráfico.
  const height = Math.max(1, (item.employedPercent / 100) * BAR_HEIGHT);
  return {
    stack: [
      {
        text: percentLabel(item.employedPercent),
        bold: true,
        fontSize: 8,
        alignment: 'center',
        margin: [0, BAR_HEIGHT - height, 0, 3],
      },
      { canvas: [{ type: 'rect', x: 10, y: 0, w: 30, h: height, color: BLUE }] },
    ],
  };
}

/** Gráfico «Empleabilidad por cohorte»: una barra por cohorte con respuestas (HU-001 CA-03 y CA-04). */
function cohortChart(report: AccreditationReport): Content {
  const cohorts = report.cohorts;
  const widths = cohorts.map(() => 50);
  return {
    table: {
      widths,
      body: [
        cohorts.map(cohortBar),
        cohorts.map((item) => ({
          text: String(item.cohort),
          fontSize: 8,
          color: MUTED,
          alignment: 'center',
        })),
      ],
    },
    layout: {
      hLineWidth: (index: number) => (index === 1 ? 0.8 : 0),
      vLineWidth: () => 0,
      hLineColor: () => '#C9C1B1',
    },
  };
}

function heatmapCell(cell: HeatmapCell): TableCell {
  if (cell.kind === 'no-data') {
    return {
      text: 'Sin datos',
      fillColor: HEATMAP_EMPTY,
      color: '#6F7378',
      alignment: 'center',
      fontSize: 7.5,
    };
  }
  if (cell.kind === 'insufficient') {
    return { text: INSUFFICIENT, color: TRUFFLE, bold: true, alignment: 'center', fontSize: 6.5 };
  }
  return {
    text: percentLabel(cell.percent),
    fillColor: HEATMAP_TIERS[heatmapTier(cell.percent)],
    color: heatmapTextColor(cell.percent),
    bold: true,
    alignment: 'center',
  };
}

/** Mapa de calor con sus tramos de 20 % y la leyenda (HU-002 CA-01 a CA-06). */
function heatmap(report: AccreditationReport): Content[] {
  const { areas, rows, updatedAt } = report.heatmap;
  const body: TableCell[][] = [
    [
      { text: 'Cohorte', bold: true, fontSize: 7.5, fillColor: '#F6F2EA' },
      ...areas.map((area) => ({
        text: area,
        bold: true,
        fontSize: 7,
        alignment: 'center' as const,
        fillColor: '#F6F2EA',
      })),
    ],
    ...rows.map((row): TableCell[] => [
      { text: String(row.cohort), bold: true },
      ...row.cells.map(heatmapCell),
    ]),
  ];
  const legend: TableCell[][] = [
    [
      ...HEATMAP_TIERS.map((color, index) => ({
        text: index * 20 + '–' + (index + 1) * 20 + ' %',
        fillColor: color,
        color: index >= 3 ? '#FFFFFF' : '#1B2632',
        fontSize: 7,
        alignment: 'center' as const,
      })),
      {
        text: 'Sin datos',
        fillColor: HEATMAP_EMPTY,
        color: '#6F7378',
        fontSize: 7,
        alignment: 'center' as const,
      },
    ],
  ];
  const content: Content[] = [
    {
      table: { headerRows: 1, widths: [44, ...areas.map(() => '*')], body },
      fontSize: 8,
      layout: {
        ...softLayout,
        hLineColor: () => '#FFFFFF',
        vLineColor: () => '#FFFFFF',
        hLineWidth: () => 1.5,
        vLineWidth: () => 1.5,
      },
    },
    {
      table: { widths: [52, 52, 52, 52, 52, 52], body: legend },
      layout: { ...softLayout, hLineColor: () => '#FFFFFF', vLineColor: () => '#FFFFFF' },
      margin: [0, 8, 0, 0],
    },
  ];
  if (updatedAt) {
    content.push({
      text: 'Actualizado: ' + reportDate(updatedAt),
      fontSize: 7.5,
      color: MUTED,
      margin: [0, 6, 0, 0],
    });
  }
  return content;
}

export function accreditationDefinition(report: AccreditationReport): TDocumentDefinitions {
  return {
    pageSize: 'A4',
    pageMargins: [36, 36, 36, 48],
    defaultStyle: { font: 'Helvetica', color: '#1B2632' },
    info: { title: 'Reporte ejecutivo de empleabilidad', author: 'UMSSPIRA' },
    content: [
      header(report),
      sectionTitle('Indicadores'),
      indicators(report),
      sectionTitle('Salario mensual'),
      salaryRanges(report),
      sectionTitle('Empleabilidad por cohorte'),
      cohortChart(report),
      sectionTitle('Mapa de calor de competencias'),
      ...heatmap(report),
    ],
    footer: (page: number, total: number): Content => ({
      margin: [36, 14, 36, 0],
      fontSize: 8,
      color: BLUE,
      columns: [
        { text: 'UMSSPIRA - Tablero de acreditación', width: '*' },
        { text: 'Página ' + page + ' de ' + total, alignment: 'right', width: 'auto' },
      ],
    }),
  };
}

export class AccreditationPdfWriter implements AccreditationReportWriter {
  async build(report: AccreditationReport): Promise<ReportFile> {
    const definition = accreditationDefinition(report);
    const bytes = await new Promise<Buffer>((resolve, reject) => {
      const document = new PdfPrinter(FONTS).createPdfKitDocument(definition);
      const chunks: Buffer[] = [];
      document.on('data', (chunk: Buffer) => chunks.push(chunk));
      document.on('error', reject);
      document.on('end', () => resolve(Buffer.concat(chunks)));
      document.end();
    });
    return {
      bytes,
      name: accreditationFileName(report.careerNames, report.generatedAt, 'pdf'),
      mime: 'application/pdf',
    };
  }
}
