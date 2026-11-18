import { fireEvent, render, screen } from '@testing-library/react';
import type { AvailableJobPosting } from '@umsspira/shared-types';
import { listAvailableJobPostings } from '@/shared/services/available-job-postings';
import {
  calculateVacancyAffinityWithSkills,
  loadTituladoSkills,
} from '@/shared/services/job-posting-affinity';
import { JobPostingsList } from './job-postings-list';

jest.mock('@/shared/services/available-job-postings', () => ({
  listAvailableJobPostings: jest.fn(),
}));

jest.mock('@/shared/services/job-posting-affinity', () => ({
  calculateVacancyAffinityWithSkills: jest.fn(),
  loadTituladoSkills: jest.fn(),
}));

const listPostings = jest.mocked(listAvailableJobPostings);
const loadSkills = jest.mocked(loadTituladoSkills);
const calculateAffinity = jest.mocked(calculateVacancyAffinityWithSkills);

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
};

describe('JobPostingsList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    listPostings.mockResolvedValue([posting]);
    loadSkills.mockResolvedValue({ status: 'ready', skills: ['React'] });
    calculateAffinity.mockReturnValue({
      status: 'ready',
      percentage: 95,
      calculatedAt: '2026-11-17T10:00:00.000Z',
      comparison: [{ requirement: 'React', matchedSkill: 'React', result: 'exact' }],
    });
  });

  it('muestra la afinidad calculada, una descripción breve y el enlace al detalle', async () => {
    render(<JobPostingsList />);

    expect(await screen.findByText('95% Afinidad')).toBeInTheDocument();
    expect(screen.getByText(/Crear interfaces para la plataforma\./)).toBeInTheDocument();
    expect(screen.queryByText('Conocimientos técnicos requeridos:')).not.toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Híbrido' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver oferta' })).toHaveAttribute(
      'href',
      '/portal/empleos/vacancy-1',
    );
    expect(calculateAffinity).toHaveBeenCalledWith(
      [{ id: 'vacancy-1-requirement-1', nombre: 'React' }],
      ['React'],
    );
  });

  it('enlaza a proyectos del perfil cuando no hay habilidades disponibles', async () => {
    loadSkills.mockResolvedValue({ status: 'profile-incomplete' });
    calculateAffinity.mockReturnValue({ status: 'profile-incomplete' });

    render(<JobPostingsList />);

    expect(await screen.findByText('Sin calcular')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Agrega tus habilidades al perfil' })).toHaveAttribute(
      'href',
      '/profile/completar?seccion=proyectos',
    );
    expect(screen.getByText('Agrega habilidades a tu perfil para calcular la afinidad')).toBeInTheDocument();
  });

  it('muestra el error de carga del perfil y permite reintentar sin recargar vacantes', async () => {
    loadSkills
      .mockRejectedValueOnce(new Error('Ocurrió un error inesperado'))
      .mockResolvedValueOnce({ status: 'ready', skills: ['React'] });

    render(<JobPostingsList />);

    expect(await screen.findByText(/No se pudo cargar el perfil del titulado: Ocurrió un error inesperado/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar afinidad' }));

    expect(await screen.findByText('95% Afinidad')).toBeInTheDocument();
    expect(listPostings).toHaveBeenCalledTimes(1);
  });

  it('filtra por texto y modalidad y alterna el orden entre afinidad y fecha', async () => {
    const recentPosting: AvailableJobPosting = {
      ...posting,
      id: 'vacancy-recent',
      titulo: 'Desarrollador JavaScript',
      empresa: 'Tecno',
      modalidad: 'REMOTO',
      fechaPublicacion: '2026-11-17T10:00:00.000Z',
      descripcionTecnica: 'Desarrollo web.\n\n**Conocimientos técnicos requeridos:**\n- React',
    };
    const olderPosting: AvailableJobPosting = {
      ...posting,
      id: 'vacancy-older',
      titulo: 'Analista de Datos',
      empresa: 'Datos S.A.',
      modalidad: 'HIBRIDO',
      fechaPublicacion: '2026-11-15T10:00:00.000Z',
      descripcionTecnica: 'Análisis de información.\n\n**Conocimientos técnicos requeridos:**\n- SQL',
    };
    listPostings.mockResolvedValue([recentPosting, olderPosting]);
    calculateAffinity.mockImplementation((requirements) => ({
      status: 'ready',
      percentage: requirements[0]?.nombre === 'SQL' ? 90 : 60,
      calculatedAt: '2026-11-17T10:00:00.000Z',
      comparison: [],
    }));

    render(<JobPostingsList />);

    expect(await screen.findByText('90% Afinidad')).toBeInTheDocument();
    let rows = screen.getAllByRole('row');
    expect(rows[1]).toHaveTextContent('Analista de Datos');

    fireEvent.change(screen.getByRole('textbox', { name: 'Buscar vacante' }), {
      target: { value: 'DATOS' },
    });
    expect(screen.getAllByRole('row')).toHaveLength(2);
    expect(screen.getAllByRole('row')[1]).toHaveTextContent('Analista de Datos');

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

    render(<JobPostingsList />);

    // Espera a que termine el cálculo de ambas vacantes.
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
        name: 'Aún no hay vacantes disponibles',
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole('combobox', { name: 'Ordenar vacantes' }),
    ).toBeDisabled();

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
    it('muestra Sin calcular cuando falla la carga del perfil', async () => {
    loadSkills.mockRejectedValueOnce(new Error('Servicio no disponible'));

    render(<JobPostingsList />);

    expect(await screen.findByText('Sin calcular')).toBeInTheDocument();
    expect(screen.getByText(posting.titulo)).toBeInTheDocument();
    expect(screen.queryByText('95% Afinidad')).not.toBeInTheDocument();
  });

  it('mantiene 0 % antes de las vacantes sin cálculo y conserva su asociación', async () => {
    listPostings.mockResolvedValue([
      { ...posting, id: 'vacancy-pending', titulo: 'Vacante sin cálculo' },
      { ...posting, id: 'vacancy-zero', titulo: 'Vacante cero' },
      { ...posting, id: 'vacancy-high', titulo: 'Vacante alta' },
    ]);

    calculateAffinity.mockImplementation((requirements) => {
      const id = requirements[0]?.id ?? '';

      if (id.startsWith('vacancy-pending-')) {
        return { status: 'insufficient-requirements' };
      }

      return {
        status: 'ready',
        percentage: id.startsWith('vacancy-zero-') ? 0 : 90,
        calculatedAt: '2026-11-17T10:00:00.000Z',
        comparison: [],
      };
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
    expect(rows[3]).toHaveTextContent('Sin calcular');
  });
    it('actualiza disponibilidad y afinidades al consultar nuevamente', async () => {
    const removedPosting = {
      ...posting,
      id: 'vacancy-removed',
      titulo: 'Vacante retirada',
    };
    const remainingPosting = {
      ...posting,
      id: 'vacancy-remaining',
      titulo: 'Vacante vigente',
    };

    listPostings
      .mockResolvedValueOnce([removedPosting, remainingPosting])
      .mockResolvedValueOnce([remainingPosting]);

    loadSkills
      .mockResolvedValueOnce({ status: 'ready', skills: ['React'] })
      .mockResolvedValueOnce({ status: 'ready', skills: ['SQL'] });

    calculateAffinity.mockImplementation((requirements, skills) => ({
      status: 'ready',
      percentage: skills.includes('SQL')
        ? 80
        : requirements[0]?.id.startsWith('vacancy-removed-')
          ? 95
          : 40,
      calculatedAt: '2026-11-17T10:00:00.000Z',
      comparison: [],
    }));

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
    expect(loadSkills).toHaveBeenCalledTimes(2);
  });
});
