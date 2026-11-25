import { fireEvent, render, screen } from '@testing-library/react';

import ProfessionalDescription, { LARGO_DESCRIPCION_RECORTADA } from './professional-description';

describe('ProfessionalDescription', () => {
  it('muestra la descripción profesional del egresado', () => {
    render(<ProfessionalDescription description="Ingeniero de sistemas con 7 años de experiencia." />);

    expect(screen.getByRole('heading', { name: 'Descripción profesional' })).toBeInTheDocument();
    expect(screen.getByText('Ingeniero de sistemas con 7 años de experiencia.')).toBeInTheDocument();
  });

  it('muestra "Sin registros" si no hay descripción', () => {
    render(<ProfessionalDescription description="" />);

    expect(screen.getByText('Sin registros')).toBeInTheDocument();
  });

  it('no muestra «Leer más» si la descripción es corta', () => {
    render(<ProfessionalDescription description="Ingeniero de sistemas." />);

    expect(screen.queryByRole('button', { name: 'Leer más' })).not.toBeInTheDocument();
  });

  it('recorta la descripción larga a 3 líneas y alterna «Leer más» / «Leer menos» (HU-21)', () => {
    const larga = 'a'.repeat(LARGO_DESCRIPCION_RECORTADA + 1);
    render(<ProfessionalDescription description={larga} />);

    const texto = screen.getByText(larga);
    const boton = screen.getByRole('button', { name: 'Leer más' });
    expect(texto).toHaveClass('line-clamp-3');
    expect(boton).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(boton);
    expect(texto).not.toHaveClass('line-clamp-3');
    expect(screen.getByRole('button', { name: 'Leer menos' })).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Leer menos' }));
    expect(texto).toHaveClass('line-clamp-3');
  });

  it('recorta también una descripción corta con más de 3 líneas', () => {
    render(<ProfessionalDescription description={'uno\ndos\ntres\ncuatro'} />);

    expect(screen.getByRole('button', { name: 'Leer más' })).toBeInTheDocument();
  });
});

describe('«Leer más» según las líneas que ocupa en pantalla (HU-21)', () => {
  function simularAlto(scroll: number, visible: number) {
    jest.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(scroll);
    jest.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(visible);
  }
  afterEach(() => jest.restoreAllMocks());

  it('un texto corto que en pantalla pasa de 3 líneas muestra «Leer más»', () => {
    simularAlto(120, 66);
    render(<ProfessionalDescription description="Texto corto en una columna angosta." />);
    expect(screen.getByRole('button', { name: 'Leer más' })).toBeInTheDocument();
  });

  it('un texto largo que cabe en 3 líneas (pantalla ancha) no muestra «Leer más»', () => {
    simularAlto(66, 66);
    render(<ProfessionalDescription description={'a '.repeat(LARGO_DESCRIPCION_RECORTADA)} />);
    expect(screen.queryByRole('button', { name: 'Leer más' })).not.toBeInTheDocument();
  });
});
