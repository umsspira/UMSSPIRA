import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { OcrFinding } from '@umsspira/shared-types';
import { FindingHumanCheck } from './finding-human-check';
import * as boardService from '../services/applications-board.service';

jest.mock('../services/applications-board.service', () => ({
  fetchFindingChecks: jest.fn(),
  saveFindingCheck: jest.fn(),
}));

const mockFinding: OcrFinding = {
  field: 'ci',
  label: 'Cédula de identidad',
  declared: '5918234 CB',
  read: '5918234',
  status: 'POSIBLE_DIFERENCIA',
  reason: 'Falta extensión en el respaldo.',
  evidence: { page: 1, text: 'CI: 5918234', confidence: 0.92 },
};

describe('FindingHumanCheck', () => {
  const fetchMock = boardService.fetchFindingChecks as jest.Mock;
  const saveMock = boardService.saveFindingCheck as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock.mockResolvedValue({ ok: true, data: [] });
    saveMock.mockResolvedValue({
      ok: true,
      data: {
        field: 'ci',
        action: 'CONFIRMADO',
        author: 'admin@umss.edu',
        checkedAt: '2026-11-17T20:00:00.000Z',
        version: 1,
      },
    });
  });

  it('muestra aviso si no hay ningún hallazgo seleccionado', async () => {
    render(<FindingHumanCheck applicationId="app-1" finding={null} />);
    await waitFor(() => {
      expect(screen.getByText(/Selecciona un hallazgo en la tabla/i)).toBeInTheDocument();
    });
  });

  it('presenta por separado el dato declarado y la lectura original de OCR (CA-14.3)', async () => {
    render(<FindingHumanCheck applicationId="app-1" finding={mockFinding} expectedVersion={1} />);

    await waitFor(() => {
      expect(screen.getByText('Comprobación humana: Cédula de identidad')).toBeInTheDocument();
    });
    expect(screen.getByText('Formulario del Titulado (Declarado)')).toBeInTheDocument();
    expect(screen.getByText('5918234 CB')).toBeInTheDocument();
    expect(screen.getByText('Lectura original OCR (No modificable)')).toBeInTheDocument();
    expect(screen.getByText('5918234')).toBeInTheDocument();
  });

  it('permite registrar la acción CONFIRMADO', async () => {
    render(
      <FindingHumanCheck
        applicationId="app-1"
        finding={mockFinding}
        expectedVersion={1}
        currentAuthor="admin@umss.edu"
      />,
    );
    await waitFor(() => {
      expect(screen.getByLabelText(/Confirmar lectura \/ dato/i)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByLabelText(/Confirmar lectura \/ dato/i));
    fireEvent.click(screen.getByRole('button', { name: /Guardar comprobación/i }));

    await waitFor(() => {
      expect(saveMock).toHaveBeenCalledWith(
        'app-1',
        expect.objectContaining({ field: 'ci', action: 'CONFIRMADO' }),
        1,
      );
    });
  });

  it('permite registrar la acción CORREGIDO con el valor comprobado manualmente', async () => {
    saveMock.mockResolvedValueOnce({
      ok: true,
      data: {
        field: 'ci',
        action: 'CORREGIDO',
        verifiedValue: '5918234 CB',
        author: 'admin@umss.edu',
        checkedAt: '2026-11-17T20:00:00.000Z',
        version: 1,
      },
    });

    render(<FindingHumanCheck applicationId="app-1" finding={mockFinding} expectedVersion={1} />);
    await waitFor(() => {
      expect(screen.getByLabelText(/Corregir lectura manualmente/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText(/Corregir lectura manualmente/i));
    fireEvent.change(screen.getByLabelText(/Valor comprobado manualmente/i), {
      target: { value: '5918234 CB' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Guardar comprobación/i }));

    await waitFor(() => {
      expect(saveMock).toHaveBeenCalledWith(
        'app-1',
        expect.objectContaining({ field: 'ci', action: 'CORREGIDO', verifiedValue: '5918234 CB' }),
        1,
      );
    });
  });

  it('exige valor obligatorio al seleccionar CORREGIDO', async () => {
    render(<FindingHumanCheck applicationId="app-1" finding={mockFinding} expectedVersion={1} />);
    await waitFor(() => {
      expect(screen.getByLabelText(/Corregir lectura manualmente/i)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByLabelText(/Corregir lectura manualmente/i));
    fireEvent.click(screen.getByRole('button', { name: /Guardar comprobación/i }));

    expect(await screen.findByText('Debes ingresar el valor comprobado manualmente.')).toBeInTheDocument();
    expect(saveMock).not.toHaveBeenCalled();
  });

  it('exige explicación obligatoria al seleccionar NO_VERIFICABLE', async () => {
    render(<FindingHumanCheck applicationId="app-1" finding={mockFinding} expectedVersion={1} />);
    await waitFor(() => {
      expect(screen.getByLabelText(/Marcar como no verificable/i)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByLabelText(/Marcar como no verificable/i));
    fireEvent.click(screen.getByRole('button', { name: /Guardar comprobación/i }));

    expect(await screen.findByText('Debes indicar la explicación de por qué no es verificable.')).toBeInTheDocument();
    expect(saveMock).not.toHaveBeenCalled();
  });

  it('muestra autor, fecha y comprobación previa al reabrir el expediente (CA-14.3)', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      data: [
        {
          field: 'ci',
          action: 'CORREGIDO',
          verifiedValue: '5918234 CB',
          author: 'lic.perez@umss.edu',
          checkedAt: '2026-11-17T15:30:00.000Z',
          version: 1,
        },
      ],
    });

    render(<FindingHumanCheck applicationId="app-1" finding={mockFinding} expectedVersion={1} />);

    await waitFor(() => {
      expect(screen.getByTestId('saved-check-badge')).toHaveTextContent('✓ Comprobado: CORREGIDO');
    });
    expect(screen.getByTestId('existing-check-info')).toHaveTextContent('lic.perez@umss.edu');
    expect(screen.getByTestId('existing-check-info')).toHaveTextContent('5918234 CB');
    expect(screen.getByRole('button', { name: /Actualizar comprobación/i })).toBeInTheDocument();
  });

  it('muestra aviso de vista desactualizada y desactiva guardado si cambió la versión (CA-14.7)', async () => {
    saveMock.mockResolvedValueOnce({
      ok: false,
      status: 409,
      needsLogin: false,
      message: 'La solicitud cambió; actualiza el expediente.',
    });
    const onRefreshNeeded = jest.fn();

    render(
      <FindingHumanCheck
        applicationId="app-1"
        finding={mockFinding}
        expectedVersion={1}
        onRefreshNeeded={onRefreshNeeded}
      />,
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/Confirmar lectura \/ dato/i)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByLabelText(/Confirmar lectura \/ dato/i));
    fireEvent.click(screen.getByRole('button', { name: /Guardar comprobación/i }));

    expect(await screen.findByText('La solicitud cambió; actualiza el expediente.')).toBeInTheDocument();

    const refreshButton = screen.getByRole('button', { name: /Actualizar expediente/i });
    expect(refreshButton).toBeInTheDocument();
    fireEvent.click(refreshButton);
    expect(onRefreshNeeded).toHaveBeenCalled();
  });
});
