
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ApiError } from '@/shared/services/api-client';
import { FormularioCertificaciones } from './certificaciones';
 
// El respaldo es obligatorio (T8.3): por defecto se adjunta un JPG válido
function llenarFormulario({ conRespaldo = true } = {}) {
  fireEvent.change(screen.getByLabelText('Nombre de certificación'), { target: { value: 'AWS Cloud Practitioner' } });
  fireEvent.change(screen.getByLabelText('Entidad emisora'), { target: { value: 'Amazon Web Services' } });
  fireEvent.change(screen.getByLabelText('Año'), { target: { value: '2023' } });
  if (conRespaldo) {
    const foto = new File(['contenido'], 'respaldo.jpg', { type: 'image/jpeg' });
    fireEvent.change(screen.getByLabelText('Subir foto', { selector: 'input' }), { target: { files: [foto] } });
  }
}
 
describe('FormularioCertificaciones', () => {
  it('muestra los campos obligatorios, sin Grado (el backend usa Profesional)', () => {
    render(<FormularioCertificaciones certificaciones={[]} onAgregar={jest.fn()} />);
 
    for (const etiqueta of ['Nombre de certificación', 'Entidad emisora', 'Año']) {
      expect(screen.getByLabelText(etiqueta)).toBeRequired();
    }
    expect(screen.queryByLabelText('Grado')).not.toBeInTheDocument();
  });
 
  it('permite subir una foto o un documento como respaldo', () => {
    render(<FormularioCertificaciones certificaciones={[]} onAgregar={jest.fn()} />);
 
    expect(screen.getByRole('button', { name: 'Subir foto' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Subir documento' })).toBeInTheDocument();
    expect(screen.getByLabelText('Subir foto', { selector: 'input' })).toHaveAttribute('accept', 'application/pdf,image/jpeg');
    expect(screen.getByLabelText('Subir documento', { selector: 'input' })).toHaveAttribute('accept', 'application/pdf,image/jpeg');
    // La interfaz indica el formato y el tamaño permitidos (BUG-HU2-007)
    expect(screen.getByText('PDF o JPG, máximo 5 MB')).toBeInTheDocument();
  });
 
  it('envia la certificacion con su respaldo', () => {
    const onAgregar = jest.fn();
    render(<FormularioCertificaciones certificaciones={[]} onAgregar={onAgregar} />);
    llenarFormulario();
    const archivo = new File(['contenido'], 'certificado.jpg', { type: 'image/jpeg' });
 
    fireEvent.change(screen.getByLabelText('Subir documento', { selector: 'input' }), { target: { files: [archivo] } });
    expect(screen.getByText('certificado.jpg')).toBeInTheDocument();
 
    fireEvent.click(screen.getByRole('button', { name: /agregar certificación/i }));
 
    expect(onAgregar).toHaveBeenCalledWith({
      nombre: 'AWS Cloud Practitioner',
      entidadEmisora: 'Amazon Web Services',
      anioEmision: '2023',
      grado: '',
      respaldo: archivo,
    });
  });
});
 
describe('FormularioCertificaciones · respaldo PDF o JPG de hasta 5 MB (HU-18)', () => {
  const MB = 1024 * 1024;
 
  // File con el tamaño indicado sin reservar esa memoria: size se sobrescribe
  function archivo(nombre: string, tipo: string, tamanio = 1024): File {
    const file = new File(['contenido'], nombre, { type: tipo });
    Object.defineProperty(file, 'size', { value: tamanio });
    return file;
  }
 
  function adjuntar(file: File) {
    fireEvent.change(screen.getByLabelText('Subir documento', { selector: 'input' }), { target: { files: [file] } });
  }
 
  it('rechaza un PNG de 6 MB por formato y no lo adjunta', () => {
    const onAgregar = jest.fn();
    render(<FormularioCertificaciones certificaciones={[]} onAgregar={onAgregar} />);
    llenarFormulario({ conRespaldo: false });
 
    adjuntar(archivo('certificado.png', 'image/png', 6 * MB));
 
    expect(screen.getByText('Solo se aceptan archivos PDF o JPG de hasta 5 MB')).toHaveAttribute('id', 'error-respaldo');
    expect(screen.queryByText('certificado.png')).not.toBeInTheDocument();
 
    // Sin un respaldo válido no se envía nada (T8.3)
    fireEvent.click(screen.getByRole('button', { name: /agregar certificación/i }));
    expect(onAgregar).not.toHaveBeenCalled();
  });
 
  it('rechaza un JPG de más de 5 MB', () => {
    render(<FormularioCertificaciones certificaciones={[]} onAgregar={jest.fn()} />);
 
    adjuntar(archivo('certificado.jpg', 'image/jpeg', 6 * MB));
 
    expect(screen.getByText('Solo se aceptan archivos PDF o JPG de hasta 5 MB')).toBeInTheDocument();
    expect(screen.queryByText('certificado.jpg')).not.toBeInTheDocument();
  });
 
  it('quita el error al adjuntar después un JPG válido', () => {
    render(<FormularioCertificaciones certificaciones={[]} onAgregar={jest.fn()} />);
    adjuntar(archivo('certificado.png', 'image/png'));
 
    adjuntar(archivo('certificado.jpg', 'image/jpeg', 5 * MB));
 
    expect(screen.queryByText('Solo se aceptan archivos PDF o JPG de hasta 5 MB')).not.toBeInTheDocument();
    expect(screen.getByText('certificado.jpg')).toBeInTheDocument();
  });
 
  it('limpia el error al agregar la certificación', async () => {
    render(<FormularioCertificaciones certificaciones={[]} onAgregar={jest.fn()} />);
    llenarFormulario();
    adjuntar(archivo('certificado.png', 'image/png'));
 
    fireEvent.click(screen.getByRole('button', { name: /agregar certificación/i }));
 
    await waitFor(() =>
      expect(screen.queryByText('Solo se aceptan archivos PDF o JPG de hasta 5 MB')).not.toBeInTheDocument(),
    );
  });
});
 
describe('FormularioCertificaciones · miniatura y quitar respaldo (T8.2)', () => {
  const crearUrl = jest.fn(() => 'blob:vista-previa');
  const revocarUrl = jest.fn();
 
  beforeEach(() => {
    crearUrl.mockClear();
    revocarUrl.mockClear();
    // jsdom no trae estas funciones del navegador
    Object.assign(URL, { createObjectURL: crearUrl, revokeObjectURL: revocarUrl });
  });
 
  function jpg(nombre = 'certificado.jpg', tamanio = 1536): File {
    const file = new File(['contenido'], nombre, { type: 'image/jpeg' });
    Object.defineProperty(file, 'size', { value: tamanio });
    return file;
  }
 
  function adjuntar(file: File) {
    fireEvent.change(screen.getByLabelText('Subir foto', { selector: 'input' }), { target: { files: [file] } });
  }
 
  it('muestra la miniatura, el nombre y el tamaño del respaldo', () => {
    render(<FormularioCertificaciones certificaciones={[]} onAgregar={jest.fn()} />);
 
    adjuntar(jpg());
 
    expect(screen.getByAltText('Vista previa del respaldo')).toHaveAttribute('src', 'blob:vista-previa');
    expect(screen.getByText('certificado.jpg')).toBeInTheDocument();
    expect(screen.getByText('1,5 KB')).toBeInTheDocument();
  });
 
  it('«Quitar» borra la vista previa y libera la memoria, las veces que sea', () => {
    render(<FormularioCertificaciones certificaciones={[]} onAgregar={jest.fn()} />);
 
    for (let i = 0; i < 3; i++) {
      adjuntar(jpg());
      fireEvent.click(screen.getByRole('button', { name: 'Quitar' }));
      expect(screen.queryByAltText('Vista previa del respaldo')).not.toBeInTheDocument();
      expect(screen.queryByText('certificado.jpg')).not.toBeInTheDocument();
    }
    expect(revocarUrl).toHaveBeenCalledTimes(3);
  });
 
  it('un archivo rechazado no muestra miniatura', () => {
    render(<FormularioCertificaciones certificaciones={[]} onAgregar={jest.fn()} />);
 
    adjuntar(new File(['x'], 'certificado.png', { type: 'image/png' }));
 
    expect(screen.queryByAltText('Vista previa del respaldo')).not.toBeInTheDocument();
    expect(screen.getByText('Solo se aceptan archivos PDF o JPG de hasta 5 MB')).toBeInTheDocument();
  });
});
 
describe('FormularioCertificaciones · guardado (T8.4)', () => {
  function jpg(): File {
    return new File(['contenido'], 'certificado.jpg', { type: 'image/jpeg' });
  }
 
  it('muestra Guardando… con el avance y limpia el formulario al terminar', async () => {
    let terminar!: () => void;
    const onAgregar = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          terminar = resolve;
        }),
    );
    render(<FormularioCertificaciones certificaciones={[]} onAgregar={onAgregar} progreso={40} />);
    llenarFormulario();
 
    fireEvent.click(screen.getByRole('button', { name: /agregar certificación/i }));
 
    expect(await screen.findByRole('button', { name: /guardando/i })).toBeDisabled();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '40');
 
    terminar();
    await waitFor(() => expect(screen.getByLabelText('Nombre de certificación')).toHaveValue(''));
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });
 
  it('si falla con ApiError muestra el mensaje y conserva lo escrito y la foto', async () => {
    const onAgregar = jest.fn().mockRejectedValue(new ApiError(0, 'No fue posible conectar con el servidor'));
    render(<FormularioCertificaciones certificaciones={[]} onAgregar={onAgregar} />);
    llenarFormulario();
    fireEvent.change(screen.getByLabelText('Subir foto', { selector: 'input' }), { target: { files: [jpg()] } });
 
    fireEvent.click(screen.getByRole('button', { name: /agregar certificación/i }));
 
    expect(
      await screen.findByText('No se pudo guardar la certificación. No fue posible conectar con el servidor'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre de certificación')).toHaveValue('AWS Cloud Practitioner');
    expect(screen.getByText('certificado.jpg')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /agregar certificación/i })).toBeEnabled();
  });
});
 
