import { compareOcr } from './ocr-rules';
import { ocrReadingSchema } from '../../http/schemas/ocr.schemas';
import type { OcrReading } from '@umsspira/shared-types';
const declared = {
  nombre: 'José Andrés',
  apellido: 'Pérez Mamani',
  ci: '5918234',
  carrera: 'Ingeniería de Sistemas',
  anio_egreso: 2023,
  cod_sis: '201704981',
};
const text = [
  'Nombres: José Andrés',
  'Apellidos: Pérez Mamani',
  'CI: 5918234',
  'Carrera: Ingeniería de Sistemas',
  'Año de egreso: 2023',
  'Código SIS: 201704981',
];
const reading = (values = text): OcrReading => ({
  lines: values.map((text) => ({ text, confidence: 0.99, page: 1 })),
  pagesRead: 1,
  totalPages: 1,
  partial: false,
  engine: 'PaddleOCR.js@0.4.2/PP-OCRv6_small/es',
  loadMs: 100,
  readMs: 200,
});
describe('HU-13: reglas acordadas', () => {
  it('aprueba solo si todos los datos coinciden, normalizando tildes y espacios', () => {
    const result = compareOcr(
      declared,
      reading(
        text.map((t) =>
          t
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toUpperCase(),
        ),
      ),
    );
    expect(result.suggestion).toBe('APROBAR');
    expect(result.findings.every((f) => f.evidence?.page === 1)).toBe(true);
  });
  it('conserva tildes de la lectura y admite el departamento de expedición del CI', () => {
    const result = compareOcr(
      declared,
      reading(text.map((t) => t.replace('CI: 5918234', 'CI: 5918234 CB'))),
    );
    expect(result.suggestion).toBe('APROBAR');
    expect(result.findings[0].read).toBe('José Andrés');
    expect(result.findings[2].read).toBe('5918234 CB');
  });
  it('observa una diferencia de año con evidencia y conserva ambos valores', () => {
    const result = compareOcr(declared, reading(text.map((t) => t.replace('2023', '2022'))));
    expect(result.suggestion).toBe('OBSERVAR');
    expect(result.findings[4]).toMatchObject({
      declared: '2023',
      read: '2022',
      status: 'POSIBLE_DIFERENCIA',
    });
  });
  it('rechaza solo si todos son legibles y ninguno coincide', () => {
    expect(
      compareOcr(
        declared,
        reading([
          'Nombres: Luis',
          'Apellidos: Flores',
          'CI: 1234567',
          'Carrera: Medicina',
          'Año de egreso: 2020',
          'Código SIS: 201600123',
        ]),
      ).suggestion,
    ).toBe('RECHAZAR');
  });
  it.each(['sin texto', 'baja confianza', 'parcial', 'dato faltante', 'ambiguo'])(
    'exige revisión manual: %s',
    (kind) => {
      const input = reading();
      if (kind === 'sin texto') {
        input.lines = [];
      }
      if (kind === 'baja confianza') {
        input.lines[0].confidence = 0.4;
      }
      if (kind === 'parcial') {
        input.partial = true;
        input.totalPages = 6;
      }
      if (kind === 'dato faltante') {
        input.lines.pop();
      }
      if (kind === 'ambiguo') {
        input.lines.push({ text: 'Año de egreso: 2022', confidence: 0.99, page: 1 });
      }
      expect(compareOcr(declared, input).suggestion).toBe('REVISION_MANUAL');
    },
  );
  it('no confunde año de emisión con año de egreso ni números contenidos en otro identificador', () => {
    const input = reading(text.filter((t) => !t.startsWith('Año')));
    input.lines.push({ text: 'Emitido en 2023', confidence: 0.99, page: 1 });
    expect(compareOcr(declared, input).findings[4].status).toBe('NO_COMPROBADO');
    expect(
      compareOcr(
        declared,
        reading(text.map((t) => t.replace('CI: 5918234', 'Otra referencia 159182340'))),
      ).findings[2].status,
    ).toBe('NO_COMPROBADO');
  });
  it('valida límites, páginas, confianza y versión del motor', () => {
    expect(ocrReadingSchema.safeParse(reading()).success).toBe(true);
    expect(ocrReadingSchema.safeParse({ ...reading(), pagesRead: 6 }).success).toBe(false);
    expect(ocrReadingSchema.safeParse({ ...reading(), totalPages: 2 }).success).toBe(false);
    expect(
      ocrReadingSchema.safeParse({ ...reading(), lines: [{ text: 'a', confidence: 2, page: 1 }] })
        .success,
    ).toBe(false);
  });
});
