import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import EditarVacantePage from './page';

jest.mock('next/navigation', () => ({
  useParams: () => ({ id: '44500000-0000-4000-8000-000000000001' }),
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('@/shared/services/auth-session', () => ({
  getAccessToken: () => 'token-test',
}));

const VACANTE = {
  id: '44500000-0000-4000-8000-000000000001',
  titulo: 'Desarrollador Frontend',
  modalidad: 'HIBRIDO',
  nivel_experiencia: 'SENIOR',
  descripcion_tecnica: 'Descripción técnica de la vacante con más de cincuenta caracteres.',
  estado: 'PUBLICADO',
  requisito_tecnico_registros: [{ nombre: 'Java' }, { nombre: 'Postman' }],
};

const fetchMock = jest.fn();

function prepararRespuestas(opts: { patchOk?: boolean; patchBody?: unknown } = {}) {
  fetchMock.mockImplementation((url: string, init?: RequestInit) => {
    if (init?.method === 'PATCH') {
      return Promise.resolve({
        ok: opts.patchOk ?? true,
        json: async () => opts.patchBody ?? { data: VACANTE },
      });
    }
    return Promise.resolve({ ok: true, json: async () => VACANTE });
  });
}

async function renderPagina() {
  render(<EditarVacantePage />);
  return await screen.findByRole('button', { name: /Guardar cambios/ });
}

describe('Editar vacante · bugs de HU-13', () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    fetchMock.mockReset();
    prepararRespuestas();
    global.fetch = fetchMock as unknown as typeof fetch;
    alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => undefined);
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  it('BUG-01: Guardar cambios permanece deshabilitado mientras no hay modificaciones', async () => {
    const boton = await renderPagina();

    expect(boton).toBeDisabled();

    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'Remoto' } });
    expect(boton).toBeEnabled();

    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'Híbrido' } });
    expect(boton).toBeDisabled();
  });

  it('BUG-01: no envía una actualización innecesaria sin modificaciones', async () => {
    const boton = await renderPagina();

    fireEvent.click(boton);

    expect(fetchMock).toHaveBeenCalledTimes(1); // solo la carga inicial
    expect(fetchMock.mock.calls[0][1]?.method ?? 'GET').toBe('GET');
  });

  it('BUG-01: detecta cambios en la descripción y en los requisitos técnicos', async () => {
    const boton = await renderPagina();

    fireEvent.change(screen.getByDisplayValue(VACANTE.descripcion_tecnica), {
      target: { value: 'Nueva descripción técnica de la vacante con más de cincuenta caracteres.' },
    });
    expect(boton).toBeEnabled();

    fireEvent.change(
      screen.getByDisplayValue('Nueva descripción técnica de la vacante con más de cincuenta caracteres.'),
      { target: { value: VACANTE.descripcion_tecnica } },
    );
    expect(boton).toBeDisabled();

    const campoRequisito = screen.getByRole('textbox', { name: /requisito/i });
    fireEvent.change(campoRequisito, { target: { value: 'Docker' } });
    fireEvent.keyDown(campoRequisito, { key: 'Enter' });
    expect(boton).toBeEnabled();
  });

  it('BUG-02: confirma el guardado con un componente propio y sin alertas nativas', async () => {
    const boton = await renderPagina();

    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'Remoto' } });
    fireEvent.click(boton);

    expect(
      await screen.findByText('Vacante actualizada correctamente'),
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(alertSpy).not.toHaveBeenCalled();

    // Tras guardar ya no quedan cambios pendientes.
    await waitFor(() => expect(boton).toBeDisabled());
  });

  it('BUG-02: los errores del servidor se muestran sin alertas nativas', async () => {
    prepararRespuestas({
      patchOk: false,
      patchBody: { error: { code: 'VALIDATION_ERROR', message: 'Los datos enviados no son válidos' } },
    });
    const boton = await renderPagina();

    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'Remoto' } });
    fireEvent.click(boton);

    expect(
      await screen.findByText('Los datos enviados no son válidos'),
    ).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(alertSpy).not.toHaveBeenCalled();
  });
});
