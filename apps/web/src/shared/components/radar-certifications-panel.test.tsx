import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { RadarCertificationsPanel } from './radar-certifications-panel';
import { getAreaCertifications } from '../services/affinity-service';
import type { RadarCertificationEvidenceResponse } from '@umsspira/shared-types';

jest.mock('../services/affinity-service', () => ({ getAreaCertifications: jest.fn() }));
jest.mock('./radar-backup-viewer-modal', () => ({
  RadarBackupViewerModal: ({ certificationId, certificationName, onClose }: { certificationId: string; certificationName: string; onClose: () => void }) => <div role="dialog">{certificationId} {certificationName}<button onClick={onClose}>Cerrar</button></div>,
}));
const get = getAreaCertifications as jest.Mock;
const response: RadarCertificationEvidenceResponse = {
  area: 'cloud-devops', source: 'current-profile', certifications: [
    { id: 'aws-id', title: 'AWS Solutions Architect', issuer: 'Amazon Web Services', issuedYear: 2026, hasBackup: true, matchedKeywords: ['aws'] },
    { id: 'google-id', title: 'Google Cloud Engineer', issuer: 'Google', issuedYear: 2023, hasBackup: false, matchedKeywords: ['google cloud'] },
  ],
};
beforeEach(() => { get.mockReset(); get.mockResolvedValue(response); });

it('muestra certificados reales, sin respaldo y abre el visor con su id', async () => {
  render(<RadarCertificationsPanel area="cloud-devops" />);
  await screen.findByText('AWS Solutions Architect');
  expect(screen.getByText('Google Cloud Engineer')).toBeInTheDocument();
  expect(screen.getByText('Sin respaldo adjunto')).toBeInTheDocument();
  expect(screen.getAllByRole('button', { name: /Ver respaldo/ })).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: 'Ver respaldo de AWS Solutions Architect' }));
  expect(screen.getByRole('dialog')).toHaveTextContent('aws-id');
  fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('distingue carga y fallo de una consulta vacía y permite reintentar', async () => {
  get.mockRejectedValueOnce(new Error('503'));
  render(<RadarCertificationsPanel area="cloud-devops" />);
  expect(screen.getByRole('status')).toHaveTextContent('Cargando certificaciones');
  expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron consultar');
  expect(screen.queryByText(/No se encontraron certificaciones/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
  await screen.findByText('AWS Solutions Architect');
});

it('solo después de una respuesta vacía informa que no se detectaron certificaciones relacionadas', async () => {
  get.mockResolvedValue({ area: 'quality-assurance', source: 'current-profile', certifications: [] });
  render(<RadarCertificationsPanel area="quality-assurance" />);
  await screen.findByText(/No se encontraron certificaciones relacionadas/);
  expect(screen.queryByText(/Sin respaldo adjunto/)).not.toBeInTheDocument();
});

it('descarta la respuesta tardía de otra área y refresca tras un nuevo cálculo', async () => {
  let finish!: (result: RadarCertificationEvidenceResponse) => void;
  get.mockReturnValueOnce(new Promise(resolve => { finish = resolve; })).mockResolvedValueOnce({ area: 'quality-assurance', source: 'current-profile', certifications: [] });
  const view = render(<RadarCertificationsPanel area="cloud-devops" calculationKey="one" />);
  view.rerender(<RadarCertificationsPanel area="quality-assurance" calculationKey="one" />);
  await screen.findByText(/No se encontraron certificaciones relacionadas/);
  await act(async () => { finish(response); });
  expect(screen.queryByText('AWS Solutions Architect')).not.toBeInTheDocument();
  view.rerender(<RadarCertificationsPanel area="quality-assurance" calculationKey="two" />);
  expect(get).toHaveBeenCalledTimes(3);
});
