import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';

import { BackupZoom } from './backup-zoom';

function renderZoom(isReady = true) {
  return render(
    <BackupZoom isReady={isReady}>
      {/* eslint-disable-next-line @next/next/no-img-element -- solo para la prueba */}
      <img src="/respaldo.jpg" alt="Respaldo" />
    </BackupZoom>,
  );
}

function pressTimes(name: string, times: number) {
  for (let i = 0; i < times; i += 1) fireEvent.click(screen.getByRole('button', { name }));
}

describe('BackupZoom (HU-21, T21.7, CA-07)', () => {
  it('empieza al 100 % sin cambiar el tamaño del respaldo', () => {
    renderZoom();

    expect(screen.getByText('100 %')).toBeInTheDocument();
    expect(screen.getByTestId('backup-zoom-content')).toHaveStyle({ transform: 'scale(1)' });
  });

  it('«+» acerca el respaldo en pasos de 25 %', () => {
    renderZoom();

    fireEvent.click(screen.getByRole('button', { name: 'Acercar' }));

    expect(screen.getByText('125 %')).toBeInTheDocument();
    expect(screen.getByTestId('backup-zoom-content')).toHaveStyle({ transform: 'scale(1.25)' });
  });

  it('«−» aleja el respaldo en pasos de 25 %', () => {
    renderZoom();

    fireEvent.click(screen.getByRole('button', { name: 'Alejar' }));

    expect(screen.getByText('75 %')).toBeInTheDocument();
    expect(screen.getByTestId('backup-zoom-content')).toHaveStyle({ transform: 'scale(0.75)' });
  });

  it('se detiene en 300 % y desactiva «+»', () => {
    renderZoom();

    pressTimes('Acercar', 10);

    expect(screen.getByText('300 %')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Acercar' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Alejar' })).toBeEnabled();
  });

  it('se detiene en 50 % y desactiva «−»', () => {
    renderZoom();

    pressTimes('Alejar', 5);

    expect(screen.getByText('50 %')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Alejar' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Acercar' })).toBeEnabled();
  });

  it('el área del respaldo se recorre con scroll al acercar', () => {
    renderZoom();

    expect(screen.getByTestId('backup-zoom-area')).toHaveClass('overflow-auto');
  });

  it('mientras el respaldo carga no muestra los botones de zoom', () => {
    renderZoom(false);

    expect(screen.getByRole('img', { name: 'Respaldo' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Acercar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Alejar' })).not.toBeInTheDocument();
  });
});