describe('FormularioCertificaciones · reintentar (T8.6)', () => {
  it('«Reintentar» reenvía lo mismo, conserva la foto y limpia al lograrlo', async () => {
    const onAgregar = jest
      .fn()
      .mockRejectedValueOnce(new ApiError(0, 'No fue posible conectar con el servidor'))
      .mockResolvedValueOnce(undefined);
    render(<FormularioCertificaciones certificaciones={[]} onAgregar={onAgregar} />);
    llenarFormulario();
    const foto = new File(['contenido'], 'certificado.jpg', { type: 'image/jpeg' });
    fireEvent.change(screen.getByLabelText('Subir foto', { selector: 'input' }), { target: { files: [foto] } });
    fireEvent.click(screen.getByRole('button', { name: /agregar certificación/i }));
 
    fireEvent.click(await screen.findByRole('button', { name: 'Reintentar' }));
 
    await waitFor(() => expect(onAgregar).toHaveBeenCalledTimes(2));
    expect(onAgregar.mock.calls[1][0]).toMatchObject({ nombre: 'AWS Cloud Practitioner', respaldo: foto });
    await waitFor(() => expect(screen.getByLabelText('Nombre de certificación')).toHaveValue(''));
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument();
    expect(screen.queryByText(/No se pudo guardar/)).not.toBeInTheDocument();
  });
 
  it('no muestra «Reintentar» si no hubo error', () => {
    render(<FormularioCertificaciones certificaciones={[]} onAgregar={jest.fn()} />);
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument();
  });
});
 
