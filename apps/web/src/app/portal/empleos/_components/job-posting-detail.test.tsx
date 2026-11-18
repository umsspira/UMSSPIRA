import { fireEvent, render, screen } from '@testing-library/react';
import type { AvailableJobPostingDetail } from '@umsspira/shared-types';
import { ApiError } from '@/shared/services/api-client';
import { getAvailableJobPosting } from '@/shared/services/available-job-postings';
import { JobPostingDetail } from './job-posting-detail';

jest.mock('@/shared/services/available-job-postings', () => ({
  listAvailableJobPostings: jest.fn(),
  getAvailableJobPosting: jest.fn(),
}));

const getAvailable = jest.mocked(getAvailableJobPosting);

const posting: AvailableJobPostingDetail = {
  id: 'vacancy-1',
  titulo: 'Desarrollador',
  empresa: 'Empresa',
  fechaPublicacion: '2026-11-16T10:00:00.000Z',
  descripcionTecnica: 'Descripción registrada',
  modalidad: 'REMOTO',
  nivelExperiencia: 'JUNIOR',
  requisitos: [{ id: 'requirement-1', nombre: 'Python' }],
};

describe('JobPostingDetail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('carga y muestra detalle y requisitos de la oferta seleccionada', async () => {
    getAvailable.mockResolvedValue(posting);

    render(<JobPostingDetail id="vacancy-1" />);

    expect(await screen.findByRole('heading', { name: 'Desarrollador' })).toBeInTheDocument();
    expect(screen.getByText('Empresa')).toBeInTheDocument();
    expect(screen.getByText('Descripción registrada')).toBeInTheDocument();
    expect(screen.getByText('Python')).toBeInTheDocument();
    expect(getAvailable).toHaveBeenCalledWith('vacancy-1');
  });

  it('muestra el mensaje definido cuando no hay requisitos técnicos', async () => {
    getAvailable.mockResolvedValue({ ...posting, requisitos: [] });

    render(<JobPostingDetail id="vacancy-1" />);

    expect(
      await screen.findByText(
        'Esta vacante no requiere conocimientos técnicos específicos',
      ),
    ).toBeInTheDocument();
  });

  it('muestra 404 sin información de otras vacantes', async () => {
    getAvailable.mockRejectedValue(new ApiError(404, 'Vacante no encontrada'));

    render(<JobPostingDetail id="missing" />);

    expect(
      await screen.findByText('Esta vacante no existe o ya no está disponible'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Otra vacante')).not.toBeInTheDocument();
  });

  it('muestra un error amigable de requisitos y permite reintentar', async () => {
    getAvailable
      .mockRejectedValueOnce(new ApiError(503, 'Backend no disponible'))
      .mockResolvedValueOnce(posting);

    render(<JobPostingDetail id="vacancy-1" />);

    expect(await screen.findByText('No pudimos cargar los requisitos')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByRole('heading', { name: 'Desarrollador' })).toBeInTheDocument();
    expect(getAvailable).toHaveBeenCalledTimes(2);
  });
});
