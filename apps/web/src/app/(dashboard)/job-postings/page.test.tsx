import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import JobPostingsPage from './page';
import { getAvailableJobPostings } from '@/shared/services/job-postings';
import type { AvailableJobPosting } from '@/shared/services/job-postings';

jest.mock('@/shared/services/job-postings', () => ({
  getAvailableJobPostings: jest.fn(),
}));

const getPostingsMock = jest.mocked(getAvailableJobPostings);

function posting(
  id: string,
  title: string,
  affinity: number | null,
): AvailableJobPosting {
  return {
    id,
    titulo: title,
    empresa: 'Empresa de prueba',
    logoEmpresa: null,
    descripcion: 'Descripción de vacante de prueba.',
    area: 'Tecnología',
    modalidad: 'REMOTO',
    nivelExperiencia: 'Junior',
    ubicacion: 'Cochabamba',
    fechaPublicacion: '2026-10-01T00:00:00.000Z',
    porcentajeAfinidad: affinity,
  };
}

describe('Bolsa de trabajo', () => {
  beforeEach(() => getPostingsMock.mockReset());

  it('ordena por afinidad, conserva 0% y coloca valores no calculados al final', async () => {
    getPostingsMock.mockResolvedValue([
      posting('4', 'Sin cálculo', null),
      posting('3', 'Vacante sin coincidencia', 0),
      posting('2', 'Zulu', 82),
      posting('1', 'Alpha', 82),
    ]);

    render(<JobPostingsPage />);

    const rows = await screen.findAllByRole('row');
    const rowTexts = rows.slice(1).map((row) => row.textContent ?? '');
    expect(rowTexts[0]).toContain('Alpha');
    expect(rowTexts[1]).toContain('Zulu');
    expect(rowTexts[2]).toContain('0% Afinidad');
    expect(rowTexts[3]).toContain('No calculada');
    expect(screen.getAllByText('82% Afinidad')).toHaveLength(2);
  });

  it('vuelve a consultar y reordena cuando se actualizan los porcentajes', async () => {
    getPostingsMock
      .mockResolvedValueOnce([posting('1', 'Alpha', 20), posting('2', 'Zulu', 70)])
      .mockResolvedValueOnce([posting('1', 'Alpha', 95), posting('2', 'Zulu', 15)]);

    render(<JobPostingsPage />);
    await screen.findByText('70% Afinidad');
    fireEvent.click(screen.getByRole('button', { name: /actualizar resultados/i }));

    await waitFor(() => expect(getPostingsMock).toHaveBeenCalledTimes(2));
    const rows = await screen.findAllByRole('row');
    expect(rows[1]).toHaveTextContent('Alpha');
    expect(rows[1]).toHaveTextContent('95% Afinidad');
    expect(rows[2]).toHaveTextContent('Zulu');
    expect(rows[2]).toHaveTextContent('15% Afinidad');
  });

  it('muestra un estado vacío cuando no hay vacantes', async () => {
    getPostingsMock.mockResolvedValue([]);
    render(<JobPostingsPage />);

    expect(await screen.findByText('Aún no hay vacantes disponibles')).toBeInTheDocument();
  });

  it('no muestra una lista vacía cuando falla la consulta al servidor', async () => {
    getPostingsMock.mockRejectedValue(new Error('No fue posible conectar con el servidor'));
    render(<JobPostingsPage />);

    expect(await screen.findByText('No se pudieron cargar las vacantes.')).toBeInTheDocument();
    expect(screen.queryByText('0 vacantes encontradas')).not.toBeInTheDocument();
    expect(screen.queryByText('Aún no hay vacantes disponibles')).not.toBeInTheDocument();
  });

  it('permite cambiar a orden alfabético de forma predecible', async () => {
    getPostingsMock.mockResolvedValue([posting('2', 'Zulu', 100), posting('1', 'Alpha', 0)]);
    render(<JobPostingsPage />);

    await screen.findByText('100% Afinidad');
    fireEvent.change(screen.getByLabelText('Ordenar vacantes'), { target: { value: 'title' } });
    const rows = await screen.findAllByRole('row');
    expect(within(rows[1]).getByText('Alpha')).toBeInTheDocument();
    expect(within(rows[2]).getByText('Zulu')).toBeInTheDocument();
  });
});
