import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import type { AffinityAreaExplanation } from '@umsspira/shared-types';
import RadarInspection, { type AreaData } from './radar-inspection';

const explanationFixture: AffinityAreaExplanation = {
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

const inspectionFixture: AreaData[] = [
  {
    area: 'software-development', affinity: 85.6,
    evidence: [
      { type: 'certification', title: 'Certificado React Avanzado' },
      { type: 'project', title: 'Sistema de Gestión' },
    ],
  },
  { area: 'cloud-devops', affinity: 70, evidence: [] },
];

describe('RadarInspection Component', () => {
  const mockOnSelectArea = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('C2: Renderiza el estado vacío correctamente cuando no hay áreas', () => {
    // Pasamos un array vacío mediante la prop 'areas' para probar el estado vacío sin botones (CA-HU2-05)
    render(
      <RadarInspection 
        selectedAreaId={null} 
        onSelectArea={mockOnSelectArea} 
        areas={[]} 
      />
    );

    // Verificamos que se muestre el texto de estado vacío obligatorio
    expect(
      screen.getByText(/Sin datos de afinidad disponibles/i)
    ).toBeInTheDocument();

    // Verificamos rigurosamente que NO se renderice ningún botón
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  test('C4, C6 & C3: Muestra las áreas con sus nombres oficiales, porcentajes enteros y permite seleccionar un área', () => {
    render(<RadarInspection selectedAreaId={null} onSelectArea={mockOnSelectArea} areas={inspectionFixture} />);

    // Verifica que se muestre el texto de ayuda y los nombres de las áreas mapeadas
    expect(screen.getByText('Haz clic en un área para ver sus palabras clave')).toBeInTheDocument();
    expect(screen.getByText('Desarrollo de Software')).toBeInTheDocument();
    expect(screen.getByText('Cloud, DevOps & Infraestructura')).toBeInTheDocument();

    // Verifica porcentaje entero (85.6% formateado o redondeado según tu utilidad)
    expect(screen.getByText(/86%/i)).toBeInTheDocument();

    // Simula clic en un área para verificar la prop onSelectArea
    fireEvent.click(screen.getByText('Desarrollo de Software'));
    expect(mockOnSelectArea).toHaveBeenCalledWith('software-development');
  });

  test('C4: Muestra únicamente los respaldos del área seleccionada', () => {
    render(<RadarInspection selectedAreaId="software-development" onSelectArea={mockOnSelectArea} areas={inspectionFixture} />);

    // Debe mostrar los respaldos de desarrollo de software
    expect(screen.getByText('Certificado React Avanzado')).toBeInTheDocument();
    expect(screen.getByText('Sistema de Gestión')).toBeInTheDocument();
  });

  test('C5: Permite reemplazar la selección anterior enviando el nuevo ID o null al hacer clic', () => {
    const { rerender } = render(
      <RadarInspection selectedAreaId="software-development" onSelectArea={mockOnSelectArea} areas={inspectionFixture} />
    );

    // Si hacemos clic en "Volver al resumen" o en otra área, se dispara la prop
    const backButton = screen.getByText(/Volver al resumen/i);
    fireEvent.click(backButton);
    expect(mockOnSelectArea).toHaveBeenCalledWith(null);

    // Simulamos cambio de selección por props
    rerender(<RadarInspection selectedAreaId="cloud-devops" onSelectArea={mockOnSelectArea} areas={inspectionFixture} />);
    expect(screen.getByText('Área: Cloud, DevOps & Infraestructura')).toBeInTheDocument();
  });

  test('C9: Muestra el mensaje adecuado cuando el área seleccionada no tiene respaldos asociados', () => {
    render(<RadarInspection selectedAreaId="cloud-devops" onSelectArea={mockOnSelectArea} areas={inspectionFixture} />);

    expect(screen.getByText(/No se recibió información de respaldos para esta área/)).toBeInTheDocument();
    expect(screen.queryByText(/No hay certificaciones registradas/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Esta área no tiene respaldos asociados/)).not.toBeInTheDocument();
  });
});

describe('RadarInspection - indicador de variación en las barras del resumen', () => {
  const mockOnSelectArea = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderSummary = (areas: AreaData[], selectedAreaId: string | null = null) =>
    render(
      <RadarInspection
        selectedAreaId={selectedAreaId}
        onSelectArea={mockOnSelectArea}
        areas={areas}
      />
    );

  test('CA-HU8-07: muestra +8 % y −3 % junto al porcentaje de cada fila', () => {
    renderSummary([
      { area: 'software-development', affinity: 83, previousAffinity: 75 },
      { area: 'cloud-devops', affinity: 61, previousAffinity: 64 },
      { area: 'data-ai', affinity: 50, previousAffinity: 50 },
    ]);

    expect(screen.getByText('83%')).toBeInTheDocument();
    expect(screen.getByText('+8 %')).toBeInTheDocument();
    expect(
      screen.getByRole('img', {
        name: 'Desarrollo de Software: subió 8 puntos porcentuales respecto al cálculo anterior',
      }),
    ).toBeInTheDocument();

    expect(screen.getByText('61%')).toBeInTheDocument();
    expect(screen.getByText('\u22123 %')).toBeInTheDocument();
    expect(
      screen.getByRole('img', {
        name: 'Cloud, DevOps & Infraestructura: bajó 3 puntos porcentuales respecto al cálculo anterior',
      }),
    ).toBeInTheDocument();

    // La fila sin cambio no recibe ninguna variación (CA-HU8-09)
    expect(screen.getAllByRole('img')).toHaveLength(2);
  });

  test('CA-HU8-08: no muestra indicador en el primer cálculo, con previousAffinity null o ausente', () => {
    renderSummary([
      { area: 'software-development', affinity: 83, previousAffinity: null },
      { area: 'cloud-devops', affinity: 61 },
      { area: 'data-ai', affinity: 50, previousAffinity: 50 },
    ]);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('83%')).toBeInTheDocument();
    expect(screen.getByText('61%')).toBeInTheDocument();
  });

  test('CA-HU8-09: no muestra indicador cuando la variación redondeada es cero', () => {
    renderSummary([
      { area: 'software-development', affinity: 49.6, previousAffinity: 50.4 },
      { area: 'cloud-devops', affinity: 50, previousAffinity: 50 },
    ]);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getAllByText('50%')).toHaveLength(2);
  });

  test('T4.5: calcula la variación con los enteros mostrados, no con los decimales', () => {
    renderSummary([
      // 49,6 se muestra como 50% y 49,4 como 49%: la variación es +1 %
      { area: 'software-development', affinity: 49.6, previousAffinity: 49.4 },
      // 49,6 y 50,4 se muestran ambos como 50%: sin indicador
      { area: 'cloud-devops', affinity: 49.6, previousAffinity: 50.4 },
    ]);

    expect(screen.getByText('+1 %')).toBeInTheDocument();
    expect(screen.getAllByRole('img')).toHaveLength(1);
  });

  test('CA-HU8-04 y CA-HU8-05: ordena de mayor a menor y conserva el área seleccionada', () => {
    renderSummary(
      [
        { area: 'software-development', affinity: 60 },
        { area: 'data-ai', affinity: 75 },
        { area: 'cloud-devops', affinity: 90 },
      ],
      'cloud-devops',
    );

    const highest = screen.getByText('90%');
    const middle = screen.getByText('75%');
    const lowest = screen.getByText('60%');

    expect(
      highest.compareDocumentPosition(middle) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      middle.compareDocumentPosition(lowest) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    // El reordenamiento no pierde el área seleccionada en el panel de respaldos
    expect(
      screen.getByText('Área: Cloud, DevOps & Infraestructura'),
    ).toBeInTheDocument();
  });
});

describe('Información real sin vinculación de respaldos', () => {
  it.each([{ evidence: undefined }, { evidence: [] }])('conserva el porcentaje y los aportes cuando evidence es $evidence', ({ evidence }) => {
    render(<RadarInspection selectedAreaId="software-development" onSelectArea={jest.fn()} areas={[{
      area: 'software-development', affinity: 35, evidence,
      topKeywords: [{keyword: 'typescript', frequency: 2, weight: 5, points: 10, percentage: 25}],
    }]} />);
    expect(screen.getByText('35%')).toBeInTheDocument();
    expect(screen.getAllByText('typescript')).toHaveLength(1);
    expect(screen.getByText(/No se recibió información de respaldos/)).toBeInTheDocument();
    expect(screen.queryByText(/No hay certificaciones registradas/)).not.toBeInTheDocument();
    expect(screen.getByText(/título e institución.*cargo y empresa.*nombre y entidad emisora.*descripción profesional.*nombre, descripción y tecnologías de los proyectos/)).toBeInTheDocument();
    expect(screen.queryByText(/electivas aprobadas|certificaciones validadas/)).not.toBeInTheDocument();
  });

  it('no carga un mock implícito si no se reciben áreas', () => {
    render(<RadarInspection selectedAreaId={null} onSelectArea={jest.fn()} />);
    expect(screen.getByText('Sin datos de afinidad disponibles')).toBeInTheDocument();
    expect(screen.queryByText('Desarrollo de Software')).not.toBeInTheDocument();
  });
});


it('un 0 % describe los aportes detectados, sin afirmar que no existen certificaciones', () => {
  render(<RadarInspection selectedAreaId="quality-assurance" onSelectArea={jest.fn()} areas={[{ area: 'quality-assurance', affinity: 0 }]} />);
  expect(screen.getByText(/No se detectaron aportes para esta área/)).toBeInTheDocument();
  expect(screen.queryByText(/No hay certificaciones registradas/)).not.toBeInTheDocument();
});

describe('T11.5 · Revisión contra la tabla de fuentes y cierre de F-10 y F-05', () => {
  it('incluye las fuentes reales, avisos de interpretación, información guardada y negaciones sin emojis ni campos no analizados', () => {
    const { container } = render(
      <RadarInspection
        selectedAreaId="software-development"
        onSelectArea={jest.fn()}
        areas={[
          {
            area: 'software-development',
            affinity: 35,
            topKeywords: [
              { keyword: 'typescript', frequency: 2, weight: 5, points: 10, percentage: 25 },
            ],
          },
        ]}
      />,
    );

    expect(
      screen.getByText(
        /título e institución de formación, cargo y empresa de experiencia laboral, nombre y entidad emisora de certificaciones, descripción profesional, y nombre, descripción y tecnologías de los proyectos/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Las fechas, los archivos adjuntos y los enlaces de los proyectos quedan fuera del cálculo/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/no mide ni certifica tu nivel de competencia/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Solo se utiliza la información guardada en tu perfil\. Los cambios que aún no hayas guardado no se incluyen en el cálculo/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/El sistema no interpreta negaciones/i),
    ).toBeInTheDocument();

    const text = container.textContent ?? '';
    const hasEmoji = Array.from(text).some((character) => {
      const codePoint = character.codePointAt(0) ?? 0;
      return codePoint >= 0x1f300 && codePoint <= 0x1faff;
    });
    expect(hasEmoji).toBe(false);
    expect(text).not.toMatch(/certificaciones validadas|electivas aprobadas|CV|foto de perfil/i);
  });
});

describe('T13.5 · bloque de explicación dentro del panel de inspección', () => {
  const areasWithExplanation: AreaData[] = [
    {
      area: 'cloud-devops',
      affinity: 35,
      previousAffinity: 0,
      explanation: explanationFixture,
    },
  ];

  it('muestra el bloque solo para el área seleccionada', () => {
    const { rerender } = render(
      <RadarInspection
        selectedAreaId={null}
        onSelectArea={jest.fn()}
        areas={areasWithExplanation}
      />,
    );

    expect(screen.queryByText('¿Por qué cambió?')).not.toBeInTheDocument();

    rerender(
      <RadarInspection
        selectedAreaId="cloud-devops"
        onSelectArea={jest.fn()}
        areas={areasWithExplanation}
      />,
    );

    expect(screen.getByText('¿Por qué cambió?')).toBeInTheDocument();
    expect(screen.getByText('+25 puntos porcentuales')).toBeInTheDocument();
  });

  it('no muestra el bloque cuando el área no tiene explicación', () => {
    render(
      <RadarInspection
        selectedAreaId="cloud-devops"
        onSelectArea={jest.fn()}
        areas={[{ area: 'cloud-devops', affinity: 35, previousAffinity: 0 }]}
      />,
    );

    expect(screen.queryByText('¿Por qué cambió?')).not.toBeInTheDocument();
  });

  it('refleja los estados de carga y error del panel', () => {
    const { rerender } = render(
      <RadarInspection
        selectedAreaId="cloud-devops"
        onSelectArea={jest.fn()}
        areas={areasWithExplanation}
        isExplanationLoading
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent(
      'Cargando la explicación de los cambios',
    );

    rerender(
      <RadarInspection
        selectedAreaId="cloud-devops"
        onSelectArea={jest.fn()}
        areas={areasWithExplanation}
        hasExplanationError
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'No se pudo cargar la explicación de los cambios de esta área.',
    );
  });
});
