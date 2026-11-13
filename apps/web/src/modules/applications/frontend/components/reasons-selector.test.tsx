import { fireEvent, render, screen } from '@testing-library/react';
import { ReasonsSelector } from './reasons-selector';

const OPTIONS = ['Documento ilegible', 'Documento incompleto', 'Datos incorrectos'];

describe('ReasonsSelector', () => {
  it('muestra una casilla por motivo y ninguna marcada al inicio', () => {
    render(<ReasonsSelector options={OPTIONS} selected={[]} onChange={jest.fn()} />);

    const boxes = screen.getAllByRole('checkbox');
    expect(boxes).toHaveLength(3);
    boxes.forEach((box) => expect(box).not.toBeChecked());
  });

  it('entrega los motivos marcados en el orden de la lista', () => {
    const onChange = jest.fn();
    render(<ReasonsSelector options={OPTIONS} selected={['Datos incorrectos']} onChange={onChange} />);

    fireEvent.click(screen.getByLabelText('Documento ilegible'));

    expect(onChange).toHaveBeenCalledWith(['Documento ilegible', 'Datos incorrectos']);
  });

  it('quita un motivo al desmarcarlo', () => {
    const onChange = jest.fn();
    render(
      <ReasonsSelector
        options={OPTIONS}
        selected={['Documento ilegible', 'Datos incorrectos']}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByLabelText('Documento ilegible'));

    expect(onChange).toHaveBeenCalledWith(['Datos incorrectos']);
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
