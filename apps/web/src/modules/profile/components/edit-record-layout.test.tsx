import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';

import { BackupField } from './edit-record-layout';

function jpg(nombre: string, bytes = 1024) {
  return new File([new Uint8Array(bytes)], nombre, { type: 'image/jpeg' });
}

function renderBackup(onDocumentChange = jest.fn()) {
  const { container } = render(
    <BackupField documentName="" isVerified={false} onDocumentChange={onDocumentChange} />,
  );
  const inputs = Array.from(container.querySelectorAll<HTMLInputElement>('input[type="file"]'));
  return { inputs, onDocumentChange };
}

describe('BackupField · validación del respaldo al editar', () => {
  it('rechaza un archivo que no es PDF ni JPG y no lo adjunta', () => {
    const { inputs, onDocumentChange } = renderBackup();

    fireEvent.change(inputs[0], { target: { files: [new File(['x'], 'respaldo.png', { type: 'image/png' })] } });

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(onDocumentChange).not.toHaveBeenCalled();
  });

  it('rechaza un JPG de más de 5 MB y no lo adjunta', () => {
    const { inputs, onDocumentChange } = renderBackup();

    fireEvent.change(inputs[0], { target: { files: [jpg('grande.jpg', 5 * 1024 * 1024 + 1)] } });

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(onDocumentChange).not.toHaveBeenCalled();
  });

  it('acepta un JPG válido, avisa y quita el error anterior', () => {
    const { inputs, onDocumentChange } = renderBackup();

    fireEvent.change(inputs[0], { target: { files: [new File(['x'], 'malo.png', { type: 'image/png' })] } });
    expect(screen.getByRole('alert')).toBeInTheDocument();

    fireEvent.change(inputs[0], { target: { files: [jpg('bueno.jpg')] } });

    expect(onDocumentChange).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('acepta un PDF de hasta 5 MB en ambos botones (HU-18)', () => {
    const { inputs, onDocumentChange } = renderBackup();
    const pdf = new File([new Uint8Array(5 * 1024 * 1024)], 'titulo.pdf', { type: 'application/pdf' });

    for (const input of inputs) {
      expect(input).toHaveAttribute('accept', 'application/pdf,image/jpeg');
      fireEvent.change(input, { target: { files: [pdf] } });
    }

    expect(onDocumentChange).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('PDF o JPG, máximo 5 MB')).toBeInTheDocument();
  });

  it('rechaza un PDF de más de 5 MB (HU-18)', () => {
    const { inputs, onDocumentChange } = renderBackup();
    const pdf = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'grande.pdf', { type: 'application/pdf' });

    fireEvent.change(inputs[1], { target: { files: [pdf] } });

    expect(screen.getByRole('alert')).toHaveTextContent('Solo se aceptan archivos PDF o JPG de hasta 5 MB');
    expect(onDocumentChange).not.toHaveBeenCalled();
  });
});
