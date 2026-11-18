import { fireEvent, render, screen } from '@testing-library/react';
import { ApiError } from '../services/api-client';
import { applyToJob, getMyJobApplication } from '../services/job-applications';
import { ApplyToVacancyButton } from './apply-to-vacancy-button';

jest.mock('../services/job-applications', () => ({
  applyToJob: jest.fn(),
  getMyJobApplication: jest.fn(),
}));

const getStatus = jest.mocked(getMyJobApplication);
const apply = jest.mocked(applyToJob);

describe('ApplyToVacancyButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('consulta la postulación y ofrece postularse', async () => {
    getStatus.mockResolvedValue({ postulada: false });

    render(<ApplyToVacancyButton vacancyId="vacancy-1" />);

    expect(await screen.findByRole('button', { name: 'Postularme' })).toBeInTheDocument();
    expect(getStatus).toHaveBeenCalledWith('vacancy-1');
  });

  it('muestra la confirmación cuando ya existe postulación', async () => {
    getStatus.mockResolvedValue({ postulada: true });

    render(<ApplyToVacancyButton vacancyId="vacancy-1" />);

    expect(await screen.findByText('Ya te postulaste')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Postularme' })).not.toBeInTheDocument();
  });

  it('registra la postulación y muestra la confirmación', async () => {
    getStatus.mockResolvedValue({ postulada: false });
    apply.mockResolvedValue({ postulada: true, yaExistia: false });

    render(<ApplyToVacancyButton vacancyId="vacancy-1" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Postularme' }));

    expect(await screen.findByText('Ya te postulaste')).toBeInTheDocument();
    expect(apply).toHaveBeenCalledWith('vacancy-1');
  });

  it('deshabilita el botón mientras se envía la postulación', async () => {
    getStatus.mockResolvedValue({ postulada: false });
    let resolveApply: (value: { postulada: boolean; yaExistia: boolean }) => void = () => {};
    apply.mockReturnValue(new Promise((resolve) => { resolveApply = resolve; }));

    render(<ApplyToVacancyButton vacancyId="vacancy-1" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Postularme' }));

    expect(screen.getByRole('button', { name: 'Enviando…' })).toBeDisabled();
    resolveApply({ postulada: true, yaExistia: false });
    expect(await screen.findByText('Ya te postulaste')).toBeInTheDocument();
  });

  it('pide completar el perfil cuando la API responde PROFILE_INCOMPLETE', async () => {
    getStatus.mockResolvedValue({ postulada: false });
    apply.mockRejectedValue(
      new ApiError(409, 'Completa tu perfil para postularte', 'PROFILE_INCOMPLETE'),
    );

    render(<ApplyToVacancyButton vacancyId="vacancy-1" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Postularme' }));

    expect(await screen.findByText('Completa tu perfil para postularte')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Completar perfil' })).toHaveAttribute(
      'href',
      '/profile/completar',
    );
  });

  it('informa vacante no disponible cuando la API responde JOB_POSTING_UNAVAILABLE', async () => {
    getStatus.mockResolvedValue({ postulada: false });
    apply.mockRejectedValue(
      new ApiError(409, 'Esta vacante ya no está disponible', 'JOB_POSTING_UNAVAILABLE'),
    );

    render(<ApplyToVacancyButton vacancyId="vacancy-1" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Postularme' }));

    expect(await screen.findByText('Esta vacante ya no está disponible')).toBeInTheDocument();
  });

  it('decide por código y no por el texto del mensaje', async () => {
    getStatus.mockResolvedValue({ postulada: false });
    apply.mockRejectedValue(new ApiError(500, 'Completa tu perfil para postularte'));

    render(<ApplyToVacancyButton vacancyId="vacancy-1" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Postularme' }));

    expect(await screen.findByText('No pudimos registrar tu postulación')).toBeInTheDocument();
  });

  it('permite reintentar cuando falla la consulta de estado', async () => {
    getStatus
      .mockRejectedValueOnce(new ApiError(503, 'Backend no disponible'))
      .mockResolvedValueOnce({ postulada: false });

    render(<ApplyToVacancyButton vacancyId="vacancy-1" />);

    expect(await screen.findByText('No pudimos consultar tu postulación')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByRole('button', { name: 'Postularme' })).toBeInTheDocument();
    expect(getStatus).toHaveBeenCalledTimes(2);
  });

  it('permite reintentar cuando falla el envío de la postulación', async () => {
    getStatus.mockResolvedValue({ postulada: false });
    apply
      .mockRejectedValueOnce(new ApiError(503, 'Backend no disponible'))
      .mockResolvedValueOnce({ postulada: true, yaExistia: false });

    render(<ApplyToVacancyButton vacancyId="vacancy-1" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Postularme' }));

    expect(await screen.findByText('No pudimos registrar tu postulación')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByText('Ya te postulaste')).toBeInTheDocument();
    expect(apply).toHaveBeenCalledTimes(2);
  });
});
