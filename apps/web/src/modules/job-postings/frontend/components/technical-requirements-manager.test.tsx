import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { TechnicalRequirementsForVacancy } from '@umsspira/shared-types';
import {
  getTechnicalRequirements,
  saveTechnicalRequirements,
} from '../services/technical-requirements.service';
import { TechnicalRequirementsManager } from './technical-requirements-manager';

jest.mock('next/navigation', () => {
  const router = { replace: jest.fn() };
  return { useRouter: () => router };
});

jest.mock('../services/technical-requirements.service', () => ({
  getTechnicalRequirements: jest.fn(),
  saveTechnicalRequirements: jest.fn(),
}));

const mockGetRequirements = jest.mocked(getTechnicalRequirements);
const mockSaveRequirements = jest.mocked(saveTechnicalRequirements);

const emptyRequirements: TechnicalRequirementsForVacancy = {
  vacanteId: 'vacancy-id',
  vacanteTitulo: 'Desarrollador de software',
  requisitos: [],
};

function fillNewRequirement(competency: string) {
  fireEvent.change(screen.getByLabelText(/Competencia técnica/i, { selector: 'input' }), {
    target: { value: competency },
  });
  fireEvent.change(screen.getByLabelText(/Nivel esperado/i, { selector: 'select' }), {
    target: { value: 'AVANZADO' },
  });
}

describe('TechnicalRequirementsManager', () => {
  beforeEach(() => {
    mockGetRequirements.mockReset().mockResolvedValue(emptyRequirements);
    mockSaveRequirements.mockReset().mockImplementation(async (_vacancyId, requirements) => ({
      ...emptyRequirements,
      requisitos: requirements.map((requirement, index) => ({
        ...requirement,
        id: `requirement-${index}`,
        fechaCreacion: '2026-01-01T00:00:00.000Z',
      })),
    }));
  });

  it('agrega, deduplica, edita, quita y guarda la lista completa', async () => {
    render(<TechnicalRequirementsManager vacancyId="vacancy-id" />);
    expect(await screen.findByText('Desarrollador de software')).toBeTruthy();

    fillNewRequirement('SQL');
    fireEvent.click(screen.getByRole('button', { name: 'Agregar requisito' }));
    expect(await screen.findByText('SQL')).toBeTruthy();

    fillNewRequirement(' sql ');
    fireEvent.click(screen.getByRole('button', { name: 'Agregar requisito' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Esa competencia técnica ya está agregada a esta vacante.',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Editar SQL' }));
    fireEvent.change(
      screen.getByLabelText(/Competencia técnica/i, {
        selector: '#edit-requirement-competency',
      }),
      {
        target: { value: 'PostgreSQL' },
      },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(await screen.findByText('PostgreSQL')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Quitar PostgreSQL' }));
    expect(screen.getByText('Aún no agregaste requisitos')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Guardar requisitos' }));

    await waitFor(() => {
      expect(mockSaveRequirements).toHaveBeenCalledWith('vacancy-id', []);
    });
    expect(
      await screen.findByText('Los requisitos técnicos se guardaron correctamente.'),
    ).toBeTruthy();
  });
});
