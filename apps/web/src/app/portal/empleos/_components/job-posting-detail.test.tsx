import { fireEvent, render, screen } from '@testing-library/react';
import type { AvailableJobPostingDetail } from '@umsspira/shared-types';
import { ApiError } from '@/shared/services/api-client';
import { getAvailableJobPosting } from '@/shared/services/available-job-postings';
import { calculateVacancyAffinity } from '@/shared/services/job-posting-affinity';
import { getMyJobApplication } from '@/shared/services/job-applications';
import { JobPostingDetail } from './job-posting-detail';

jest.mock('@/shared/services/available-job-postings', () => ({
  listAvailableJobPostings: jest.fn(),
  getAvailableJobPosting: jest.fn(),
}));

jest.mock('@/shared/services/job-posting-affinity', () => ({
  calculateVacancyAffinity: jest.fn(),
}));

jest.mock('@/shared/services/job-applications', () => ({
  getMyJobApplication: jest.fn(),
  applyToJob: jest.fn(),
}));

const getAvailable = jest.mocked(getAvailableJobPosting);
const calculateAffinity = jest.mocked(calculateVacancyAffinity);
const getMyApplication = jest.mocked(getMyJobApplication);

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
    calculateAffinity.mockResolvedValue({ status: 'insufficient-requirements' });
    getMyApplication.mockResolvedValue({ postulada: false });
  });

  it('ofrece postularse desde el detalle de la vacante', async () => {
    getAvailable.mockResolvedValue(posting);

    render(<JobPostingDetail id="vacancy-1" />);

    expect(await screen.findByRole('button', { name: 'Postularme' })).toBeInTheDocument();
    expect(getMyApplication).toHaveBeenCalledWith('vacancy-1');
  });

  it('ofrece postularse también en la presentación HU-002', async () => {
    getAvailable.mockResolvedValue(posting);
    getMyApplication.mockResolvedValue({ postulada: true });

    render(<JobPostingDetail id="vacancy-1" presentation="hu002" />);

    expect(await screen.findByText('Ya te postulaste')).toBeInTheDocument();
    expect(getMyApplication).toHaveBeenCalledWith('vacancy-1');
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

  it('muestra la presentación HU-002 y reserva afinidad sin inventar un porcentaje', async () => {
    getAvailable.mockResolvedValue(posting);

    render(
      <JobPostingDetail
        id="vacancy-1"
        backHref="/job-postings"
        presentation="hu002"
      />,
    );

    expect(await screen.findByRole('heading', { name: 'Desarrollador' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Tu afinidad con esta oferta' })).toBeInTheDocument();
    expect(await screen.findByText('Afinidad no calculada')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ver comparación' })).not.toBeInTheDocument();
    expect(screen.queryByText(/\d+\s*%/)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Bolsa de Trabajo' })).toHaveAttribute('href', '/job-postings');
  });

  it('separa los requisitos del texto largo y presenta la afinidad calculada', async () => {
    getAvailable.mockResolvedValue({
      ...posting,
      descripcionTecnica: 'Introducción del puesto.\n\n**Conocimientos técnicos requeridos:**\n- React14\n- PostgreSQL',
      requisitos: [],
    });
    calculateAffinity.mockResolvedValue({
      status: 'ready',
      percentage: 100,
      calculatedAt: '2026-11-17T10:00:00.000Z',
      comparison: [
        { requirement: 'React14', matchedSkill: 'React', result: 'similar' },
        { requirement: 'PostgreSQL', matchedSkill: 'SQL', result: 'similar' },
      ],
    });

    render(<JobPostingDetail id="vacancy-1" presentation="hu002" />);

    expect(await screen.findByText('Introducción del puesto.')).toBeInTheDocument();
    expect(screen.getByText('React14')).toBeInTheDocument();
    expect(screen.getByText('PostgreSQL')).toBeInTheDocument();
    expect(screen.queryByText(/Conocimientos técnicos requeridos/)).not.toBeInTheDocument();
    expect(await screen.findByText('100%')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ver comparación' }));
    expect(screen.getByText('Habilidad: React')).toBeInTheDocument();
    expect(screen.getByText('Habilidad: SQL')).toBeInTheDocument();
  });

  it('muestra error y volver a vacantes en la presentación HU-002', async () => {
    getAvailable.mockRejectedValue(new ApiError(503, 'Backend no disponible'));

    render(<JobPostingDetail id="vacancy-1" presentation="hu002" backHref="/job-postings" />);

    expect(await screen.findByText('No pudimos cargar el detalle de la vacante')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver a vacantes' })).toHaveAttribute('href', '/job-postings');
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });
});
