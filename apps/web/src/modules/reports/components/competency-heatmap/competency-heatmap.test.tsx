import { fireEvent, render, screen, within } from '@testing-library/react';
import { CompetencyHeatmap } from './competency-heatmap';
import { heatmapMockupFixture } from './__fixtures__/competency-heatmap.fixture';
import { HEATMAP_AREA_LABELS, HEATMAP_AREAS } from './heatmap.utils';
import type { HeatmapData } from './heatmap.types';

function setup(overrides: Partial<Parameters<typeof CompetencyHeatmap>[0]> = {}) {
  return render(
    <CompetencyHeatmap
      careerName="Ingeniería de Sistemas"
      data={heatmapMockupFixture()}
      onRefresh={jest.fn()}
      {...overrides}
    />,
  );
}

describe('HU-EP09-06 / T2.2: matriz, leyenda y móvil', () => {
  it('genera 1 encabezado Cohorte + exactamente 6 áreas del catálogo', () => {
    setup();
    const headers = within(screen.getByRole('table')).getAllByRole('columnheader');
    expect(headers).toHaveLength(7);
    expect(headers[0]).toHaveTextContent('Cohorte');
    HEATMAP_AREAS.forEach((area, index) => expect(headers[index + 1]).toHaveTextContent(HEATMAP_AREA_LABELS[area]));
  });

  it('muestra cohortes ascendentemente aunque el backend responda invertido', () => {
    const data = heatmapMockupFixture();
    setup({ data: { ...data, cohorts: data.cohorts.reverse() } });
    expect(screen.getAllByRole('rowheader').map(header => header.textContent)).toEqual(['2019', '2020', '2021', '2022', '2023']);
  });

  it('representa la leyenda de 5 tramos de 0 a 100 y Sin datos', () => {
    const { container } = setup();
    expect(screen.getByLabelText('Leyenda de dominio entre 0 y 100 por ciento')).toBeInTheDocument();
    for (const band of ['0-20', '20-40', '40-60', '60-80', '80-100']) {
      expect(container.querySelector(`[data-range="${band}"]`)).toBeInTheDocument();
    }
    expect(screen.getByText('100 %')).toBeInTheDocument();
    expect(screen.getAllByText('Sin datos').length).toBeGreaterThan(0);
  });

  it('contiene la matriz en una región con scroll, sin tablas adicionales', () => {
    setup();
    const scroll = screen.getByTestId('heatmap-scroll-region');
    expect(scroll).toHaveAttribute('tabindex', '0');
    expect(within(scroll).getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('Desliza dentro del recuadro para ver todas las áreas')).toBeInTheDocument();
  });
});

describe('HU-EP09-06 / T2.3: estados, tooltip y actualización', () => {
  it('oculta siempre porcentaje y cantidad para muestras inferiores a 5', () => {
    const data = heatmapMockupFixture();
    data.cohorts[0].areas['software-development'] = { status: 'calculated', percentage: 99, graduateCount: 3 };
    setup({ data });
    expect(screen.queryByRole('button', { name: /cohorte 2019, desarrollo de software/i })).not.toBeInTheDocument();
    expect(screen.getAllByText(/Sin datos\s*suficientes/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/99 %/)).not.toBeInTheDocument();
    expect(screen.queryByText(/3 titulados/)).not.toBeInTheDocument();
  });

  it('muestra Sin datos en gris como estado distinto de 0 %', () => {
    const data: HeatmapData = heatmapMockupFixture();
    data.cohorts[0].areas['software-development'] = { status: 'calculated', percentage: 0, graduateCount: 5 };
    setup({ data });
    expect(screen.getByRole('button', { name: /cohorte 2019, desarrollo de software: 0 %/i })).toBeInTheDocument();
    expect(screen.getAllByText('Sin datos').length).toBeGreaterThan(0);
  });

  it('despliega el tooltip correcto al enfocar una celda y lo cierra con Escape', () => {
    setup();
    const button = screen.getByRole('button', { name: /cohorte 2021, ciencia de datos & ia: 64 %/i });
    fireEvent.focus(button);
    expect(screen.getByRole('tooltip')).toHaveTextContent('64 % · Calculado sobre 9 titulados');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('abre el tooltip por hover en escritorio', () => {
    setup();
    const button = screen.getByRole('button', { name: /cohorte 2021, ciencia de datos & ia: 64 %/i });
    // JSDOM no garantiza pointerType en eventos pointer sintéticos.
    // Verificamos el hover de escritorio mediante los eventos mouse nativos.
    fireEvent.mouseEnter(button);
    expect(screen.getByRole('tooltip')).toHaveTextContent('Calculado sobre 9 titulados');
    fireEvent.mouseLeave(button);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('puede desplegar el detalle al tocar una celda', () => {
    setup();
    const button = screen.getByRole('button', { name: /cohorte 2021, desarrollo de software: 76 %/i });
    fireEvent.click(button);
    expect(screen.getByRole('tooltip')).toHaveTextContent('Calculado sobre 10 titulados');
  });

  it('presenta la fecha del servidor y ejecuta el callback de Actualizar', () => {
    const onRefresh = jest.fn();
    setup({ onRefresh });
    expect(screen.getByText('Actualizado: 09/11/2026 18:40')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar' }));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('bloquea refrescos duplicados cuando loading y anuncia un fallo de red', () => {
    const onRefresh = jest.fn();
    setup({ onRefresh, loading: true, error: 'Error de conexión.' });
    expect(screen.getByRole('button', { name: 'Actualizando…' })).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('Error de conexión.');
  });

  it('no muestra porcentajes inventados antes de obtener una respuesta real', () => {
    setup({ data: null, loading: true });
    expect(screen.getByRole('status')).toHaveTextContent('Cargando mapa de calor…');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
