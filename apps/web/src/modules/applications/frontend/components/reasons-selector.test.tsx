import { fireEvent, render, screen } from '@testing-library/react';
import { ReasonsSelector } from './reasons-selector';

const OPTIONS = [
  { code: 'documento_ilegible', label: 'Documento ilegible o borroso' },
  { code: 'documento_incompleto', label: 'Documento de respaldo incompleto o formato no válido' },
  { code: 'datos_no_coinciden', label: 'Datos declarados no coinciden con el respaldo' },
];

describe('ReasonsSelector', () => {
  it('muestra una casilla por motivo y ninguna marcada al inicio', () => {
    render(<ReasonsSelector options={OPTIONS} selected={[]} onChange={jest.fn()} />);

    const boxes = screen.getAllByRole('checkbox');
    expect(boxes).toHaveLength(3);
    boxes.forEach((box) => expect(box).not.toBeChecked());
  });

  it('entrega los motivos marcados en el orden de la lista', () => {
    const onChange = jest.fn();
    render(<ReasonsSelector options={OPTIONS} selected={['datos_no_coinciden']} onChange={onChange} />);

    fireEvent.click(screen.getByLabelText('Documento ilegible o borroso'));

    expect(onChange).toHaveBeenCalledWith(['documento_ilegible', 'datos_no_coinciden']);
  });

  it('quita un motivo al desmarcarlo', () => {
    const onChange = jest.fn();
    render(
      <ReasonsSelector
        options={OPTIONS}
        selected={['documento_ilegible', 'datos_no_coinciden']}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByLabelText('Documento ilegible o borroso'));

    expect(onChange).toHaveBeenCalledWith(['datos_no_coinciden']);
  });

  it('muestra el error cuando se indica', () => {
    render(
      <ReasonsSelector
        options={OPTIONS}
        selected={[]}
        onChange={jest.fn()}
        error="Selecciona al menos un motivo de observación."
      />,
    );

    expect(screen.getByText('Selecciona al menos un motivo de observación.')).toBeInTheDocument();
  });

  it('deshabilita las casillas cuando se indica', () => {
    render(<ReasonsSelector options={OPTIONS} selected={[]} onChange={jest.fn()} disabled />);

    screen.getAllByRole('checkbox').forEach((box) => expect(box).toBeDisabled());
  });
});
