import { useState } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';

import type { TimelineItem } from '@/modules/profile/data/profile-data';

import CertificationItem from './certification-item';

jest.mock('@/modules/profile/services/perfil-api', () => ({
  ...jest.requireActual('@/modules/profile/services/perfil-api'),
  obtenerEnlaceRespaldo: jest.fn().mockResolvedValue({ url: '/api/v1/perfil/respaldos/cert-1/archivo', expiraEn: '' }),
}));

const withBackup: TimelineItem = {
  title: 'AWS Solutions Architect',
  subtitle: 'Amazon Web Services · 2022',
  issuer: 'Amazon Web Services',
  year: '2022',
  grade: 'Profesional',
  detail: 'Grado: Profesional',
  document: 'respaldo.pdf',
  documentUrl: '/respaldos/aws.pdf',
  status: 'verified',
};

const withoutBackup: TimelineItem = {
  title: 'Google Cloud Engineer',
  subtitle: 'Google · 2023',
  issuer: 'Google',
  year: '2023',
  grade: 'Profesional',
  status: 'missing',
};

function Harness({ item }: { item: TimelineItem }) {
  const [open, setOpen] = useState(false);
  return (
    <CertificationItem
      item={item}
      isOpen={open}
      onToggle={() => setOpen((value) => !value)}
    />
  );
}

describe('CertificationItem', () => {
  it('cerrada muestra entidad, año y grado una sola vez, sin el archivo (HU-21, CA-03)', () => {
    render(<Harness item={withBackup} />);

    expect(screen.getByRole('button', { name: /AWS Solutions Architect/ })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.getAllByText('Amazon Web Services · 2022')).toHaveLength(1);
    expect(screen.getAllByText('Grado: Profesional')).toHaveLength(1);
    expect(screen.queryByText('respaldo.pdf')).not.toBeInTheDocument();
  });

  it('abierta muestra el archivo una sola vez y no repite entidad, año ni grado (HU-21, CA-03)', () => {
    render(<Harness item={withBackup} />);

    fireEvent.click(screen.getByRole('button', { name: /AWS Solutions Architect/ }));

    expect(screen.getAllByText('respaldo.pdf')).toHaveLength(1);
    expect(screen.getAllByText(/Amazon Web Services/)).toHaveLength(1);
    expect(screen.getAllByText(/Profesional/)).toHaveLength(1);
    expect(screen.queryByText('Entidad emisora')).not.toBeInTheDocument();
  });

  it('cada respaldo se descarga desde su propio archivo (E2.2)', () => {
    render(<Harness item={withBackup} />);

    fireEvent.click(screen.getByRole('button', { name: /AWS Solutions Architect/ }));

    expect(screen.getByRole('link', { name: 'Descargar respaldo.pdf' })).toHaveAttribute('href', '/respaldos/aws.pdf');
  });

  it('sin dirección del archivo muestra el nombre sin enlace', () => {
    render(<Harness item={{ ...withBackup, documentUrl: undefined }} />);

    fireEvent.click(screen.getByRole('button', { name: /AWS Solutions Architect/ }));

    expect(screen.getByText('respaldo.pdf')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Descargar respaldo.pdf' })).not.toBeInTheDocument();
  });

  it('sin respaldo muestra el aviso', () => {
    render(<Harness item={withoutBackup} />);

    fireEvent.click(screen.getByRole('button', { name: /Google Cloud Engineer/ }));

    expect(
      screen.getByText('Esta certificación no tiene un documento adjunto.'),
    ).toBeInTheDocument();
  });

  it('con Enter abre y cierra', () => {
    render(<Harness item={withBackup} />);
    const header = screen.getByRole('button', { name: /AWS Solutions Architect/ });

    fireEvent.keyDown(header, { key: 'Enter' });
    expect(header).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('respaldo.pdf')).toBeInTheDocument();

    fireEvent.keyDown(header, { key: 'Enter' });
    expect(header).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('respaldo.pdf')).not.toBeInTheDocument();
  });

  it('«Ver respaldo» abre el visor con el nombre de la certificación', async () => {
    render(<Harness item={{ ...withBackup, id: 'cert-1' }} />);

    fireEvent.click(screen.getByRole('button', { name: 'Ver respaldo' }));

    expect(screen.getByRole('dialog', { name: 'AWS Solutions Architect' })).toBeInTheDocument();
    expect(await screen.findByRole('img', { name: 'Respaldo de AWS Solutions Architect' })).toBeInTheDocument();
  });

  it('sin respaldo no ofrece «Ver respaldo» aunque el registro exista', () => {
    render(<Harness item={{ ...withoutBackup, id: 'cert-3' }} />);

    fireEvent.click(screen.getByRole('button', { name: /Google Cloud Engineer/ }));

    expect(screen.queryByRole('button', { name: 'Ver respaldo' })).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('sin id del registro no ofrece «Ver respaldo»', () => {
    render(<Harness item={withBackup} />);

    expect(screen.queryByRole('button', { name: 'Ver respaldo' })).not.toBeInTheDocument();
  });
});
