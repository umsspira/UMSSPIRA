import { fireEvent, render, screen } from '@testing-library/react';
import type { AvailableJobPosting, JobPostingAffinityBatchItem } from '@umsspira/shared-types';
import { listAvailableJobPostings } from '@/shared/services/available-job-postings';
import { getVacanciesAffinityBatch } from '@/shared/services/job-posting-affinity';
import { JobPostingsList } from './job-postings-list';

jest.mock('@/shared/services/available-job-postings', () => ({
  listAvailableJobPostings: jest.fn(),
}));

jest.mock('@/shared/services/job-posting-affinity', () => ({
  getVacanciesAffinityBatch: jest.fn(),
}));

const listPostings = jest.mocked(listAvailableJobPostings);
const getAffinityBatch = jest.mocked(getVacanciesAffinityBatch);

const posting: AvailableJobPosting = {
  id: 'vacancy-1',
  titulo: 'Desarrollador frontend',
  empresa: 'Empresa',
  descripcionTecnica: [
    'Crear interfaces para la plataforma.',
    '',
    '**Conocimientos técnicos requeridos:**',
    '- React',
    '',
    '**Responsabilidades:**',
    '- Mantener el producto.',
  ].join('\n'),
  modalidad: 'HIBRIDO',
  fechaPublicacion: '2026-11-16T10:00:00.000Z',
  requisitos: [{ id: 'requirement-1', nombre: 'React' }],
};

