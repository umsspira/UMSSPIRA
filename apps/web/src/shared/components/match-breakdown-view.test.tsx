// HU-16 (T16.4): botón «Descargar CV» en el detalle del postulante (vista del reclutador).
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

jest.mock('../services/applicants', () => ({
  downloadApplicantCv: jest.fn(),
}));

import { downloadApplicantCv } from '../services/applicants';
import { MatchBreakdownView } from './match-breakdown-view';
import type { Applicant } from '../types/applicant';

const downloadMock = downloadApplicantCv as unknown as jest.Mock;
const VACANTE = '44500000-0000-4000-8000-000000000001';

const base: Applicant = {
  id: '44800000-0000-4000-8000-000000000001',
  name: 'Ana Rojas',
  email: 'ana.rojas.demo@umsspira.local',
  location: null,
  experienceLevel: null,
  status: 'En revisión',
  appliedAt: '2026-11-02',
  cvUrl: null,
  hasCv: true,
  matchPercentage: 92,
  skills: [],
};

describe('MatchBreakdownView — Descargar CV (HU-16)', () => {
  beforeEach(() => downloadMock.mockReset());

  it('habilita «Descargar CV» y descarga el CV del postulante', async () => {
    downloadMock.mockResolvedValueOnce(undefined);
    render(<MatchBreakdownView applicant={base} vacancyId={VACANTE} />);

    const button = screen.getByRole('button', { name: /descargar cv/i });
    expect(button).toBeEnabled();

    fireEvent.click(button);

    expect(downloadMock).toHaveBeenCalledWith(VACANTE, base.id, 'Ana Rojas');
    await waitFor(() => expect(screen.getByRole('button', { name: /descargar cv/i })).toBeEnabled());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('muestra «Descargando…» mientras se descarga', async () => {
    let finish: () => void = () => {};
    downloadMock.mockReturnValueOnce(new Promise<void>((resolve) => (finish = resolve)));
    render(<MatchBreakdownView applicant={base} vacancyId={VACANTE} />);

    fireEvent.click(screen.getByRole('button', { name: /descargar cv/i }));

    expect(await screen.findByRole('button', { name: /descargando/i })).toBeDisabled();
    finish();
    await waitFor(() => expect(screen.getByRole('button', { name: /descargar cv/i })).toBeEnabled());
  });

  it('muestra el error si la descarga falla', async () => {
    downloadMock.mockRejectedValueOnce(new Error('No se pudo descargar el CV. Intente nuevamente'));
    render(<MatchBreakdownView applicant={base} vacancyId={VACANTE} />);

    fireEvent.click(screen.getByRole('button', { name: /descargar cv/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo descargar el CV. Intente nuevamente',
    );
  });

  it('deshabilita el botón si el postulante no subió su CV', () => {
    render(<MatchBreakdownView applicant={{ ...base, hasCv: false }} vacancyId={VACANTE} />);

    const button = screen.getByRole('button', { name: /descargar cv/i });
    expect(button).toBeDisabled();
    expect(screen.getByText('El postulante aún no subió su CV')).toBeInTheDocument();

    fireEvent.click(button);
    expect(downloadMock).not.toHaveBeenCalled();
  });

  it('la pestaña CV también permite descargar', async () => {
    downloadMock.mockResolvedValueOnce(undefined);
    render(<MatchBreakdownView applicant={base} vacancyId={VACANTE} />);

    fireEvent.click(screen.getByRole('tab', { name: 'CV' }));
    fireEvent.click(screen.getByRole('button', { name: /descargar el cv del postulante/i }));

    expect(downloadMock).toHaveBeenCalledWith(VACANTE, base.id, 'Ana Rojas');
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /descargar el cv del postulante/i })).toBeEnabled(),
    );
  });
});

describe('MatchBreakdownView — pestaña Perfil (HU-16 CA-07)', () => {
  const completo: Applicant = {
    ...base,
    location: 'Cochabamba',
    experienceLevel: 'Junior',
    workExperience: [
      { position: 'Desarrolladora backend', company: 'Empresa Andina', startDate: '2024-02-01', endDate: '2026-06-30' },
      { position: 'Pasante', company: 'UMSS', startDate: '2023-01-10', endDate: null },
    ],
    education: [{ title: 'Licenciatura en Ingeniería de Sistemas', institution: 'UMSS', graduationYear: 2023 }],
    certifications: [{ name: 'AWS Certified Cloud Practitioner', issuer: 'Amazon', year: 2025 }],
  };

  function abrirPerfil(applicant: Applicant) {
    render(<MatchBreakdownView applicant={applicant} vacancyId={VACANTE} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Perfil' }));
  }

  it('muestra solo los 8 campos de la política, en orden', () => {
    abrirPerfil(completo);

    const etiquetas = screen
      .getAllByText(/^(Correo|Ubicación|Nivel de experiencia|Experiencia laboral|Formación académica|Certificaciones|Estado|Fecha de postulación)$/)
      .map((el) => el.textContent);
    expect(etiquetas).toEqual([
      'Correo',
      'Ubicación',
      'Nivel de experiencia',
      'Experiencia laboral',
      'Formación académica',
      'Certificaciones',
      'Estado',
      'Fecha de postulación',
    ]);
  });

  it('muestra experiencia, formación y certificaciones como en el mockup', () => {
    abrirPerfil(completo);

    expect(screen.getByText('Desarrolladora backend · Empresa Andina · 2024 – 2026')).toBeInTheDocument();
    expect(screen.getByText('Pasante · UMSS · 2023 – Actual')).toBeInTheDocument();
    expect(screen.getByText('Licenciatura en Ingeniería de Sistemas · UMSS · 2023')).toBeInTheDocument();
    expect(screen.getByText('AWS Certified Cloud Practitioner · 2025')).toBeInTheDocument();
  });

  it('muestra «Sin registrar» si el titulado no tiene esos registros', () => {
    abrirPerfil({ ...base, workExperience: [], education: [], certifications: undefined });

    expect(screen.getAllByText('Sin registrar')).toHaveLength(3);
  });

  it('no muestra datos fuera de la política (CA-08)', () => {
    abrirPerfil(completo);

    expect(screen.queryByText(/carnet|teléfono|nacimiento|dirección|salario/i)).not.toBeInTheDocument();
  });
});