import { fireEvent, render, screen, within } from '@testing-library/react';
import {
  AccreditationFilters,
  AccreditationNoDataForPeriod,
  SemesterHeatmapNote,
} from './accreditation-filters';

const baseProps = {
  cohorts: ['2021', '2019', '2023', '2020', '2022'],
  semesters: ['1/2026', '2/2026'],
  value: { cohort: '', semester: '' },
  onCohortChange: jest.fn(),
  onSemesterChange: jest.fn(),
  onClear: jest.fn(),
};

function options(label: string) {
  return within(screen.getByLabelText(label))
    .getAllByRole('option')
    .map((option) => option.textContent);
}

beforeEach(() => jest.clearAllMocks());

test('CA-01: «Cohorte» muestra «Todas» y un año por cohorte, de la más antigua a la más reciente', () => {
  render(<AccreditationFilters {...baseProps} />);
  expect(options('Cohorte')).toEqual(['Todas', '2019', '2020', '2021', '2022', '2023']);
});

test('CA-02: «Semestre» muestra «Todos» y cada semestre con formato 2/2026', () => {
  render(<AccreditationFilters {...baseProps} />);
  expect(options('Semestre')).toEqual(['Todos', '2/2026', '1/2026']);
});

test('notifica la cohorte y el semestre elegidos', () => {
  render(<AccreditationFilters {...baseProps} />);
  fireEvent.change(screen.getByLabelText('Cohorte'), { target: { value: '2023' } });
  fireEvent.change(screen.getByLabelText('Semestre'), { target: { value: '1/2026' } });
  expect(baseProps.onCohortChange).toHaveBeenCalledWith('2023');
  expect(baseProps.onSemesterChange).toHaveBeenCalledWith('1/2026');
});

test('muestra los valores elegidos (por ejemplo, tras recargar la página)', () => {
  render(
    <AccreditationFilters {...baseProps} value={{ cohort: '2023', semester: '1/2026' }} />,
  );
  expect(screen.getByLabelText('Cohorte')).toHaveValue('2023');
  expect(screen.getByLabelText('Semestre')).toHaveValue('1/2026');
});

test('CA-07: el botón «Limpiar filtros» avisa para volver a «Todas» y «Todos»', () => {
  render(<AccreditationFilters {...baseProps} />);
  fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
  expect(baseProps.onClear).toHaveBeenCalledTimes(1);
});

test('CA-08: muestra el mensaje cuando el periodo no tiene datos', () => {
  render(<AccreditationNoDataForPeriod />);
  expect(screen.getByRole('status')).toHaveTextContent(
    'No hay información para el periodo seleccionado',
  );
});

test('CA-05: la nota del mapa de calor aparece solo con un semestre elegido', () => {
  const { rerender } = render(<SemesterHeatmapNote visible={false} />);
  expect(screen.queryByRole('note')).not.toBeInTheDocument();
  rerender(<SemesterHeatmapNote visible />);
  expect(screen.getByRole('note')).toHaveTextContent(
    'El filtro de semestre no se aplica al mapa de calor',
  );
});