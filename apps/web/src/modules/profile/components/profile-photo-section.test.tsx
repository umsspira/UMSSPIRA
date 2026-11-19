import '@testing-library/jest-dom';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { ProfilePhotoSection } from '@/modules/profile/components/profile-photo-section';
import { useProfilePhotoStore } from '@/shared/hooks/use-profile-photo-store';
import { loadProfilePhoto, saveProfilePhoto } from '@/shared/services/profile-photo-service';

jest.mock('@/shared/services/profile-photo-service', () => ({
  loadProfilePhoto: jest.fn(),
  saveProfilePhoto: jest.fn(),
}));

const loadMock = loadProfilePhoto as jest.MockedFunction<typeof loadProfilePhoto>;
const saveMock = saveProfilePhoto as jest.MockedFunction<typeof saveProfilePhoto>;

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

async function renderSection() {
  const view = render(<ProfilePhotoSection name="Francisco Lazarte" />);
  // Espera a que termine la carga de la foto guardada
  await waitFor(() => expect(useProfilePhotoStore.getState().status).toBe('ready'));
  return view;
}

describe('ProfilePhotoSection', () => {
  // jsdom no trae createObjectURL ni revokeObjectURL
  const createObjectURL = jest.fn();
  const revokeObjectURL = jest.fn();

  beforeEach(() => {
    loadMock.mockReset();
    saveMock.mockReset();
    loadMock.mockResolvedValue(null);
    createObjectURL.mockReset();
    createObjectURL.mockReturnValue('blob:vista-previa');
    revokeObjectURL.mockReset();
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;
    useProfilePhotoStore.setState({ photoUrl: null, status: 'idle' });
  });

  it('T16.1: sin foto muestra el avatar con iniciales y el botón para elegir archivo', async () => {
    await renderSection();
    expect(screen.getByRole('heading', { name: 'Foto de perfil' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Avatar con iniciales' })).toHaveTextContent('FL');
    expect(screen.getByRole('button', { name: 'Elegir archivo' })).toBeInTheDocument();
  });

  it('T16.1: con foto guardada muestra la foto actual', async () => {
    useProfilePhotoStore.setState({ photoUrl: '/foto.jpg', status: 'ready' });
    render(<ProfilePhotoSection name="Francisco Lazarte" />);
    expect(screen.getByRole('img', { name: 'Foto de perfil actual' })).toHaveAttribute('src', '/foto.jpg');
  });

  it('T16.2: al elegir un JPG muestra la vista previa', async () => {
    await renderSection();
    chooseFile(createFile('image/jpeg', 1024));
    expect(screen.getByRole('img', { name: 'Vista previa de la foto de perfil' })).toHaveAttribute('src', 'blob:vista-previa');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('T16.2: rechaza un archivo que no es JPG con el mensaje junto al campo', async () => {
    await renderSection();
    chooseFile(createFile('image/png', 1024));
    expect(screen.getByRole('alert')).toHaveTextContent('Solo JPG, máximo 5 MB');
    expect(screen.queryByRole('img', { name: 'Vista previa de la foto de perfil' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Guardar foto' })).not.toBeInTheDocument();
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it('T16.2: rechaza un JPG de más de 5 MB', async () => {
    await renderSection();
    chooseFile(createFile('image/jpeg', 5 * 1024 * 1024 + 1));
    expect(screen.getByRole('alert')).toHaveTextContent('Solo JPG, máximo 5 MB');
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it('T16.2: libera la vista previa anterior al elegir otra y al salir', async () => {
    const { unmount } = await renderSection();
    chooseFile(createFile('image/jpeg', 1024));
    createObjectURL.mockReturnValueOnce('blob:segunda');
    chooseFile(createFile('image/jpeg', 2048));
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:vista-previa');
    unmount();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:segunda');
  });

  it('T16.3: el botón Guardar foto solo aparece con un JPG válido elegido', async () => {
    await renderSection();
    expect(screen.queryByRole('button', { name: 'Guardar foto' })).not.toBeInTheDocument();
    chooseFile(createFile('image/jpeg', 1024));
    expect(screen.getByRole('button', { name: 'Guardar foto' })).toBeInTheDocument();
  });

  it('T16.3: Guardar foto guarda la imagen y muestra Foto actualizada', async () => {
    saveMock.mockResolvedValue(undefined);
    await renderSection();
    const file = createFile('image/jpeg', 1024);
    chooseFile(file);
    createObjectURL.mockReturnValueOnce('blob:guardada');
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Guardar foto' }));
    });
    expect(saveMock).toHaveBeenCalledWith(file);
    expect(screen.getByRole('status')).toHaveTextContent('Foto actualizada');
    expect(screen.getByRole('img', { name: 'Foto de perfil actual' })).toHaveAttribute('src', 'blob:guardada');
    expect(screen.queryByRole('button', { name: 'Guardar foto' })).not.toBeInTheDocument();
  });

  it('T16.3: si falla el guardado avisa y conserva la vista previa', async () => {
    saveMock.mockRejectedValue(new Error('sin espacio'));
    await renderSection();
    chooseFile(createFile('image/jpeg', 1024));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Guardar foto' }));
    });
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo guardar la foto. Intenta de nuevo.');
    expect(screen.queryByText('Foto actualizada')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar foto' })).toBeInTheDocument();
  });

  it('T16.3: al volver a la página muestra la foto guardada', async () => {
    loadMock.mockResolvedValue(new Blob(['x'], { type: 'image/jpeg' }));
    createObjectURL.mockReturnValue('blob:desde-el-navegador');
    render(<ProfilePhotoSection name="Francisco Lazarte" />);
    expect(await screen.findByRole('img', { name: 'Foto de perfil actual' })).toHaveAttribute('src', 'blob:desde-el-navegador');
  });
});