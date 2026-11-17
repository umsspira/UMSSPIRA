import { fireEvent, render, screen } from '@testing-library/react';
import type { AffinityArea } from '@umsspira/shared-types';

import { RadarCertificationsPanel } from './radar-certifications-panel';

const originalFetch = global.fetch;

describe('RadarCertificationsPanel en modo mock', () => {
  const originalMockFlag = process.env.NEXT_PUBLIC_USE_AFFINITY_MOCK;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_USE_AFFINITY_MOCK = 'true';
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    if (originalMockFlag === undefined) delete process.env.NEXT_PUBLIC_USE_AFFINITY_MOCK;
    else process.env.NEXT_PUBLIC_USE_AFFINITY_MOCK = originalMockFlag;
  });

  function renderPanel(area: AffinityArea) {
    render(<RadarCertificationsPanel area={area} />);
  }

  it('lista certificaciones de demostración con y sin respaldo sin llamar a la API', async () => {
    renderPanel('software-development');

    expect(await screen.findByText('Certificación avanzada de React')).toBeInTheDocument();
    expect(screen.getByText('Desarrollo backend con Node.js')).toBeInTheDocument();
    expect(screen.getByText(/Meta · 2024/)).toBeInTheDocument();
    expect(screen.getByText('Sin respaldo adjunto')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver respaldo de Certificación avanzada de React' })).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('informa que un área no tiene certificaciones relacionadas', async () => {
    renderPanel('quality-assurance');

    expect(await screen.findByText(/No se encontraron certificaciones relacionadas/)).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('al abrir un respaldo avisa que no está disponible en modo demostración', async () => {
    renderPanel('software-development');

    fireEvent.click(await screen.findByRole('button', { name: 'Ver respaldo de Certificación avanzada de React' }));

    expect(screen.getByText('El respaldo no está disponible en modo demostración.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Abrir respaldo' })).not.toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