describe('FormularioCertificaciones · registros guardados (T8.1)', () => {
  // Las 3 certificaciones del perfil demo de Carlos Mendoza
  const GUARDADAS = [
    { nombre: 'AWS Solutions Architect', entidadEmisora: 'Amazon Web Services', anioEmision: '2022', grado: 'Profesional', respaldo: null },
    { nombre: 'Scrum Master PSM I', entidadEmisora: 'Scrum.org', anioEmision: '2021', grado: 'Asociado', respaldo: null },
    { nombre: 'Google Cloud Engineer', entidadEmisora: 'Google', anioEmision: '2023', grado: 'Profesional', respaldo: null },
  ];
 
  it('lista las certificaciones guardadas junto al formulario vacío', () => {
    render(<FormularioCertificaciones certificaciones={GUARDADAS} onAgregar={jest.fn()} />);
 
    expect(screen.getByText('Certificaciones registradas')).toBeInTheDocument();
    for (const { nombre } of GUARDADAS) {
      expect(screen.getByText(nombre)).toBeInTheDocument();
    }
    expect(screen.getByLabelText('Nombre de certificación')).toHaveValue('');
    expect(screen.getByLabelText('Entidad emisora')).toHaveValue('');
    expect(screen.getByLabelText('Año')).toHaveValue('');
    expect(screen.getByText('Respaldo de certificación')).toBeInTheDocument();
  });
 
  it('sin certificaciones guardadas solo muestra el formulario', () => {
    render(<FormularioCertificaciones certificaciones={[]} onAgregar={jest.fn()} />);
 
    expect(screen.queryByText('Certificaciones registradas')).not.toBeInTheDocument();
    expect(screen.getByText('Agregar nueva certificación')).toBeInTheDocument();
  });
});
 
