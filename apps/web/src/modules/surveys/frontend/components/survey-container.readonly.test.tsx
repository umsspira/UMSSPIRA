import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SurveyContainer } from './survey-container';
import { getMySurveyStatus, submitSurvey } from '../services/surveys.service';

jest.mock('next/image', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  return {
    __esModule: true,
    default: ({ src, alt, width, height }: {
      src: string; alt: string; width?: number; height?: number;
    }) => React.createElement('img', { src, alt, width, height }),
  };
});

jest.mock('next/navigation', () => ({ useRouter: () => ({ back: jest.fn() }) }));
jest.mock('../hooks/use-survey-user-id', () => ({ useSurveyUserId: () => 'test-person' }));
jest.mock('../services/surveys.service', () => ({
  ...jest.requireActual('../services/surveys.service'),
  getMySurveyStatus: jest.fn(),
  submitSurvey: jest.fn(),
}));
const mockGet = getMySurveyStatus as jest.Mock;
const mockSubmit = submitSurvey as jest.Mock;

beforeEach(() => {
  mockGet.mockReset();
  mockSubmit.mockReset();
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe('T1.2/T3.4: respuesta persistida en modo lectura', () => {
  it('hidrata los datos enviados y no permite cambiar Trabaja por No trabaja', async () => {
    mockGet.mockResolvedValue({ responded: true, response: {
      condicion_laboral: true, cargo: 'Analista guardado', empresa: 'UMSS',
      area: 'Sistemas', modalidad: 'Remoto', salario_mensual: '3.000–5.000',
      tiempo_insercion: '6',
    } });
    render(<SurveyContainer />);
    expect(screen.getByRole('button', { name: /Siguiente/ })).toBeDisabled();
    await screen.findByText('Encuesta ya registrada');
    const works = screen.getByRole('radio', { name: /^Trabaja/ });
    const notWorks = screen.getByRole('radio', { name: /^No trabaja/ });
    expect(works).toBeChecked();
    expect(works).toBeDisabled();
    expect(notWorks).toBeDisabled();
    expect(screen.getByDisplayValue('Analista guardado')).toBeDisabled();
    expect(screen.getByDisplayValue('6')).toBeDisabled();
    fireEvent.click(notWorks);
    expect(works).toBeChecked();
    expect(screen.getByDisplayValue('Analista guardado')).toBeInTheDocument();
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('bloquea una respuesta No trabaja registrada tras recargar', async () => {
    mockGet.mockResolvedValue({ responded: true, response: {
      condicion_laboral: false, cargo: null, empresa: null, area: null,
      modalidad: null, salario_mensual: null, tiempo_insercion: null,
    } });
    render(<SurveyContainer />);
    await screen.findByText('Encuesta ya registrada');
    expect(screen.getByRole('radio', { name: /^No trabaja/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: /^No trabaja/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Siguiente/ })).toBeDisabled();
  });

  it('si POST devuelve 409 presenta éxito y recupera la respuesta anterior, no la temporal', async () => {
    // El servicio submitSurvey traduce 409 a éxito según CA-04.
    mockGet.mockResolvedValueOnce({ responded: false, response: null });
    mockGet.mockResolvedValueOnce({ responded: true, response: {
      condicion_laboral: true, cargo: 'Cargo persistido', empresa: 'UMSS',
      area: 'Sistemas', modalidad: 'Remoto', salario_mensual: '3.000–5.000',
      tiempo_insercion: '6',
    } });
    mockSubmit.mockResolvedValueOnce(undefined);
    render(<SurveyContainer />);
    await waitFor(() => expect(screen.getByRole('radio', { name: /^No trabaja/ })).toBeEnabled());
    fireEvent.click(screen.getByRole('radio', { name: /^No trabaja/ }));
    fireEvent.click(screen.getByRole('button', { name: /Siguiente/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar y enviar' }));
    await screen.findByRole('dialog', { name: 'Encuesta enviada correctamente' });
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    await waitFor(() => expect(screen.getByDisplayValue('Cargo persistido')).toBeDisabled());
    expect(screen.getByRole('radio', { name: /^Trabaja/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: /^No trabaja/ })).toBeDisabled();
    expect(mockSubmit).toHaveBeenCalledTimes(1);
  });

  it('si GET devuelve error conserva el formulario bloqueado', async () => {
    mockGet.mockRejectedValueOnce(new Error('HTTP 503'));
    mockGet.mockResolvedValueOnce({ responded: false, response: null });
    render(<SurveyContainer />);
    await screen.findByText('No se pudo verificar el estado de la encuesta.');
    expect(screen.getByRole('radio', { name: /^Trabaja/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Siguiente/ })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /Reintentar consulta/ }));
    await waitFor(() => expect(screen.getByRole('radio', { name: /^Trabaja/ })).toBeEnabled());
  });
});
