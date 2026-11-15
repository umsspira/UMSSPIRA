import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { AffinityAreaExplanation } from '@umsspira/shared-types';
import { ChangeExplanation, type ChangeExplanationProps } from './change-explanation';

const increaseExplanation: AffinityAreaExplanation = {
  cause: 'profile',
  changes: [
    {
      keyword: 'AWS',
      previousPoints: 0,
      currentPoints: 10,
      deltaPercentagePoints: 25,
    },
    {
      keyword: 'Solutions Architect',
      previousPoints: 0,
      currentPoints: 4,
      deltaPercentagePoints: 10,
    },
  ],
};

const baseProps: ChangeExplanationProps = {
  areaLabel: 'Cloud/DevOps',
  affinity: 35,
  previousAffinity: 0,
  explanation: increaseExplanation,
};

function hasEmoji(text: string): boolean {
  return Array.from(text).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint >= 0x1f300 && codePoint <= 0x1faff;
  });
}

describe('ChangeExplanation', () => {
  it('renderiza el aumento del ejemplo con todas las contribuciones y sus signos', () => {
    const { container } = render(<ChangeExplanation {...baseProps} />);

    expect(screen.getByText('¿Por qué cambió?')).toBeInTheDocument();
    expect(
      screen.getByText('Cloud/DevOps aumentó de 0 % a 35 %.'),
    ).toBeInTheDocument();
    expect(screen.getByText('AWS')).toBeInTheDocument();
    expect(screen.getByText('+25 puntos porcentuales')).toBeInTheDocument();
    expect(screen.getByText('Solutions Architect')).toBeInTheDocument();
    expect(screen.getByText('+10 puntos porcentuales')).toBeInTheDocument();

    const text = container.textContent ?? '';
    expect(text).not.toMatch(/año|grado|jpg|pdf/i);
    expect(text).not.toMatch(/\bCV\b/i);
    expect(text).not.toMatch(/foto|mentoría|mentoria|habilidades|proyectos/i);
    expect(text).not.toMatch(/validación|validacion|certific|competencia/i);
    expect(hasEmoji(text)).toBe(false);
  });

  it('usa el texto de disminución y muestra los aportes que bajaron', () => {
    render(
      <ChangeExplanation
        areaLabel="Cloud/DevOps"
        affinity={20}
        previousAffinity={40}
        explanation={{
          cause: 'profile',
          changes: [
            {
              keyword: 'Docker',
              previousPoints: 8,
              currentPoints: 4,
              deltaPercentagePoints: -10,
            },
            {
              keyword: 'AWS',
              previousPoints: 4,
              currentPoints: 4,
              deltaPercentagePoints: 0,
            },
          ],
        }}
      />,
    );

    expect(
      screen.getByText('Cloud/DevOps disminuyó de 40 % a 20 %.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Los aportes que bajaron son:')).toBeInTheDocument();
    expect(screen.getByText('Docker')).toBeInTheDocument();
    expect(screen.getByText('\u221210 puntos porcentuales')).toBeInTheDocument();
    expect(screen.queryByText('AWS')).not.toBeInTheDocument();
  });

  it('no indica aumento ni disminución cuando el entero mostrado no cambia', () => {
    const { container } = render(
      <ChangeExplanation
        areaLabel="Cloud/DevOps"
        affinity={50.4}
        previousAffinity={49.6}
        explanation={{
          cause: 'profile',
          changes: [
            {
              keyword: 'AWS',
              previousPoints: 10,
              currentPoints: 10.4,
              deltaPercentagePoints: 1,
            },
          ],
        }}
      />,
    );

    expect(screen.getByText(/se mantiene en 50 %/)).toBeInTheDocument();
    expect(container.textContent ?? '').not.toMatch(/aument|disminuy|subi|baj/i);
  });

  it('muestra solo aportes actuales en el primer cálculo, sin comparación', () => {
    const { container } = render(
      <ChangeExplanation
        areaLabel="Cloud/DevOps"
        affinity={35}
        previousAffinity={null}
        explanation={increaseExplanation}
      />,
    );

    expect(
      screen.getByText('Primer cálculo de Cloud/DevOps: 35 %.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Aportes actuales:')).toBeInTheDocument();
    expect(screen.getByText('25 puntos porcentuales')).toBeInTheDocument();
    expect(screen.getByText('10 puntos porcentuales')).toBeInTheDocument();
    expect(container.textContent ?? '').not.toMatch(
      /anterior|comparación|comparacion|variación|variacion|perfil/i,
    );
  });

  it('identifica una actualización del diccionario y no la atribuye al perfil', () => {
    render(
      <ChangeExplanation
        areaLabel="Cloud/DevOps"
        affinity={35}
        previousAffinity={10}
        explanation={{
          cause: 'dictionary',
          changes: [
            {
              keyword: 'AWS',
              previousPoints: 0,
              currentPoints: 10,
              deltaPercentagePoints: 25,
            },
          ],
        }}
      />,
    );

    expect(
      screen.getByText(/actualización del diccionario de palabras clave/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/perfil/i)).not.toBeInTheDocument();
  });

  it('muestra todas las contribuciones cuando hay más de cinco cambios', () => {
    const explanation: AffinityAreaExplanation = {
      cause: 'profile',
      changes: Array.from({ length: 7 }, (_, index) => ({
        keyword: `keyword-${index + 1}`,
        previousPoints: 0,
        currentPoints: 4,
        deltaPercentagePoints: 10,
      })),
    };

    render(
      <ChangeExplanation
        areaLabel="Desarrollo de Software"
        affinity={70}
        previousAffinity={0}
        explanation={explanation}
      />,
    );

    expect(screen.getAllByRole('listitem')).toHaveLength(7);
    expect(screen.getByText('keyword-7')).toBeInTheDocument();
  });

  it('muestra la carga mientras la respuesta está pendiente', () => {
    render(<ChangeExplanation {...baseProps} isLoading />);

    expect(screen.getByRole('status')).toHaveTextContent(
      'Cargando la explicación de los cambios',
    );
    expect(
      screen.queryByText('Cloud/DevOps aumentó de 0 % a 35 %.'),
    ).not.toBeInTheDocument();
  });

  it('muestra el error y permite reintentar cuando la solicitud falla', () => {
    const onRetry = jest.fn();
    render(
      <ChangeExplanation {...baseProps} hasError onRetry={onRetry} />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'No se pudo cargar la explicación de los cambios de esta área.',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('no se renderiza sin explicación', () => {
    const { container, rerender } = render(
      <ChangeExplanation
        areaLabel="Cloud/DevOps"
        affinity={35}
        previousAffinity={20}
        explanation={null}
      />,
    );

    expect(container).toBeEmptyDOMElement();

    rerender(
      <ChangeExplanation
        areaLabel="Cloud/DevOps"
        affinity={35}
        previousAffinity={null}
        explanation={null}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
