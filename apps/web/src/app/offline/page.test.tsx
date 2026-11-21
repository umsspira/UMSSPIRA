import { render, screen } from '@testing-library/react';

import OfflinePage from './page';

jest.mock('./offline-logout-button', () => ({
  OfflineLogoutButton: () => <button type="button">Cerrar sesión</button>,
}));

describe('página /offline', () => {
  it('explica que no hay conexión y ofrece reintentar', () => {
    render(<OfflinePage />);

    expect(
      screen.getByRole('heading', { name: 'Sin conexión a Internet' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reintentar/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeInTheDocument();
  });

  it('muestra los accesos disponibles sin conexión', () => {
    render(<OfflinePage />);

    expect(screen.getByRole('link', { name: /Mis códigos QR/ })).toHaveAttribute(
      'href',
      '/mis-pases',
    );
    expect(screen.getByRole('link', { name: /Eventos visitados/ })).toHaveAttribute(
      'href',
      '/portal/eventos',
    );
    expect(screen.getByRole('link', { name: /Configuración/ })).toHaveAttribute(
      'href',
      '/portal/configuracion',
    );
  });
});