describe('FormularioCertificaciones · validación en pantalla (T8.3)', () => {
  const anioActual = new Date().getFullYear();
 
  function agregar() {
    fireEvent.click(screen.getByRole('button', { name: /agregar certificación/i }));
  }
 
  it('con el formulario vacío marca los 4 campos y no envía nada', () => {
    const onAgregar = jest.fn();
    render(<FormularioCertificaciones certificaciones={[]} onAgregar={onAgregar} />);
 
    agregar();
 
    expect(screen.getAllByText('Este campo es obligatorio')).toHaveLength(3);
    expect(screen.getByText('Adjunta el respaldo de la certificación (PDF o JPG de hasta 5 MB)')).toHaveAttribute(
      'id',
      'error-respaldo',
    );
    expect(screen.getByLabelText('Nombre de certificación')).toHaveAttribute('aria-invalid', 'true');
    expect(onAgregar).not.toHaveBeenCalled();
  });
 
  it.each([
    ['Nombre de certificación', 'error-nombre'],
    ['Entidad emisora', 'error-entidadEmisora'],
  ])('«%s» vacío muestra su mensaje junto al campo', (etiqueta, idError) => {
    const onAgregar = jest.fn();
    render(<FormularioCertificaciones certificaciones={[]} onAgregar={onAgregar} />);
    llenarFormulario();
    fireEvent.change(screen.getByLabelText(etiqueta), { target: { value: '   ' } });
 
    agregar();
 
    expect(screen.getByText('Este campo es obligatorio')).toHaveAttribute('id', idError);
    expect(onAgregar).not.toHaveBeenCalled();
  });
 
  it.each(['1979', String(anioActual + 1)])('rechaza el año %s', (anio) => {
    const onAgregar = jest.fn();
    render(<FormularioCertificaciones certificaciones={[]} onAgregar={onAgregar} />);
    llenarFormulario();
    fireEvent.change(screen.getByLabelText('Año'), { target: { value: anio } });
 
    agregar();
 
    expect(screen.getByText(`El año debe estar entre 1980 y ${anioActual}`)).toHaveAttribute('id', 'error-anioEmision');
    expect(onAgregar).not.toHaveBeenCalled();
  });
 
  it('sin respaldo no se guarda', () => {
    const onAgregar = jest.fn();
    render(<FormularioCertificaciones certificaciones={[]} onAgregar={onAgregar} />);
    llenarFormulario({ conRespaldo: false });
 
    agregar();
 
    expect(screen.getByText('Adjunta el respaldo de la certificación (PDF o JPG de hasta 5 MB)')).toBeInTheDocument();
    expect(onAgregar).not.toHaveBeenCalled();
  });
 
  it('el mensaje se quita al corregir el campo', () => {
    render(<FormularioCertificaciones certificaciones={[]} onAgregar={jest.fn()} />);
    agregar();
 
    fireEvent.change(screen.getByLabelText('Nombre de certificación'), { target: { value: 'Scrum Master PSM I' } });
 
    expect(screen.queryByText('Este campo es obligatorio', { selector: '#error-nombre' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Nombre de certificación')).toHaveAttribute('aria-invalid', 'false');
  });
 
  it('con 1980 y todo válido sí envía', () => {
    const onAgregar = jest.fn();
    render(<FormularioCertificaciones certificaciones={[]} onAgregar={onAgregar} />);
    llenarFormulario();
    fireEvent.change(screen.getByLabelText('Año'), { target: { value: '1980' } });
 
    agregar();
 
    expect(onAgregar).toHaveBeenCalledTimes(1);
  });
});
 
describe('FormularioCertificaciones · retorno a Mi afinidad (T8.5)', () => {
  it('muestra «Certificación guardada» al guardar y lo quita al escribir otra', async () => {
    render(<FormularioCertificaciones certificaciones={[]} onAgregar={jest.fn().mockResolvedValue(undefined)} />);
    llenarFormulario();
 
    fireEvent.click(screen.getByRole('button', { name: /agregar certificación/i }));
 
    expect(await screen.findByRole('status')).toHaveTextContent('Certificación guardada');
    fireEvent.change(screen.getByLabelText('Nombre de certificación'), { target: { value: 'Otra' } });
    expect(screen.queryByText('Certificación guardada')).not.toBeInTheDocument();
  });
 
  it('si falla el guardado no muestra el aviso', async () => {
    const onAgregar = jest.fn().mockRejectedValue(new ApiError(0, 'No fue posible conectar con el servidor'));
    render(<FormularioCertificaciones certificaciones={[]} onAgregar={onAgregar} />);
    llenarFormulario();
 
    fireEvent.click(screen.getByRole('button', { name: /agregar certificación/i }));
 
    expect(await screen.findByText(/No se pudo guardar la certificación/)).toBeInTheDocument();
    expect(screen.queryByText('Certificación guardada')).not.toBeInTheDocument();
  });
});
 

describe('FormularioCertificaciones · bugs QA del sprint (HU8-01, HU8-02)', () => {
  const registrada = {
    id: 'cert-1',
    nombre: 'AWS Cloud Practitioner',
    entidadEmisora: 'Amazon Web Services',
    anioEmision: '2023',
    grado: 'Profesional',
    respaldo: null,
  };

  it('HU8-01: Cancelar descarta lo escrito y sale sin guardar', () => {
    const onAgregar = jest.fn();
    const onCancelar = jest.fn();
    render(<FormularioCertificaciones certificaciones={[]} onAgregar={onAgregar} onCancelar={onCancelar} />);
    llenarFormulario();

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onCancelar).toHaveBeenCalledTimes(1);
    expect(onAgregar).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Nombre de certificación')).toHaveValue('');
  });

  it('HU8-02: cada certificación registrada tiene editar y eliminar', () => {
    const onEliminar = jest.fn();
    render(
      <FormularioCertificaciones
        certificaciones={[registrada]}
        onAgregar={jest.fn()}
        hrefEditar={(id) => `/profile/certifications/${id}/edit`}
        onEliminar={onEliminar}
      />,
    );

    expect(screen.getByRole('link', { name: 'Editar AWS Cloud Practitioner' })).toHaveAttribute(
      'href',
      '/profile/certifications/cert-1/edit',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar AWS Cloud Practitioner' }));
    expect(onEliminar).toHaveBeenCalledWith('cert-1');
  });
});

describe('FormularioCertificaciones · contador de errores del encabezado (HU-02 AC 6)', () => {
  function ultimo(espia: jest.Mock): number {
    return espia.mock.calls[espia.mock.calls.length - 1][0];
  }

  it('al agregar vacío informa los cuatro errores de campo', () => {
    const onErroresChange = jest.fn();
    render(<FormularioCertificaciones certificaciones={[]} onAgregar={jest.fn()} onErroresChange={onErroresChange} />);

    fireEvent.click(screen.getByRole('button', { name: /agregar certificación/i }));

    expect(ultimo(onErroresChange)).toBe(4);
  });

  it('baja al corregir campos y no cuenta dos veces el respaldo', () => {
    const onErroresChange = jest.fn();
    render(<FormularioCertificaciones certificaciones={[]} onAgregar={jest.fn()} onErroresChange={onErroresChange} />);
    fireEvent.click(screen.getByRole('button', { name: /agregar certificación/i }));

    fireEvent.change(screen.getByLabelText('Nombre de certificación'), { target: { value: 'AWS' } });
    expect(ultimo(onErroresChange)).toBe(3);

    // Un archivo no válido reemplaza el mensaje de obligatorio del respaldo: sigue siendo un solo error
    const png = new File(['x'], 'cert.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText('Subir foto', { selector: 'input' }), { target: { files: [png] } });
    expect(ultimo(onErroresChange)).toBe(3);
  });

  it('cuenta el error de la API al guardar', async () => {
    const onErroresChange = jest.fn();
    render(
      <FormularioCertificaciones
        certificaciones={[]}
        onAgregar={jest.fn().mockRejectedValue(new ApiError(500, 'Error interno'))}
        onErroresChange={onErroresChange}
      />,
    );
    llenarFormulario();
    fireEvent.click(screen.getByRole('button', { name: /agregar certificación/i }));

    await screen.findByText(/No se pudo guardar la certificación/);
    expect(ultimo(onErroresChange)).toBe(1);
  });
});

describe('FormularioCertificaciones · respaldo PDF y cambiar respaldo (HU-18)', () => {
  function guardarCertificacion(onCambiarRespaldo = jest.fn().mockResolvedValue(undefined)) {
    render(
      <FormularioCertificaciones
        certificaciones={[]}
        onAgregar={jest.fn().mockResolvedValue(undefined)}
        onCambiarRespaldo={onCambiarRespaldo}
      />,
    );
    llenarFormulario();
    fireEvent.click(screen.getByRole('button', { name: /agregar certificación/i }));
    return onCambiarRespaldo;
  }

  it('acepta un PDF como respaldo y lo muestra sin miniatura (T18.2)', () => {
    render(<FormularioCertificaciones certificaciones={[]} onAgregar={jest.fn()} />);
    const pdf = new File(['%PDF-1.4'], 'titulo.pdf', { type: 'application/pdf' });

    fireEvent.change(screen.getByLabelText('Subir documento', { selector: 'input' }), { target: { files: [pdf] } });

    expect(screen.getByText('titulo.pdf')).toBeInTheDocument();
    expect(screen.queryByAltText('Vista previa del respaldo')).not.toBeInTheDocument();
    expect(screen.queryByText('Solo se aceptan archivos PDF o JPG de hasta 5 MB')).not.toBeInTheDocument();
  });

  it('no muestra «Cambiar respaldo» antes de guardar (T18.1)', () => {
    render(<FormularioCertificaciones certificaciones={[]} onAgregar={jest.fn()} onCambiarRespaldo={jest.fn()} />);
    expect(screen.queryByRole('button', { name: 'Cambiar respaldo' })).not.toBeInTheDocument();
  });

  it('junto a «Certificación guardada» cambia el respaldo y avisa «Respaldo actualizado» (T18.1)', async () => {
    const onCambiarRespaldo = guardarCertificacion();
    expect(await screen.findByText('Certificación guardada')).toBeInTheDocument();
    const pdf = new File(['%PDF-1.4'], 'nuevo.pdf', { type: 'application/pdf' });

    fireEvent.change(screen.getByLabelText('Cambiar respaldo', { selector: 'input' }), { target: { files: [pdf] } });

    expect(await screen.findByText('Respaldo actualizado')).toBeInTheDocument();
    expect(onCambiarRespaldo).toHaveBeenCalledTimes(1);
    expect(onCambiarRespaldo).toHaveBeenCalledWith(pdf);
  });

  it('rechaza un archivo inválido al cambiar el respaldo y no lo sube (T18.1)', async () => {
    const onCambiarRespaldo = guardarCertificacion();
    await screen.findByText('Certificación guardada');
    const png = new File(['x'], 'foto.png', { type: 'image/png' });

    fireEvent.change(screen.getByLabelText('Cambiar respaldo', { selector: 'input' }), { target: { files: [png] } });

    expect(screen.getByText('Solo se aceptan archivos PDF o JPG de hasta 5 MB')).toBeInTheDocument();
    expect(onCambiarRespaldo).not.toHaveBeenCalled();
  });

  it('si la subida falla muestra el error y no «Respaldo actualizado» (T18.1)', async () => {
    guardarCertificacion(jest.fn().mockRejectedValue(new ApiError(400, 'Archivo inválido')));
    await screen.findByText('Certificación guardada');
    const jpg = new File(['x'], 'nuevo.jpg', { type: 'image/jpeg' });

    fireEvent.change(screen.getByLabelText('Cambiar respaldo', { selector: 'input' }), { target: { files: [jpg] } });

    expect(await screen.findByText('No se pudo cambiar el respaldo. Archivo inválido')).toBeInTheDocument();
    expect(screen.queryByText('Respaldo actualizado')).not.toBeInTheDocument();
  });
});

describe('FormularioCertificaciones · celular (HU-18, T18.6)', () => {
  it('«Cambiar respaldo» ocupa todo el ancho en celular y vuelve a su tamaño en escritorio', async () => {
    render(
      <FormularioCertificaciones
        certificaciones={[]}
        onAgregar={jest.fn().mockResolvedValue(undefined)}
        onCambiarRespaldo={jest.fn()}
      />,
    );
    llenarFormulario();
    fireEvent.click(screen.getByRole('button', { name: /agregar certificación/i }));

    const boton = await screen.findByRole('button', { name: 'Cambiar respaldo' });
    expect(boton).toHaveClass('w-full', 'md:w-auto');
  });
});