describe('JobPostingsList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    listPostings.mockResolvedValue([posting]);
    getAffinityBatch.mockResolvedValue({
      'vacancy-1': {
        vacancyId: 'vacancy-1',
        result: {
          status: 'ready',
          percentage: 95,
          calculatedAt: '2026-11-17T10:00:00.000Z',
          comparison: [{ requirement: 'React', matchedSkill: 'React', result: 'exact' }],
        },
        error: null,
      },
    });
  });

  it('muestra la afinidad calculada, una descripción breve y el enlace al detalle', async () => {
    render(<JobPostingsList />);

    expect(await screen.findByText('95% Afinidad')).toBeInTheDocument();
    expect(screen.getByText(/Crear interfaces para la plataforma\./)).toBeInTheDocument();
    expect(screen.queryByText('Conocimientos técnicos requeridos:')).not.toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Modalidad: Híbrido' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver oferta: Desarrollador frontend' })).toHaveAttribute(
      'href',
      '/portal/job-postings/detalle?jobId=vacancy-1',
    );
    expect(getAffinityBatch).toHaveBeenCalledWith(['vacancy-1']);
  });

  it('presenta cada vacante con etiquetas visibles en móvil sin depender de un ancho fijo', async () => {
    render(<JobPostingsList />);

    await screen.findByText('95% Afinidad');
    const table = screen.getByRole('table');
    expect(table).not.toHaveClass('min-w-[850px]');
    expect(table).toHaveClass('block', 'md:table');
    expect(screen.getByRole('cell', { name: /Empresa: Empresa/ })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /Afinidad: 95% Afinidad/ })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /Área laboral: No especificada/ })).toBeInTheDocument();
  });

  it('consulta la afinidad de 50 vacantes en un solo lote', async () => {
    const postings = Array.from({ length: 50 }, (_, index) => ({
      ...posting,
      id: `vacancy-${index}`,
      titulo: `Vacante ${index}`,
    }));
    listPostings.mockResolvedValue(postings);
    getAffinityBatch.mockResolvedValue({});

    render(<JobPostingsList />);

    expect(await screen.findByText('50 vacantes encontradas')).toBeInTheDocument();
    expect(getAffinityBatch).toHaveBeenCalledTimes(1);
    expect(getAffinityBatch).toHaveBeenCalledWith(postings.map(({ id }) => id));
  });

  it('enlaza a proyectos del perfil cuando no hay habilidades disponibles', async () => {
    getAffinityBatch.mockResolvedValue({
      'vacancy-1': {
        vacancyId: 'vacancy-1',
        result: {
          status: 'profile-incomplete',
          percentage: null,
          calculatedAt: null,
          comparison: [],
        },
        error: null,
      },
    });

    render(<JobPostingsList />);

    expect(await screen.findByText('Sin calcular')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Completar perfil profesional/ })).toHaveAttribute(
      'href',
      '/profile/completar',
    );
    expect(screen.getByText(/Completa tu perfil profesional/)).toBeInTheDocument();
  });

  it('muestra el error de carga del perfil y permite reintentar sin recargar vacantes', async () => {
    getAffinityBatch
      .mockRejectedValueOnce(new Error('Ocurrió un error inesperado'))
      .mockResolvedValueOnce({
        'vacancy-1': {
          vacancyId: 'vacancy-1',
          result: {
            status: 'ready',
            percentage: 95,
            calculatedAt: '2026-11-17T10:00:00.000Z',
            comparison: [],
          },
          error: null,
        },
      });

    render(<JobPostingsList />);

    expect(await screen.findByText(/No se pudo cargar el perfil del titulado: Ocurrió un error inesperado/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar afinidad' }));

    expect(await screen.findByText('95% Afinidad')).toBeInTheDocument();
    expect(listPostings).toHaveBeenCalledTimes(1);
    expect(getAffinityBatch).toHaveBeenCalledTimes(2);
  });

  it('filtra por texto y modalidad y alterna el orden entre afinidad y fecha', async () => {
    const recentPosting: AvailableJobPosting = {
      ...posting,
      id: 'vacancy-recent',
      titulo: 'Desarrollador JavaScript',
      empresa: 'Tecno',
      modalidad: 'REMOTO',
      fechaPublicacion: '2026-11-17T10:00:00.000Z',
      requisitos: [{ id: 'recent-react', nombre: 'React' }],
      descripcionTecnica: 'Desarrollo web.\n\n**Conocimientos técnicos requeridos:**\n- React',
    };
    const olderPosting: AvailableJobPosting = {
      ...posting,
      id: 'vacancy-older',
      titulo: 'Analista de Datos',
      empresa: 'Datos S.A.',
      modalidad: 'HIBRIDO',
      fechaPublicacion: '2026-11-15T10:00:00.000Z',
      requisitos: [{ id: 'older-sql', nombre: 'SQL' }],
      descripcionTecnica: 'Análisis de información.\n\n**Conocimientos técnicos requeridos:**\n- SQL',
    };
    listPostings.mockResolvedValue([recentPosting, olderPosting]);
    getAffinityBatch.mockResolvedValue({
      'vacancy-recent': {
        vacancyId: 'vacancy-recent',
        result: {
          status: 'ready',
          percentage: 60,
          calculatedAt: '2026-11-17T10:00:00.000Z',
          comparison: [],
        },
        error: null,
      },
      'vacancy-older': {
        vacancyId: 'vacancy-older',
        result: {
          status: 'ready',
          percentage: 90,
          calculatedAt: '2026-11-17T10:00:00.000Z',
          comparison: [],
        },
        error: null,
      },
    });

    render(<JobPostingsList />);

    expect(await screen.findByText('90% Afinidad')).toBeInTheDocument();
    let rows = screen.getAllByRole('row');
    expect(rows[1]).toHaveTextContent('Analista de Datos');

    fireEvent.change(screen.getByRole('textbox', { name: 'Buscar vacante' }), {
      target: { value: 'DATOS' },
    });
    expect(screen.getAllByRole('row')).toHaveLength(2);
    expect(screen.getAllByRole('row')[1]).toHaveTextContent('Analista de Datos');
    expect(getAffinityBatch).toHaveBeenCalledTimes(1);

    fireEvent.change(screen.getByLabelText('Buscar vacante'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Filtrar por modalidad'), {
      target: { value: 'REMOTO' },
    });
    expect(screen.getAllByRole('row')).toHaveLength(2);
    expect(screen.getAllByRole('row')[1]).toHaveTextContent('Desarrollador JavaScript');

    fireEvent.change(screen.getByLabelText('Filtrar por modalidad'), { target: { value: '' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Ordenar vacantes' }), {
      target: { value: 'recent' },
    });
    rows = screen.getAllByRole('row');
    expect(rows[1]).toHaveTextContent('Desarrollador JavaScript');
    expect(screen.getByText('Ordenadas por fecha de publicación')).toBeInTheDocument();
  });

  it('desempata por ID cuando la afinidad y la fecha coinciden', async () => {
    listPostings.mockResolvedValue([
      { ...posting, id: 'vacancy-b', titulo: 'Vacante B' },
      { ...posting, id: 'vacancy-a', titulo: 'Vacante A' },
    ]);
    getAffinityBatch.mockResolvedValue({
      'vacancy-b': {
        vacancyId: 'vacancy-b',
        result: {
          status: 'ready',
          percentage: 95,
          calculatedAt: '2026-11-17T10:00:00.000Z',
          comparison: [],
        },
        error: null,
      },
      'vacancy-a': {
        vacancyId: 'vacancy-a',
        result: {
          status: 'ready',
          percentage: 95,
          calculatedAt: '2026-11-17T10:00:00.000Z',
          comparison: [],
        },
        error: null,
      },
    });

    render(<JobPostingsList />);

    expect(await screen.findAllByText('95% Afinidad')).toHaveLength(2);

    const rows = screen.getAllByRole('row');
    expect(rows[1]).toHaveTextContent('Vacante A');
    expect(rows[2]).toHaveTextContent('Vacante B');
  });

  it('muestra el estado vacío y deshabilita el selector de orden', async () => {
    listPostings.mockResolvedValue([]);

    render(<JobPostingsList />);

    expect(
      await screen.findByRole('heading', {
        name: /no hay vacantes disponibles/,
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole('combobox', { name: 'Ordenar vacantes' }),
    ).toBeDisabled();

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('muestra Sin calcular cuando falla la carga de afinidad', async () => {
    getAffinityBatch.mockRejectedValueOnce(new Error('Servicio no disponible'));

    render(<JobPostingsList />);

    expect(await screen.findByText('Sin calcular')).toBeInTheDocument();
    expect(screen.getByText(posting.titulo)).toBeInTheDocument();
    expect(screen.queryByText('95% Afinidad')).not.toBeInTheDocument();
  });

  it('mantiene 0 % antes de las vacantes sin cálculo y conserva su asociación', async () => {
    listPostings.mockResolvedValue([
      {
        ...posting,
        id: 'vacancy-pending',
        titulo: 'Vacante sin cálculo',
        descripcionTecnica: null,
        requisitos: [],
      },
      {
        ...posting,
        id: 'vacancy-zero',
        titulo: 'Vacante cero',
        descripcionTecnica: null,
        requisitos: [{ id: 'stored-python', nombre: 'Python' }],
      },
      {
        ...posting,
        id: 'vacancy-high',
        titulo: 'Vacante alta',
      },
    ]);

    getAffinityBatch.mockResolvedValue({
      'vacancy-pending': {
        vacancyId: 'vacancy-pending',
        result: {
          status: 'no-requirements',
          percentage: null,
          calculatedAt: null,
          comparison: [],
        },
        error: null,
      },
      'vacancy-zero': {
        vacancyId: 'vacancy-zero',
        result: {
          status: 'ready',
          percentage: 0,
          calculatedAt: '2026-11-17T10:00:00.000Z',
          comparison: [],
        },
        error: null,
      },
      'vacancy-high': {
        vacancyId: 'vacancy-high',
        result: {
          status: 'ready',
          percentage: 90,
          calculatedAt: '2026-11-17T10:00:00.000Z',
          comparison: [],
        },
        error: null,
      },
    });

    render(<JobPostingsList />);

    expect(await screen.findByText('90% Afinidad')).toBeInTheDocument();

    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(4);
    expect(rows[1]).toHaveTextContent('Vacante alta');
    expect(rows[1]).toHaveTextContent('90% Afinidad');
    expect(rows[2]).toHaveTextContent('Vacante cero');
    expect(rows[2]).toHaveTextContent('0% Afinidad');
    expect(rows[3]).toHaveTextContent('Vacante sin cálculo');
    expect(rows[3]).toHaveTextContent('Sin requisitos');
  });

  it('actualiza disponibilidad y afinidades al consultar nuevamente', async () => {
    const removedPosting = {
      ...posting,
      id: 'vacancy-removed',
      titulo: 'Vacante retirada',
      descripcionTecnica: null,
      requisitos: [{ id: 'stored-python', nombre: 'Python' }],
    };
    const remainingPosting = {
      ...posting,
      id: 'vacancy-remaining',
      titulo: 'Vacante vigente',
    };

    listPostings
      .mockResolvedValueOnce([removedPosting, remainingPosting])
      .mockResolvedValueOnce([remainingPosting]);

    getAffinityBatch
      .mockResolvedValueOnce({
        'vacancy-removed': {
          vacancyId: 'vacancy-removed',
          result: {
            status: 'ready',
            percentage: 95,
            calculatedAt: '2026-11-17T10:00:00.000Z',
            comparison: [],
          },
          error: null,
        },
        'vacancy-remaining': {
          vacancyId: 'vacancy-remaining',
          result: {
            status: 'ready',
            percentage: 40,
            calculatedAt: '2026-11-17T10:00:00.000Z',
            comparison: [],
          },
          error: null,
        },
      })
      .mockResolvedValueOnce({
        'vacancy-remaining': {
          vacancyId: 'vacancy-remaining',
          result: {
            status: 'ready',
            percentage: 80,
            calculatedAt: '2026-11-17T10:00:00.000Z',
            comparison: [],
          },
          error: null,
        },
      });

    render(<JobPostingsList />);

    expect(await screen.findByText('95% Afinidad')).toBeInTheDocument();
    expect(screen.getByText('40% Afinidad')).toBeInTheDocument();
    expect(screen.getAllByRole('row')[1]).toHaveTextContent('Vacante retirada');

    fireEvent.click(
      screen.getByRole('button', { name: 'Actualizar vacantes' }),
    );

    expect(await screen.findByText('80% Afinidad')).toBeInTheDocument();
    expect(screen.queryByText('Vacante retirada')).not.toBeInTheDocument();
    expect(screen.queryByText('40% Afinidad')).not.toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(2);
    expect(screen.getAllByRole('row')[1]).toHaveTextContent('Vacante vigente');
    expect(listPostings).toHaveBeenCalledTimes(2);
    expect(getAffinityBatch).toHaveBeenCalledTimes(2);
  });

  it('muestra error individual de cálculo en badge si falla una vacante', async () => {
    listPostings.mockResolvedValue([posting]);
    getAffinityBatch.mockResolvedValue({
      'vacancy-1': {
        vacancyId: 'vacancy-1',
        result: null,
        error: {
          code: 'AFFINITY_CALCULATION_FAILED',
          message: 'Error en motor',
          retryable: true,
        },
      },
    });

    render(<JobPostingsList />);

    expect(await screen.findByText('Error de cálculo')).toBeInTheDocument();
    expect(screen.queryByText('0% Afinidad')).not.toBeInTheDocument();
  });
});
