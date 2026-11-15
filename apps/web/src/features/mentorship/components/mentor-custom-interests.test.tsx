import '@testing-library/jest-dom';
import { fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import { MentorInterests } from './mentor-interests';
import type { InterestArea, InterestConfiguration } from '../model/mentor-interests';

const push = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

describe('HU 6.22 - Intereses de mentoría personalizados', () => {
  const initialCatalog: InterestArea[] = [
    {
      id: 'area-backend',
      name: 'Backend',
      description: 'Arquitectura de servidores y APIs',
      topics: [
        { id: 'topic-nest', name: 'NestJS' },
        { id: 'topic-go', name: 'Golang' },
      ],
    },
    {
      id: 'area-frontend',
      name: 'Frontend',
      description: 'Interfaces de usuario y clientes web',
      topics: [
        { id: 'topic-react', name: 'React' },
      ],
    },
  ];

  const initialConfig: InterestConfiguration = {
    areaIds: ['area-backend'],
    topicIds: ['topic-nest'],
  };

  let mockOnSave: jest.Mock;
  let mockOnCreateCustom: jest.Mock;
  let mockOnUpdateCustom: jest.Mock;
  let mockOnDeleteCustom: jest.Mock;

  beforeEach(() => {
    push.mockReset();
    mockOnSave = jest.fn(async (c) => c);
    mockOnCreateCustom = jest.fn();
    mockOnUpdateCustom = jest.fn();
    mockOnDeleteCustom = jest.fn();
  });

  function renderComponent(catalog = initialCatalog, config = initialConfig) {
    return render(
      <MentorInterests
        catalog={catalog}
        initialConfiguration={config}
        onSave={mockOnSave}
        onCreateCustomTopic={mockOnCreateCustom}
        onUpdateCustomTopic={mockOnUpdateCustom}
        onDeleteCustomTopic={mockOnDeleteCustom}
      />,
    );
  }

  // CAF-01: Campo para interés personalizado
  it('CAF-01: muestra campo "Agregar otro tema" y botón en área técnica configurada', () => {
    renderComponent();
    expect(screen.getByLabelText(/Agregar otro tema/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Escribe un tema de interés/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Agregar$/i })).toBeInTheDocument();
  });

  // CAF-02: Agregado exitoso
  it('CAF-02: agrega exitosamente un tema personalizado con etiqueta "Personalizado" y feedback', async () => {
    mockOnCreateCustom.mockResolvedValueOnce({
      id: 'custom-1',
      name: 'Microservicios con Kafka',
      isCustom: true,
      matchedSuggested: false,
    });

    renderComponent();
    const input = screen.getByLabelText(/Agregar otro tema/i);
    const addButton = screen.getByRole('button', { name: /^Agregar$/i });

    fireEvent.change(input, { target: { value: 'Microservicios con Kafka' } });
    fireEvent.click(addButton);

    expect(mockOnCreateCustom).toHaveBeenCalledWith('area-backend', 'Microservicios con Kafka');

    await waitFor(() => {
      expect(screen.getByText('Microservicios con Kafka')).toBeInTheDocument();
      expect(screen.getByText('Personalizado')).toBeInTheDocument();
      expect(screen.getByText(/Interés agregado/i)).toBeInTheDocument();
    });
  });

  // CAF-04: Campo vacío o espacios
  it('CAF-04: muestra error "Escribe un tema de interés" si se intenta agregar vacío', () => {
    renderComponent();
    const input = screen.getByLabelText(/Agregar otro tema/i);

    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(screen.getByRole('alert')).toHaveTextContent('Escribe un tema de interés');
    expect(mockOnCreateCustom).not.toHaveBeenCalled();
  });

  // CAF-05: Longitud permitida (3-50) y contador visible
  it('CAF-05: valida rango de longitud 3-50 caracteres y muestra contador visible', () => {
    renderComponent();
    const input = screen.getByLabelText(/Agregar otro tema/i);
    const counter = screen.getByText('0/50');
    expect(counter).toBeInTheDocument();

    // Menos de 3 caracteres
    fireEvent.change(input, { target: { value: 'ab' } });
    expect(screen.getByText('2/50')).toBeInTheDocument();
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    expect(screen.getByRole('alert')).toHaveTextContent(
      'El tema de interés debe tener entre 3 y 50 caracteres',
    );
    expect(mockOnCreateCustom).not.toHaveBeenCalled();
  });

  // CAF-06: Interés duplicado
  it('CAF-06: rechaza intereses duplicados en el área sin distinguir mayúsculas ni tildes', () => {
    renderComponent();
    const input = screen.getByLabelText(/Agregar otro tema/i);

    // "NestJS" ya está seleccionado en Backend
    fireEvent.change(input, { target: { value: 'nestjs' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(screen.getByRole('alert')).toHaveTextContent('Ya tienes este interés en el área');
    expect(mockOnCreateCustom).not.toHaveBeenCalled();
  });

  // CAF-07: Coincidencia con sugerido existente
  it('CAF-07: selecciona sugerido existente si el texto coincide con uno del catálogo', () => {
    renderComponent();
    const input = screen.getByLabelText(/Agregar otro tema/i);

    // "Golang" es sugerido no seleccionado
    fireEvent.change(input, { target: { value: 'golang' } });
    fireEvent.click(screen.getByRole('button', { name: /^Agregar$/i }));

    expect(screen.getByText('Se seleccionó el interés sugerido existente')).toBeInTheDocument();
    expect(mockOnCreateCustom).not.toHaveBeenCalled();
    // Golang ahora está en el perfil
    const golangBtn = screen.getByRole('button', { name: /Golang/i });
    expect(golangBtn).toHaveAttribute('aria-pressed', 'true');
  });

  // CAF-08: Límite de intereses personalizados por área
  it('CAF-08: impide agregar más de 5 intereses personalizados en la misma área', () => {
    const catalogWith5Custom: InterestArea[] = [
      {
        id: 'area-backend',
        name: 'Backend',
        description: 'Backend dev',
        topics: [
          { id: 'c1', name: 'Custom 1', isCustom: true },
          { id: 'c2', name: 'Custom 2', isCustom: true },
          { id: 'c3', name: 'Custom 3', isCustom: true },
          { id: 'c4', name: 'Custom 4', isCustom: true },
          { id: 'c5', name: 'Custom 5', isCustom: true },
        ],
      },
    ];
    const configWith5: InterestConfiguration = {
      areaIds: ['area-backend'],
      topicIds: ['c1', 'c2', 'c3', 'c4', 'c5'],
    };

    renderComponent(catalogWith5Custom, configWith5);

    expect(screen.getByText(/Alcanzaste el máximo de 5 temas personalizados/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Agregar otro tema/i)).toBeDisabled();
    expect(screen.getByRole('button', { name: /^Agregar$/i })).toBeDisabled();
  });

  // CAF-09: Eliminar interés personalizado
  it('CAF-09: elimina interés personalizado tras confirmación modal y muestra mensaje', async () => {
    const catalogWithCustom: InterestArea[] = [
      {
        id: 'area-backend',
        name: 'Backend',
        description: 'Backend dev',
        topics: [{ id: 'c1', name: 'RabbitMQ', isCustom: true }],
      },
    ];
    mockOnDeleteCustom.mockResolvedValueOnce(undefined);

    renderComponent(catalogWithCustom, { areaIds: ['area-backend'], topicIds: ['c1'] });

    const topicBtn = screen.getByRole('button', { name: /^RabbitMQ/ });
    fireEvent.click(topicBtn);

    // Modal de confirmación
    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveTextContent('¿Eliminar interés personalizado?');
    expect(dialog).toHaveTextContent('RabbitMQ');

    fireEvent.click(within(dialog).getByRole('button', { name: /Eliminar interés/i }));

    expect(mockOnDeleteCustom).toHaveBeenCalledWith('c1');
    await waitFor(() => {
      expect(screen.queryByText('RabbitMQ')).not.toBeInTheDocument();
      expect(screen.getByText('Interés eliminado')).toBeInTheDocument();
    });
  });

  // CAF-10: Editar interés personalizado
  it('CAF-10: edita un interés personalizado existente mediante modal', async () => {
    const catalogWithCustom: InterestArea[] = [
      {
        id: 'area-backend',
        name: 'Backend',
        description: 'Backend dev',
        topics: [{ id: 'c1', name: 'FastAPI', isCustom: true }],
      },
    ];
    mockOnUpdateCustom.mockResolvedValueOnce({ id: 'c1', name: 'FastAPI + Pydantic' });

    renderComponent(catalogWithCustom, { areaIds: ['area-backend'], topicIds: ['c1'] });

    const editBtn = screen.getByRole('button', { name: /Editar FastAPI/i });
    fireEvent.click(editBtn);

    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveTextContent('Editar interés personalizado');

    const editInput = within(dialog).getByDisplayValue('FastAPI');
    fireEvent.change(editInput, { target: { value: 'FastAPI + Pydantic' } });

    fireEvent.click(within(dialog).getByRole('button', { name: /Guardar cambios/i }));

    expect(mockOnUpdateCustom).toHaveBeenCalledWith('c1', 'FastAPI + Pydantic');
    await waitFor(() => {
      expect(screen.getByText('FastAPI + Pydantic')).toBeInTheDocument();
      expect(screen.getByText('Interés actualizado')).toBeInTheDocument();
    });
  });

  // CAF-11: Caracteres no permitidos
  it('CAF-11: rechaza caracteres no válidos, HTML y scripts', () => {
    renderComponent();
    const input = screen.getByLabelText(/Agregar otro tema/i);

    // HTML / Script
    fireEvent.change(input, { target: { value: '<script>alert(1)</script>' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    expect(screen.getByRole('alert')).toHaveTextContent('El texto contiene caracteres no válidos');

    // Símbolos puros
    fireEvent.change(input, { target: { value: '$$$###@@@' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    expect(screen.getByRole('alert')).toHaveTextContent('El texto contiene caracteres no válidos');

    expect(mockOnCreateCustom).not.toHaveBeenCalled();
  });

  // CAF-14 / Task #270: Advertencia al quitar un área con intereses
  it('CAF-14 (#270): advierte que se ocultarán y eliminarán intereses al quitar un área', () => {
    renderComponent();
    fireEvent.click(screen.getByRole('button', { name: /Quitar área/i }));

    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveTextContent('Esta área tiene tópicos asociados');
    expect(dialog).toHaveTextContent('se ocultarán y eliminarán sus intereses propios y sugeridos');
    expect(dialog).toHaveTextContent('NestJS');
  });

  // Task #272: Indicador de paso actual y completados
  it('#272: muestra el indicador con el paso actual "Intereses de mentoría" y pasos completados', () => {
    renderComponent();
    expect(screen.getByText(/Completa tu perfil de mentor/i)).toBeInTheDocument();
    expect(screen.getByText(/paso actual/i)).toBeInTheDocument();
    expect(screen.getByText(/Intereses de mentoría/i)).toBeInTheDocument();
    expect(screen.getByText(/Paso 1/i)).toBeInTheDocument();
    expect(screen.getByText(/Paso 3/i)).toBeInTheDocument();
  });
});
