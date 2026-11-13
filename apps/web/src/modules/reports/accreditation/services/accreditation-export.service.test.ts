import { authenticatedFetch } from '@/shared/services/auth-session';
import {
  AccreditationExportError,
  buildDefaultFilename,
  buildExportQuery,
  requestAccreditationExport,
} from './accreditation-export.service';

jest.mock('@/shared/services/auth-session', () => ({
  authenticatedFetch: jest.fn(),
}));

const mockFetch = authenticatedFetch as jest.MockedFunction<typeof authenticatedFetch>;

function response(
  status: number,
  body = 'contenido',
  headers: Record<string, string> = {},
  json: unknown = null,
) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(headers),
    blob: async () => new Blob([body], { type: headers['Content-Type'] ?? '' }),
    json: async () => json,
  } as unknown as Response;
}

const allFilters = { cohort: '', semester: '' };

beforeEach(() => mockFetch.mockReset());

test('CA-04: envía solo los filtros aplicados', () => {
  expect(buildExportQuery(allFilters)).toBe('');
  expect(buildExportQuery({ cohort: '2023', semester: '1/2026' })).toBe(
    'cohorte=2023&semestre=1-2026',
  );
});

test('pide el PDF por la ruta relativa del proxy y usa el nombre del Content-Disposition', async () => {
  mockFetch.mockResolvedValue(
    response(200, '%PDF', {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="acreditacion-2023.pdf"',
    }),
  );
  const file = await requestAccreditationExport('pdf', { cohort: '2023', semester: '' });
  expect(mockFetch).toHaveBeenCalledWith('/api/v1/reports/accreditation/pdf?cohorte=2023', {
    method: 'GET',
  });
  expect(file.filename).toBe('acreditacion-2023.pdf');
});

test('pide el Excel por la ruta relativa y usa un nombre por defecto', async () => {
  mockFetch.mockResolvedValue(response(200, 'xlsx'));
  const file = await requestAccreditationExport('xlsx', allFilters);
  expect(mockFetch).toHaveBeenCalledWith('/api/v1/reports/accreditation/xlsx', {
    method: 'GET',
  });
  expect(file.filename).toMatch(/^tablero-acreditacion-\d{8}\.xlsx$/);
  expect(file.blob.type).toBe(
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );
});

test('CA-08: un 404 con ACCREDITATION_EMPTY_PERIOD se informa como periodo sin datos', async () => {
  mockFetch.mockResolvedValue(
    response(404, '', {}, { error: { code: 'ACCREDITATION_EMPTY_PERIOD', message: 'Sin datos' } }),
  );
  await expect(requestAccreditationExport('pdf', allFilters)).rejects.toMatchObject({
    reason: 'noData',
    message: 'No hay información para exportar en este periodo',
  });
});

test('cualquier otro 404 se informa como falla', async () => {
  mockFetch.mockResolvedValueOnce(
    response(404, '', {}, { error: { code: 'NOT_FOUND', message: 'Ruta no encontrada' } }),
  );
  await expect(requestAccreditationExport('xlsx', allFilters)).rejects.toMatchObject({
    reason: 'failure',
  });
  mockFetch.mockResolvedValueOnce(response(404));
  await expect(requestAccreditationExport('xlsx', allFilters)).rejects.toMatchObject({
    reason: 'failure',
  });
});

test('una falla del servidor o de red se informa con el mensaje de error', async () => {
  mockFetch.mockResolvedValueOnce(response(500));
  await expect(requestAccreditationExport('pdf', allFilters)).rejects.toThrow(
    'No se pudo generar el archivo. Intente nuevamente',
  );
  mockFetch.mockRejectedValueOnce(new Error('offline'));
  await expect(requestAccreditationExport('pdf', allFilters)).rejects.toBeInstanceOf(
    AccreditationExportError,
  );
});

test('el nombre por defecto lleva la fecha de emisión', () => {
  expect(buildDefaultFilename('pdf', new Date(2026, 10, 14))).toBe(
    'tablero-acreditacion-20261114.pdf',
  );
});