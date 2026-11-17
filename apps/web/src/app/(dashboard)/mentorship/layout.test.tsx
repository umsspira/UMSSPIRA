import { render, screen } from '@testing-library/react';
import MentoriasLayout from './layout';

jest.mock('@/shared/components/portal-site-footer', () => ({
  PortalSiteFooter: () => <footer data-testid="portal-site-footer">Footer del portal</footer>,
}));

describe('MentoriasLayout', () => {
  it('muestra el contenido de la pantalla y el footer compartido del portal', () => {
    render(
      <MentoriasLayout>
        <p>Contenido de mentorías</p>
      </MentoriasLayout>,
    );

    expect(screen.getByText('Contenido de mentorías')).toBeInTheDocument();
    expect(screen.getByTestId('portal-site-footer')).toBeInTheDocument();
  });
});
