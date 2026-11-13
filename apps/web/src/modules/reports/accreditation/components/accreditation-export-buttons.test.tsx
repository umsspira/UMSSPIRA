import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AccreditationExportButtons } from './accreditation-export-buttons';
import {
  AccreditationExportError,
  requestAccreditationExport,
  saveExportFile,
} from '../services/accreditation-export.service';

jest.mock('../services/accreditation-export.service', () => {
  const actual = jest.requireActual('../services/accreditation-export.service');
  return {
    ...actual,
    requestAccreditationExport: jest.fn(),
    saveExportFile: jest.fn(),
  };
});

const mockRequest = requestAccreditationExport as jest.MockedFunction<
  typeof requestAccreditationExport
>;
const mockSave = saveExportFile as jest.MockedFunction<typeof saveExportFile>;

const filters = { cohort: '2023', semester: '' };
const file = { blob: new Blob(['x']), filename: 'tablero.pdf' };

beforeEach(() => {
  mockRequest.mockReset();
  mockSave.mockReset();
});

test('muestra los botones «Exportar PDF» y «Exportar Excel»', () => {
  render(<AccreditationExportButtons filters={filters} hasData />);
  expect(screen.getByRole('button', { name: 'Exportar PDF' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Exportar Excel' })).toBeInTheDocument();
});

test('CA-01: muestra «Generando…» mientras se prepara el PDF y luego lo descarga', async () => {
  let resolve!: (value: typeof file) => void;
  mockRequest.mockReturnValue(new Promise((r) => (resolve = r)));
  render(<AccreditationExportButtons filters={filters} hasData />);

  fireEvent.click(screen.getByRole('button', { name: 'Exportar PDF' }));

  expect(screen.getByRole('button', { name: 'Generando…' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Exportar Excel' })).toBeDisabled();
  expect(mockRequest).toHaveBeenCalledWith('pdf', filters, undefined);

  await act(async () => resolve(file));
  expect(mockSave).toHaveBeenCalledWith(file);
  expect(screen.getByRole('button', { name: 'Exportar PDF' })).toBeEnabled();
});

test('CA-05: «Exportar Excel» pide el archivo .xlsx con los filtros aplicados', async () => {
  mockRequest.mockResolvedValue({ ...file, filename: 'tablero.xlsx' });
  render(<AccreditationExportButtons filters={filters} hasData />);
  fireEvent.click(screen.getByRole('button', { name: 'Exportar Excel' }));
  await waitFor(() => expect(mockSave).toHaveBeenCalled());
  expect(mockRequest).toHaveBeenCalledWith('xlsx', filters, undefined);
});

test('CA-08: sin datos en el periodo muestra el aviso y no descarga nada', () => {
  render(<AccreditationExportButtons filters={filters} hasData={false} />);
  fireEvent.click(screen.getByRole('button', { name: 'Exportar PDF' }));
  expect(screen.getByRole('status')).toHaveTextContent(
    'No hay información para exportar en este periodo',
  );
  expect(mockRequest).not.toHaveBeenCalled();
  expect(mockSave).not.toHaveBeenCalled();
});

test('CA-08: si el backend responde sin datos, muestra el aviso', async () => {
  mockRequest.mockRejectedValue(new AccreditationExportError('noData'));
  render(<AccreditationExportButtons filters={filters} hasData />);
  fireEvent.click(screen.getByRole('button', { name: 'Exportar Excel' }));
  expect(await screen.findByRole('status')).toHaveTextContent(
    'No hay información para exportar en este periodo',
  );
  expect(mockSave).not.toHaveBeenCalled();
});

test('ante una falla muestra «No se pudo generar el archivo. Intente nuevamente»', async () => {
  mockRequest.mockRejectedValue(new AccreditationExportError('failure'));
  render(<AccreditationExportButtons filters={filters} hasData />);
  fireEvent.click(screen.getByRole('button', { name: 'Exportar PDF' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'No se pudo generar el archivo. Intente nuevamente',
  );
  expect(screen.getByRole('button', { name: 'Exportar PDF' })).toBeEnabled();
});