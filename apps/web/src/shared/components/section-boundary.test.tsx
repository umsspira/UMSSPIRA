import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

import { clearSectionFailures, getSectionFailures } from '@/shared/services/section-failure-log';
import { SectionBoundary } from './section-boundary';

let shouldFail = true;

function Fragile() {
  if (shouldFail) throw new Error('boom');
  return <p>Eventos cargados</p>;
}

describe('SectionBoundary (HU18 CA-02, CA-03, CA-05)', () => {
  beforeEach(() => {
    shouldFail = true;
    clearSectionFailures();
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it('CA-02: solo la sección que falla muestra el aviso; el resto sigue funcionando', () => {
    render(
      <div>
        <nav>Navegación</nav>
        <SectionBoundary sectionId="events" title="Eventos">
          <Fragile />
        </SectionBoundary>
        <SectionBoundary sectionId="qr" title="Mis códigos QR">
          <p>2 pases guardados</p>
        </SectionBoundary>
      </div>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Esta sección no está disponible.');
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.getByText('Navegación')).toBeInTheDocument();
    expect(screen.getByText('2 pases guardados')).toBeInTheDocument();
  });

  it('CA-03: «Reintentar» vuelve a cargar solo esa sección sin recargar la página', () => {
    render(
      <div>
        <p>Resto de la pantalla</p>
        <SectionBoundary sectionId="events" title="Eventos">
          <Fragile />
        </SectionBoundary>
      </div>,
    );

    shouldFail = false;
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(screen.getByText('Eventos cargados')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('Resto de la pantalla')).toBeInTheDocument();
  });

  it('CA-05: el fallo queda registrado con la sección y el motivo', () => {
    render(
      <SectionBoundary sectionId="events" title="Eventos">
        <Fragile />
      </SectionBoundary>,
    );

    expect(getSectionFailures()).toEqual([
      expect.objectContaining({ sectionId: 'events', reason: 'render', message: 'boom' }),
    ]);
  });
});