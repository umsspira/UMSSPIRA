import { create } from 'zustand';

import { loadProfilePhoto, saveProfilePhoto } from '@/shared/services/profile-photo-service';

// Estado compartido de la foto de perfil: Mis registros la guarda y
// el encabezado y el menú la leen (T16.4) sin recargar la página
type ProfilePhotoState = {
  photoUrl: string | null;
  status: 'idle' | 'loading' | 'ready';
  // Nombre del titulado (GET /perfil): con él todas las iniciales del avatar salen iguales
  // en la barra superior y en Mis registros (antes una usaba el correo y la otra el nombre)
  displayName: string | null;
  setDisplayName: (name: string) => void;
  nameStatus: 'idle' | 'loading' | 'ready';
  loadDisplayName: () => Promise<void>;
  loadPhoto: () => Promise<void>;
  savePhoto: (photo: Blob) => Promise<void>;
};

export const useProfilePhotoStore = create<ProfilePhotoState>((set, get) => ({
  photoUrl: null,
  status: 'idle',
  displayName: null,
  nameStatus: 'idle',

  async loadDisplayName() {
    // Una sola vez aunque varios avatares lo pidan; si Mi perfil ya lo trajo, no se vuelve a pedir
    if (get().nameStatus !== 'idle' || get().displayName) return;
    set({ nameStatus: 'loading' });
    try {
      const { obtenerResumenPerfil } = await import('@/modules/profile/services/perfil-api');
      const perfil = await obtenerResumenPerfil();
      get().setDisplayName(perfil.header.name);
    } catch {
      // Sin nombre se siguen mostrando las iniciales de la sesión
    } finally {
      set({ nameStatus: 'ready' });
    }
  },

  setDisplayName(name) {
    const trimmed = name.trim();
    if (trimmed && trimmed !== get().displayName) set({ displayName: trimmed });
  },

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