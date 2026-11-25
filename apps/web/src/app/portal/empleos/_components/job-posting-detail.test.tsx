import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { StrictMode } from 'react';
import type { AvailableJobPostingDetail } from '@umsspira/shared-types';
import { ApiError, apiFetch } from '@/shared/services/api-client';
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

jest.mock('@/shared/services/api-client', () => ({
  ...jest.requireActual('@/shared/services/api-client'),
  apiFetch: jest.fn(),
}));

const getAvailable = jest.mocked(getAvailableJobPosting);
const calculateAffinity = jest.mocked(calculateVacancyAffinity);
const getMyApplication = jest.mocked(getMyJobApplication);
const getProfile = jest.mocked(apiFetch);
const profile = {
  titulado: { id: 'graduate-1' },
  descripcionProfesional: 'React',
  formacionAcademica: { registros: [] },
  experienciaLaboral: { registros: [] },
  certificaciones: { registros: [] },
  proyectos: { registros: [] },
};

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
    getProfile.mockResolvedValue(profile);
    calculateAffinity.mockResolvedValue({
      status: 'no-requirements',
      percentage: null,
      calculatedAt: null,
      comparison: [],
    });
    getMyApplication.mockResolvedValue({ postulada: false });
  });

  it('muestra la vacante antes de que termine la consulta del perfil', async () => {
    getAvailable.mockResolvedValue(posting);
    let resolveProfile!: (value: typeof profile) => void;
    getProfile.mockReturnValue(new Promise((resolve) => { resolveProfile = resolve; }));

    render(<JobPostingDetail id="vacancy-1" presentation="hu002" />);

    expect(await screen.findByRole('heading', { name: 'Desarrollador' })).toBeInTheDocument();
    expect(screen.queryByText('Cargando oferta. Espera un momento...')).not.toBeInTheDocument();
    expect(calculateAffinity).not.toHaveBeenCalled();

    await act(async () => { resolveProfile(profile); });
    await waitFor(() => expect(calculateAffinity).toHaveBeenCalledWith('vacancy-1'));
  });

  it('conserva la afinidad y el modal tras tres refrescos iguales de 30 segundos', async () => {
    getAvailable.mockImplementation(async () => ({ ...posting, requisitos: [...posting.requisitos] }));
    calculateAffinity.mockResolvedValue({
      status: 'ready', percentage: 0, calculatedAt: '2026-11-20T09:00:00.000Z', comparison: [],
    });
    const visibility = Object.getOwnPropertyDescriptor(document, 'visibilityState');
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
    jest.useFakeTimers();
    try {
      render(<JobPostingDetail id="vacancy-1" presentation="hu002" />);
      await act(async () => { await Promise.resolve(); });
      fireEvent.click(screen.getByRole('button', { name: '¿Cómo se calcula?' }));
      for (let cycle = 0; cycle < 3; cycle++) {
        await act(async () => {
          jest.advanceTimersByTime(30_500);
          await Promise.resolve();
        });
      }
      expect(getAvailable).toHaveBeenCalledTimes(4);
      expect(getProfile).toHaveBeenCalledTimes(4);
      expect(calculateAffinity).toHaveBeenCalledTimes(1);
      expect(screen.getByText('0%')).toBeInTheDocument();
      expect(screen.getByRole('dialog', { name: '¿Cómo se calcula?' })).toBeInTheDocument();
      fireEvent.focus(window);
      fireEvent(document, new Event('visibilitychange'));
      await act(async () => { jest.advanceTimersByTime(500); await Promise.resolve(); });
      expect(calculateAffinity).toHaveBeenCalledTimes(1);
      expect(screen.getByRole('dialog', { name: '¿Cómo se calcula?' })).toBeInTheDocument();
    } finally {
      jest.useRealTimers();
      if (visibility) Object.defineProperty(document, 'visibilityState', visibility);
    }
  });

  it('deduplica el cálculo mientras el mismo resultado sigue en vuelo', async () => {
    getAvailable.mockResolvedValue(posting);
    let resolveAffinity!: (value: Awaited<ReturnType<typeof calculateVacancyAffinity>>) => void;
    calculateAffinity.mockImplementation(() => new Promise((resolve) => { resolveAffinity = resolve; }));

    render(
      <StrictMode>
        <JobPostingDetail id="vacancy-1" presentation="hu002" />
      </StrictMode>,
    );

    await waitFor(() => expect(calculateAffinity).toHaveBeenCalledTimes(1));
    await act(async () => {
      resolveAffinity({
        status: 'ready',
        percentage: 100,
        calculatedAt: '2026-11-24T10:00:00.000Z',
        comparison: [],
      });
    });
    expect(await screen.findByText('100%')).toBeInTheDocument();
    expect(calculateAffinity).toHaveBeenCalledTimes(1);
  });

  it('recalcula si el perfil incorpora una sección aunque no aporte texto', async () => {
    getAvailable.mockResolvedValue(posting);
    getProfile.mockResolvedValueOnce(profile).mockResolvedValue({
      ...profile, formacionAcademica: { registros: [{ titulo: '', institucion: '' }] },
    });
    calculateAffinity.mockResolvedValue({
      status: 'ready', percentage: 0, calculatedAt: '2026-11-20T09:00:00.000Z', comparison: [],
    });
    render(<JobPostingDetail id="vacancy-1" presentation="hu002" />);
    await screen.findByText('0%');
    fireEvent.focus(window);
    await waitFor(() => expect(getProfile).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(calculateAffinity).toHaveBeenCalledTimes(2));
  });

  it('no muestra la afinidad de una vacante anterior al cambiar de identificador', async () => {
    getAvailable.mockImplementation(async (id) => ({ ...posting, id }));
    calculateAffinity.mockResolvedValueOnce({
      status: 'ready', percentage: 10, calculatedAt: '2026-11-20T09:00:00.000Z', comparison: [],
    }).mockImplementationOnce(() => new Promise(() => undefined));
    const view = render(<JobPostingDetail id="vacancy-1" presentation="hu002" />);
    await screen.findByText('10%');
    view.rerender(<JobPostingDetail id="vacancy-2" presentation="hu002" />);
    expect(screen.queryByText('10%')).not.toBeInTheDocument();
    await waitFor(() => expect(calculateAffinity).toHaveBeenCalledWith('vacancy-2'));
    expect(screen.queryByText('10%')).not.toBeInTheDocument();
  });

  it('recalcula tras cambiar requisitos o datos relevantes del perfil', async () => {
    getAvailable.mockResolvedValueOnce(posting)
      .mockResolvedValueOnce({ ...posting, requisitos: [{ id: 'new', nombre: 'TypeScript' }] })
      .mockResolvedValue({ ...posting, requisitos: [{ id: 'new', nombre: 'TypeScript' }] });
    getProfile.mockResolvedValueOnce(profile).mockResolvedValueOnce(profile)
      .mockResolvedValue({ ...profile, descripcionProfesional: 'TypeScript' });
    calculateAffinity.mockResolvedValue({
      status: 'ready', percentage: 50, calculatedAt: '2026-11-20T09:00:00.000Z', comparison: [],
    });
    render(<JobPostingDetail id="vacancy-1" presentation="hu002" />);
    await screen.findByText('50%');
    fireEvent.focus(window);
    await waitFor(() => expect(calculateAffinity).toHaveBeenCalledTimes(2));
    fireEvent.focus(window);
    await waitFor(() => expect(calculateAffinity).toHaveBeenCalledTimes(3));
  });

  it('ignora un resultado antiguo cuando cambian los requisitos durante un cálculo lento', async () => {
    let finishOld!: (value: Awaited<ReturnType<typeof calculateVacancyAffinity>>) => void;
    calculateAffinity.mockImplementationOnce(() => new Promise((resolve) => { finishOld = resolve; }))
      .mockResolvedValue({ status: 'ready', percentage: 80, calculatedAt: '2026-11-24T10:00:00.000Z', comparison: [] });
    getAvailable.mockResolvedValueOnce(posting)
      .mockResolvedValue({ ...posting, requisitos: [{ id: 'new', nombre: 'TypeScript' }] });
    render(<JobPostingDetail id="vacancy-1" presentation="hu002" />);
    await waitFor(() => expect(calculateAffinity).toHaveBeenCalledTimes(1));
    fireEvent.focus(window);
    await screen.findByText('80%');
    await act(async () => {
      finishOld({ status: 'ready', percentage: 10, calculatedAt: '2026-11-24T09:00:00.000Z', comparison: [] });
    });
    expect(screen.getByText('80%')).toBeInTheDocument();
    expect(screen.queryByText('10%')).not.toBeInTheDocument();
  });

  it('sale de la espera prolongada con un reintento funcional', async () => {
    calculateAffinity.mockImplementationOnce(() => new Promise(() => undefined))
      .mockResolvedValue({ status: 'ready', percentage: 75, calculatedAt: '2026-11-24T10:00:00.000Z', comparison: [] });
    getAvailable.mockResolvedValue(posting);
    jest.useFakeTimers();
    try {
      render(<JobPostingDetail id="vacancy-1" presentation="hu002" />);
      await act(async () => { await Promise.resolve(); });
      expect(screen.getByText('Calculando afinidad…')).toBeInTheDocument();
      await act(async () => { jest.advanceTimersByTime(60_000); });
      expect(screen.getByText('Afinidad no disponible por ahora')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Reintentar cálculo' }));
      await act(async () => { await Promise.resolve(); });
      expect(screen.getByText('75%')).toBeInTheDocument();
    } finally {
      jest.useRealTimers();
    }
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

  it('calcula afinidad únicamente con los requisitos técnicos guardados', async () => {
    getAvailable.mockResolvedValue({
      ...posting,
      descripcionTecnica: 'Introducción del puesto.\n\n**Conocimientos técnicos requeridos:**\n- React14\n- PostgreSQL',
      requisitos: [
        { id: 'requirement-react', nombre: 'React' },
        { id: 'requirement-postgres', nombre: 'PostgreSQL' },
      ],
    });
    calculateAffinity.mockResolvedValue({
      status: 'ready',
      percentage: 100,
      calculatedAt: '2026-11-17T10:00:00.000Z',
      comparison: [
        { requirement: 'React', matchedSkill: 'React Native', result: 'similar' },
        { requirement: 'PostgreSQL', matchedSkill: 'PostgreSQL avanzado', result: 'similar' },
      ],
    });

    render(<JobPostingDetail id="vacancy-1" presentation="hu002" />);

    expect(await screen.findByText('Introducción del puesto.')).toBeInTheDocument();
    expect(await screen.findByText('100%')).toBeInTheDocument();
    const requirements = screen.getByRole('heading', { name: 'Requisitos técnicos' }).closest('section');
    expect(requirements).not.toBeNull();
    expect(within(requirements!).getByText('React')).toBeVisible();
    expect(within(requirements!).getByText('PostgreSQL')).toBeVisible();
    expect(screen.queryByText(/Conocimientos técnicos requeridos/)).not.toBeInTheDocument();
    const button = screen.getByRole('button', { name: 'Ver comparación' });
    button.focus();
    expect(button).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(button);
    expect(button).toHaveFocus();
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(document.getElementById(button.getAttribute('aria-controls')!)).toHaveTextContent('React Native');
    expect(screen.getByText('Habilidad: React Native')).toBeInTheDocument();
    expect(screen.getByText('Habilidad: PostgreSQL avanzado')).toBeInTheDocument();
  });

  it('abre y cierra la explicación del porcentaje desde el detalle de la vacante', async () => {
    getAvailable.mockResolvedValue(posting);
    calculateAffinity.mockResolvedValue({
      status: 'ready',
      percentage: 67,
      calculatedAt: '2026-11-20T09:00:00.000Z',
      comparison: [
        { requirement: 'Node.js', matchedSkill: 'Node.js', result: 'exact' },
        { requirement: 'PostgreSQL', matchedSkill: 'PostgreSQL', result: 'exact' },
        { requirement: 'Docker', matchedSkill: null, result: 'not-found' },
      ],
    });

    render(<JobPostingDetail id="vacancy-1" presentation="hu002" />);
    fireEvent.click(await screen.findByRole('button', { name: '¿Cómo se calcula?' }));

    expect(screen.getByRole('dialog', { name: '¿Cómo se calcula?' })).toBeInTheDocument();
    expect(screen.getByText('2 de 3 requisitos = 67 %')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Entendido' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '¿Cómo se calcula?' })).toBeInTheDocument();
  });

  it('muestra error y volver a vacantes en la presentación HU-002', async () => {
    getAvailable.mockRejectedValue(new ApiError(503, 'Backend no disponible'));

    render(<JobPostingDetail id="vacancy-1" presentation="hu002" backHref="/job-postings" />);

    expect(await screen.findByText('No pudimos cargar el detalle de la vacante')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver a vacantes' })).toHaveAttribute('href', '/job-postings');
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });
    it('permite reintentar la afinidad sin volver a consultar la vacante', async () => {
    getAvailable.mockResolvedValue(posting);
    calculateAffinity
      .mockRejectedValueOnce(new Error('NLP no disponible'))
      .mockResolvedValueOnce({
        status: 'ready',
        percentage: 80,
        calculatedAt: '2026-11-17T10:00:00.000Z',
        comparison: [],
      });

    render(<JobPostingDetail id="vacancy-1" presentation="hu002" />);

    expect(
      await screen.findByText('Afinidad no disponible por ahora'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.queryByText(/\d+\s*%/)).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: /Reintentar c/ }),
    );

    expect(await screen.findByText('80%')).toBeInTheDocument();
    expect(
      screen.queryByText('Afinidad no disponible por ahora'),
    ).not.toBeInTheDocument();
    expect(calculateAffinity).toHaveBeenCalledTimes(2);
    expect(calculateAffinity).toHaveBeenCalledWith('vacancy-1');
    expect(getAvailable).toHaveBeenCalledTimes(1);
  });

  it('muestra 0% de afinidad cuando el perfil está completo pero no hay coincidencias', async () => {
    getAvailable.mockResolvedValue(posting);
    calculateAffinity.mockResolvedValue({
      status: 'ready',
      percentage: 0,
      calculatedAt: '2026-11-20T12:00:00.000Z',
      comparison: [{ requirement: 'Python', matchedSkill: null, result: 'not-found' }],
    });

    render(<JobPostingDetail id="vacancy-1" presentation="hu002" />);

    expect(await screen.findByText('0%')).toBeInTheDocument();
    expect(screen.queryByText('Afinidad no calculada')).not.toBeInTheDocument();
    expect(screen.queryByText('Completa tu perfil')).not.toBeInTheDocument();
  });

  it('muestra mensaje de completar perfil cuando status es profile-incomplete', async () => {
    getAvailable.mockResolvedValue(posting);
    calculateAffinity.mockResolvedValue({
      status: 'profile-incomplete',
      percentage: null,
      calculatedAt: null,
      comparison: [],
    });

    render(<JobPostingDetail id="vacancy-1" presentation="hu002" />);

    expect(await screen.findByText('Completa tu perfil para conocer tu afinidad')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Completar perfil profesional' })).toHaveAttribute(
      'href',
      '/profile/completar',
    );
    expect(screen.queryByText(/\d+\s*%/)).not.toBeInTheDocument();
  });

  it('muestra mensaje de sin requisitos cuando status es no-requirements', async () => {
    getAvailable.mockResolvedValue(posting);
    calculateAffinity.mockResolvedValue({
      status: 'no-requirements',
      percentage: null,
      calculatedAt: null,
      comparison: [],
    });

    render(<JobPostingDetail id="vacancy-1" presentation="hu002" />);

    expect(await screen.findByText('Afinidad no calculada')).toBeInTheDocument();
    expect(screen.getByText('La oferta no contiene requisitos técnicos identificables para comparar.')).toBeInTheDocument();
    expect(screen.queryByText(/\d+\s*%/)).not.toBeInTheDocument();
  });
});
