import { render, screen } from '@testing-library/react';
import { MyCertificatesPage } from './my-certificates-page';
import { CertificateDetailPage } from './certificate-detail-page';

jest.mock('./certificate-preview', () => ({
  CertificatePreview: () => <div>Vista previa simulada</div>,
}));

const certificate = {
  id: 'cert-123',
  eventName: 'Congreso de Ingeniería de Sistemas',
  participationDate: '13/11/2026',
};

describe('HU19 - Pantallas de certificados', () => {
  it('muestra los certificados emitidos en el listado', () => {
    render(
      <MyCertificatesPage
        view={{
          status: 'success',
          certificates: [certificate],
        }}
      />,
    );

    expect(
      screen.getByText('Congreso de Ingeniería de Sistemas'),
    ).toBeInTheDocument();

    expect(
      screen.getByText('13/11/2026'),
    ).toBeInTheDocument();

    expect(
      screen.getByRole('link', { name: 'Ver certificado' }),
    ).toHaveAttribute('href', '/mis-certificados/cert-123');
  });

  it('muestra el estado vacío D83', () => {
    render(
      <MyCertificatesPage
        view={{
          status: 'success',
          certificates: [],
        }}
      />,
    );

    expect(
      screen.getByText('Aún no tienes certificados'),
    ).toBeInTheDocument();

    expect(
      screen.getByRole('link', { name: 'Explorar eventos' }),
    ).toHaveAttribute('href', '/portal/eventos');
  });

  it('muestra un error de consulta', () => {
    render(
      <MyCertificatesPage
        view={{
          status: 'error',
          message: 'No fue posible conectar con el servidor.',
        }}
      />,
    );

    expect(
      screen.getByRole('alert'),
    ).toHaveTextContent('No fue posible conectar con el servidor.');
  });

  it('muestra el estado de emisión pendiente D84', () => {
    render(
      <CertificateDetailPage
        state="processing"
        eventName="Congreso de Ingeniería de Sistemas"
      />,
    );

    expect(
      screen.getByText('Certificado aún no disponible'),
    ).toBeInTheDocument();

    expect(screen.queryByRole('button', {
      name: 'Descargar certificado',
    })).not.toBeInTheDocument();
  });

  it('muestra el error de archivo D85', () => {
    render(<CertificateDetailPage state="unavailable" />);

    expect(
      screen.getByText('No pudimos abrir el certificado'),
    ).toBeInTheDocument();
  });

  it('muestra el acceso restringido D87', () => {
    render(<CertificateDetailPage state="forbidden" />);

    expect(
      screen.getByText('Acceso restringido'),
    ).toBeInTheDocument();

    expect(screen.queryByRole('button', {
      name: 'Descargar certificado',
    })).not.toBeInTheDocument();
  });

  it('muestra vista previa y descarga para un documento disponible', () => {
    render(
      <CertificateDetailPage
        state="available"
        document={{
          ...certificate,
          pdf: new Blob(['%PDF-1.4'], {
            type: 'application/pdf',
          }),
        }}
      />,
    );

    expect(
      screen.getByText('Vista previa simulada'),
    ).toBeInTheDocument();

    expect(
      screen.getByRole('button', {
        name: 'Descargar certificado',
      }),
    ).toBeEnabled();
  });
  it('muestra acceso restringido en el listado', () => {
  render(
    <MyCertificatesPage view={{ status: 'forbidden' }} />,
  );

  expect(
    screen.getByRole('alert'),
  ).toHaveTextContent('Acceso restringido');

  expect(
    screen.queryByRole('link', { name: 'Ver certificado' }),
  ).not.toBeInTheDocument();
});
});
