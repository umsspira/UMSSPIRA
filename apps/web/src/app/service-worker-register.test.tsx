import { act, fireEvent, render, screen } from '@testing-library/react';
import ServiceWorkerRegister from './service-worker-register';
import { registerServiceWorker } from './register-sw';

jest.mock('./register-sw', () => ({ registerServiceWorker: jest.fn() }));

function conVersionNueva(apply = jest.fn()) {
  (registerServiceWorker as jest.Mock).mockImplementation(async (onUpdate: (fn: () => void) => void) => {
    onUpdate(apply);
  });
  return apply;
}

describe('Aviso de versión nueva (HU06)', () => {
  it('muestra «Actualizar» y «Más tarde»', async () => {
    conVersionNueva();
    render(<ServiceWorkerRegister />);
    expect(await screen.findByRole('button', { name: 'Actualizar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Más tarde' })).toBeInTheDocument();
  });

  it('«Más tarde» oculta el aviso sin activar la versión nueva', async () => {
    const apply = conVersionNueva();
    render(<ServiceWorkerRegister />);
    fireEvent.click(await screen.findByRole('button', { name: 'Más tarde' }));
    expect(screen.queryByRole('button', { name: 'Actualizar' })).not.toBeInTheDocument();
    expect(apply).not.toHaveBeenCalled();
  });

  it('«Actualizar» activa la versión y muestra el aviso de carga', async () => {
    const apply = conVersionNueva();
    render(<ServiceWorkerRegister />);
    await act(async () => { fireEvent.click(await screen.findByRole('button', { name: 'Actualizar' })); });
    expect(apply).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Actualizando la aplicación…')).toBeInTheDocument();
  });
});
