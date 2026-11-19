import { fireEvent, render, screen } from '@testing-library/react';
import type { AvailableJobPosting } from '@umsspira/shared-types';
import { listAvailableJobPostings } from '@/shared/services/available-job-postings';
import { AvailableJobPostingsSection } from './available-job-postings';

jest.mock('@/shared/services/available-job-postings', () => ({
  listAvailableJobPostings: jest.fn(),
  getAvailableJobPosting: jest.fn(),
}));

const listAvailable = jest.mocked(listAvailableJobPostings);

describe('AvailableJobPostingsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('muestra la carga solicitada y un indicador mientras consulta', () => {
    listAvailable.mockReturnValue(new Promise<AvailableJobPosting[]>(() => {}));

    render(<AvailableJobPostingsSection />);

    expect(
      screen.getByText('Cargando vacantes disponibles. Espera un momento...'),
    ).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Cargando' })).toBeInTheDocument();
  });

  it('muestra el estado vacío y el enlace para volver al inicio', async () => {
    listAvailable.mockResolvedValue([]);

    render(<AvailableJobPostingsSection />);

    expect(await screen.findByText('Aún no hay vacantes disponibles')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute(
      'href',
      '/portal',
    );
  });

  it('muestra el error de listado y permite reintentar', async () => {
    listAvailable
      .mockRejectedValueOnce(new Error('fallo de conexión'))
      .mockResolvedValueOnce([
        {
          id: 'vacancy-1',
          titulo: 'Desarrollador',
          empresa: 'Empresa',
          descripcionTecnica: null,
          modalidad: null,
          fechaPublicacion: null,
          requisitos:[],
        },
      ]);

    render(<AvailableJobPostingsSection />);

    expect(await screen.findByText('No pudimos cargar las vacantes')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByRole('link', { name: 'Ver oferta' })).toHaveAttribute(
      'href',
      '/portal/empleos/vacancy-1',
    );
    expect(listAvailable).toHaveBeenCalledTimes(2);
  });

  it('muestra puesto y empresa provenientes del servicio', async () => {
    listAvailable.mockResolvedValue([
      {
        id: 'vacancy-2',
        titulo: 'Analista de datos',
        empresa: 'Empresa registrada',
        descripcionTecnica: 'Descripción técnica',
        modalidad: 'REMOTO',
        fechaPublicacion: '2026-11-16T10:00:00.000Z',
        requisitos:[],
      },
    ]);

    render(<AvailableJobPostingsSection />);

    expect(await screen.findByText('Analista de datos')).toBeInTheDocument();
    expect(screen.getByText('Empresa registrada')).toBeInTheDocument();
  });
});
