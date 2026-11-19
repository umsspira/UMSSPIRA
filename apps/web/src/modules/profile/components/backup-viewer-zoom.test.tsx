import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';

import { obtenerEnlaceRespaldo } from '@/modules/profile/services/perfil-api';

import { BackupViewerModal } from './backup-viewer-modal';

jest.mock('@/modules/profile/services/perfil-api', () => ({
  ...jest.requireActual('@/modules/profile/services/perfil-api'),
  obtenerEnlaceRespaldo: jest.fn(),
}));

const obtenerEnlaceMock = obtenerEnlaceRespaldo as jest.MockedFunction<typeof obtenerEnlaceRespaldo>;
const ENLACE = '/api/v1/perfil/respaldos/cert-1/archivo?expira=1700000300&firma=abc';

describe('BackupViewerModal · zoom (HU-21, T21.7, CA-07)', () => {
  beforeEach(() => {
    obtenerEnlaceMock.mockReset();
    obtenerEnlaceMock.mockResolvedValue({ url: ENLACE, expiraEn: '2026-10-23T23:05:00.000Z' });
  });

  it('con el respaldo cargado, «+» y «−» acercan y alejan la imagen', async () => {
    render(<BackupViewerModal certificationId="cert-1" certificationName="AWS" onClose={jest.fn()} />);
    const image = await screen.findByRole('img');
    // Mientras carga no hay zoom
    expect(screen.queryByRole('button', { name: 'Acercar' })).not.toBeInTheDocument();

    fireEvent.load(image);
    fireEvent.click(screen.getByRole('button', { name: 'Acercar' }));
    expect(screen.getByText('125 %')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Alejar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Alejar' }));
    expect(screen.getByText('75 %')).toBeInTheDocument();
  });

  it('con un respaldo PDF (HU-18), el zoom también acerca y aleja el documento', async () => {
    render(<BackupViewerModal certificationId="cert-1" certificationName="AWS" backupType="pdf" onClose={jest.fn()} />);
    const pdf = await screen.findByTitle('Respaldo de AWS');
    expect(pdf.tagName).toBe('IFRAME');
    expect(screen.queryByRole('button', { name: 'Acercar' })).not.toBeInTheDocument();

    fireEvent.load(pdf);
    fireEvent.click(screen.getByRole('button', { name: 'Acercar' }));
    expect(screen.getByText('125 %')).toBeInTheDocument();
    expect(screen.getByTestId('backup-zoom-content')).toContainElement(pdf);

    fireEvent.click(screen.getByRole('button', { name: 'Alejar' }));
    expect(screen.getByText('100 %')).toBeInTheDocument();
  });

  it('usar el zoom no cierra el visor', async () => {
    const onClose = jest.fn();
    render(<BackupViewerModal certificationId="cert-1" certificationName="AWS" onClose={onClose} />);
    fireEvent.load(await screen.findByRole('img'));

    fireEvent.click(screen.getByRole('button', { name: 'Acercar' }));

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
