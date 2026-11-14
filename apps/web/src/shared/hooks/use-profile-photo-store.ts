import { create } from 'zustand';

import { loadProfilePhoto, saveProfilePhoto } from '@/shared/services/profile-photo-service';

// Estado compartido de la foto de perfil: Mis registros la guarda y
// el encabezado y el menú la leen (T16.4) sin recargar la página
type ProfilePhotoState = {
  photoUrl: string | null;
  status: 'idle' | 'loading' | 'ready';
  loadPhoto: () => Promise<void>;
  savePhoto: (photo: Blob) => Promise<void>;
};

export const useProfilePhotoStore = create<ProfilePhotoState>((set, get) => ({
  photoUrl: null,
  status: 'idle',

  async loadPhoto() {
    // Se carga una sola vez aunque varios componentes la pidan
    if (get().status !== 'idle') return;
    set({ status: 'loading' });
    try {
      const photo = await loadProfilePhoto();
      // Si mientras tanto se guardó una foto nueva, se conserva la nueva
      if (get().status !== 'loading') return;
      set({ photoUrl: photo ? URL.createObjectURL(photo) : null, status: 'ready' });
    } catch {
      if (get().status === 'loading') set({ status: 'ready' });
    }
  },

  async savePhoto(photo) {
    await saveProfilePhoto(photo);
    const previousUrl = get().photoUrl;
    set({ photoUrl: URL.createObjectURL(photo), status: 'ready' });
    if (previousUrl) URL.revokeObjectURL(previousUrl);
  },
}));