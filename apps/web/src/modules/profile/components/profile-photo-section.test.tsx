import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';

import { ProfilePhotoSection } from '@/modules/profile/components/profile-photo-section';

function createFile(type: string, size: number): File {
  const file = new File(['x'], 'foto', { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

function chooseFile(file: File) {
  fireEvent.change(screen.getByLabelText('Foto de perfil', { selector: 'input' }), {
    target: { files: [file] },
  });
}

describe('ProfilePhotoSection', () => {
  // jsdom no trae createObjectURL ni revokeObjectURL
  const createObjectURL = jest.fn(() => 'blob:vista-previa');
  const revokeObjectURL = jest.fn();

  beforeEach(() => {
    createObjectURL.mockClear();
    revokeObjectURL.mockClear();
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;
  });

  it('T16.1: sin foto muestra el avatar con iniciales y el botón para elegir archivo', () => {
    render(<ProfilePhotoSection name="Francisco Lazarte" />);
    expect(screen.getByRole('heading', { name: 'Foto de perfil' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Avatar con iniciales' })).toHaveTextContent('FL');
    expect(screen.getByRole('button', { name: 'Elegir archivo' })).toBeInTheDocument();
  });

  it('T16.1: con foto guardada muestra la foto actual', () => {
    render(<ProfilePhotoSection name="Francisco Lazarte" currentPhotoUrl="/foto.jpg" />);
    expect(screen.getByRole('img', { name: 'Foto de perfil actual' })).toHaveAttribute('src', '/foto.jpg');
  });

  it('T16.2: al elegir un JPG muestra la vista previa', () => {
    render(<ProfilePhotoSection name="Francisco Lazarte" />);
    chooseFile(createFile('image/jpeg', 1024));
    expect(screen.getByRole('img', { name: 'Vista previa de la foto de perfil' })).toHaveAttribute('src', 'blob:vista-previa');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('T16.2: rechaza un archivo que no es JPG con el mensaje junto al campo', () => {
    render(<ProfilePhotoSection name="Francisco Lazarte" />);
    chooseFile(createFile('image/png', 1024));
    expect(screen.getByRole('alert')).toHaveTextContent('Solo JPG, máximo 5 MB');
    expect(screen.queryByRole('img', { name: 'Vista previa de la foto de perfil' })).not.toBeInTheDocument();
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it('T16.2: rechaza un JPG de más de 5 MB', () => {
    render(<ProfilePhotoSection name="Francisco Lazarte" />);
    chooseFile(createFile('image/jpeg', 5 * 1024 * 1024 + 1));
    expect(screen.getByRole('alert')).toHaveTextContent('Solo JPG, máximo 5 MB');
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it('T16.2: libera la vista previa anterior al elegir otra y al salir', () => {
    const { unmount } = render(<ProfilePhotoSection name="Francisco Lazarte" />);
    chooseFile(createFile('image/jpeg', 1024));
    createObjectURL.mockReturnValueOnce('blob:segunda');
    chooseFile(createFile('image/jpeg', 2048));
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:vista-previa');
    unmount();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:segunda');
  });
});