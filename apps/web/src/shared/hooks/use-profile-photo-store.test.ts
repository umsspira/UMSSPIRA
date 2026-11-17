import { loadProfilePhoto, saveProfilePhoto } from '@/shared/services/profile-photo-service';

import { useProfilePhotoStore } from './use-profile-photo-store';

jest.mock('@/shared/services/profile-photo-service', () => ({
  loadProfilePhoto: jest.fn(),
  saveProfilePhoto: jest.fn(),
}));

const loadMock = loadProfilePhoto as jest.MockedFunction<typeof loadProfilePhoto>;
const saveMock = saveProfilePhoto as jest.MockedFunction<typeof saveProfilePhoto>;

describe('useProfilePhotoStore', () => {
  // jsdom no trae createObjectURL ni revokeObjectURL
  const createObjectURL = jest.fn();
  const revokeObjectURL = jest.fn();

  beforeEach(() => {
    loadMock.mockReset();
    saveMock.mockReset();
    createObjectURL.mockReset();
    revokeObjectURL.mockReset();
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;
    useProfilePhotoStore.setState({ photoUrl: null, status: 'idle' });
  });

  it('carga la foto guardada al volver a la página', async () => {
    loadMock.mockResolvedValue(new Blob(['x'], { type: 'image/jpeg' }));
    createObjectURL.mockReturnValue('blob:guardada');
    await useProfilePhotoStore.getState().loadPhoto();
    expect(useProfilePhotoStore.getState().photoUrl).toBe('blob:guardada');
  });

  it('sin foto guardada deja la foto vacía para mostrar el avatar', async () => {
    loadMock.mockResolvedValue(null);
    await useProfilePhotoStore.getState().loadPhoto();
    expect(useProfilePhotoStore.getState()).toMatchObject({ photoUrl: null, status: 'ready' });
  });

  it('carga la foto una sola vez', async () => {
    loadMock.mockResolvedValue(null);
    await useProfilePhotoStore.getState().loadPhoto();
    await useProfilePhotoStore.getState().loadPhoto();
    expect(loadMock).toHaveBeenCalledTimes(1);
  });

  it('al guardar actualiza la foto al instante y libera la anterior', async () => {
    useProfilePhotoStore.setState({ photoUrl: 'blob:anterior', status: 'ready' });
    saveMock.mockResolvedValue(undefined);
    createObjectURL.mockReturnValue('blob:nueva');
    const photo = new Blob(['x'], { type: 'image/jpeg' });
    await useProfilePhotoStore.getState().savePhoto(photo);
    expect(saveMock).toHaveBeenCalledWith(photo);
    expect(useProfilePhotoStore.getState().photoUrl).toBe('blob:nueva');
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:anterior');
  });

  it('si falla el guardado conserva la foto anterior', async () => {
    useProfilePhotoStore.setState({ photoUrl: 'blob:anterior', status: 'ready' });
    saveMock.mockRejectedValue(new Error('sin espacio'));
    await expect(useProfilePhotoStore.getState().savePhoto(new Blob(['x']))).rejects.toThrow();
    expect(useProfilePhotoStore.getState().photoUrl).toBe('blob:anterior');
  });
});