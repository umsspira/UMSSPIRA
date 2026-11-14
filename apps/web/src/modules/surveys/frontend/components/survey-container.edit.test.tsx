import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';

import { ApiError } from '@/shared/services/api-client';

import { SurveyContainer } from './survey-container';

import {
  getMySurveyResponse,
  getSurveySubmissionStatus,
  updateMySurveyResponse,
} from '../services/surveys.service';

jest.mock('../services/surveys.service', () => ({
  ...jest.requireActual('../services/surveys.service'),

  getSurveySubmissionStatus: jest.fn(),

  getMySurveyResponse: jest.fn(),

  updateMySurveyResponse: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    back: jest.fn(),
    push: jest.fn(),
  }),
}));

jest.mock('../hooks/use-survey-user-id', () => ({
  useSurveyUserId: () => 'user-1',
}));

jest.mock('../hooks/use-survey-submit', () => ({
  useSurveySubmit: () => ({
    isSubmitting: false,
    status: 'idle',
    message: null,
    submit: jest.fn(),
    resetFeedback: jest.fn(),
  }),
}));

const mockedSubmissionStatus =
  getSurveySubmissionStatus as jest.MockedFunction<
    typeof getSurveySubmissionStatus
  >;

const mockedGetMySurveyResponse =
  getMySurveyResponse as jest.MockedFunction<
    typeof getMySurveyResponse
  >;

const mockedUpdateMySurveyResponse =
  updateMySurveyResponse as jest.MockedFunction<
    typeof updateMySurveyResponse
  >;

const RECORDED_RESPONSE = {
  condicion_laboral: true,
  cargo: 'Analista',
  empresa: 'Acme',
  area: 'Sistemas',
  modalidad: 'Remoto',
  salario_mensual: '3.000–5.000',
  tiempo_insercion: '6',
};

beforeEach(() => {
  jest.clearAllMocks();

  window.localStorage.clear();
  window.sessionStorage.clear();

  mockedSubmissionStatus.mockResolvedValue(true);

  mockedGetMySurveyResponse.mockResolvedValue(
    RECORDED_RESPONSE,
  );

  mockedUpdateMySurveyResponse.mockResolvedValue();
});

async function renderSubmittedSurvey() {
  render(<SurveyContainer />);

  await screen.findByText(
    'Esta encuesta ya fue enviada.',
  );

  await screen.findByRole('button', {
    name: 'Editar respuestas',
  });
}

async function startEditing() {
  await renderSubmittedSurvey();

  fireEvent.click(
    screen.getByRole('button', {
      name: 'Editar respuestas',
    }),
  );
}

describe('SurveyContainer · HU-006 · edición única', () => {
  it('CA-01 muestra el resumen y el botón Editar respuestas', async () => {
    await renderSubmittedSurvey();

    expect(
      screen.getByText('Resumen de tu encuesta'),
    ).toBeInTheDocument();

    expect(
      screen.getByText('Analista'),
    ).toBeInTheDocument();

    expect(
      screen.getByRole('button', {
        name: 'Editar respuestas',
      }),
    ).toBeInTheDocument();
  });

  it('CA-02 y CA-03 precarga las respuestas y muestra el aviso de edición única', async () => {
    await startEditing();

    expect(
      screen.getByText(
        'Solo puede editar esta encuesta una vez',
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByPlaceholderText(
        'Ej. Analista de sistemas',
      ),
    ).toHaveValue('Analista');

    expect(
      screen.getByPlaceholderText(
        'Ej. Nombre de la empresa',
      ),
    ).toHaveValue('Acme');

    expect(
      screen.getByPlaceholderText(
        'Ej. Desarrollo de software',
      ),
    ).toHaveValue('Sistemas');

    expect(
      screen.getByPlaceholderText('Ej. 6'),
    ).toHaveValue('6');

    expect(
      screen.getByRole('radio', {
        name: 'Remoto',
      }),
    ).toHaveAttribute('aria-checked', 'true');

    expect(
      screen.getByRole('radio', {
        name: '3.000–5.000',
      }),
    ).toBeChecked();
  });

  it('CA-04 valida campos obligatorios antes de guardar', async () => {
    await startEditing();

    const cargo = screen.getByPlaceholderText(
      'Ej. Analista de sistemas',
    );

    fireEvent.change(cargo, {
      target: {
        value: '',
      },
    });

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Guardar cambios',
      }),
    );

    expect(
      screen.getAllByText('Este campo es obligatorio')
        .length,
    ).toBeGreaterThan(0);

    expect(
      mockedUpdateMySurveyResponse,
    ).not.toHaveBeenCalled();
  });

  it('CA-08 Cancelar restaura las respuestas y no consume la edición', async () => {
    await startEditing();

    const cargo = screen.getByPlaceholderText(
      'Ej. Analista de sistemas',
    );

    fireEvent.change(cargo, {
      target: {
        value: 'Gerente de sistemas',
      },
    });

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Cancelar',
      }),
    );

    expect(
      screen.getByText('Analista'),
    ).toBeInTheDocument();

    expect(
      screen.queryByText('Gerente de sistemas'),
    ).toBeNull();

    expect(
      screen.getByRole('button', {
        name: 'Editar respuestas',
      }),
    ).toBeInTheDocument();

    expect(
      mockedUpdateMySurveyResponse,
    ).not.toHaveBeenCalled();
  });

  it('CA-05, CA-06 y CA-07 guarda cambios, actualiza el resumen y elimina el botón de edición', async () => {
    await startEditing();

    const cargo = screen.getByPlaceholderText(
      'Ej. Analista de sistemas',
    );

    fireEvent.change(cargo, {
      target: {
        value: 'Analista Senior',
      },
    });

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Guardar cambios',
      }),
    );

    await waitFor(() => {
      expect(
        mockedUpdateMySurveyResponse,
      ).toHaveBeenCalledTimes(1);
    });

    expect(
  await screen.findByText(
    'Sus cambios se guardaron correctamente',
  ),
).toBeInTheDocument();

    expect(
      screen.getByText('Analista Senior'),
    ).toBeInTheDocument();

    expect(
      screen.queryByRole('button', {
        name: 'Editar respuestas',
      }),
    ).toBeNull();
  });

  it('CA-10 al cambiar de Trabaja a No trabaja elimina los datos laborales', async () => {
    await startEditing();

    fireEvent.click(
      screen.getByRole('radio', {
        name: /^No trabaja/,
      }),
    );

    expect(
      screen.queryByPlaceholderText(
        'Ej. Analista de sistemas',
      ),
    ).toBeNull();

    expect(
      screen.getByText(
        'Las respuestas anteriores se descartaron',
      ),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Guardar cambios',
      }),
    );

    await waitFor(() => {
      expect(
        mockedUpdateMySurveyResponse,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          condicion_laboral: false,
        }),
      );
    });

    expect(
      screen.queryByText('Analista'),
    ).toBeNull();

    expect(
      screen.queryByText('Acme'),
    ).toBeNull();
  });

  it('maneja conflicto cuando la edición ya fue utilizada en otra sesión', async () => {
    mockedUpdateMySurveyResponse.mockRejectedValue(
      new ApiError(
        409,
        'La edición ya fue utilizada',
      ),
    );

    await startEditing();

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Guardar cambios',
      }),
    );

    expect(
  await screen.findByText(
    'Esta encuesta ya fue editada. No es posible editarla nuevamente',
  ),
).toBeInTheDocument();

    expect(
      screen.getByRole('button', {
        name: 'Guardar cambios',
      }),
    ).toBeInTheDocument();
  });
});