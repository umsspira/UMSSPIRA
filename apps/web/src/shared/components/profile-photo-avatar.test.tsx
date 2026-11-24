import '@testing-library/jest-dom';
import { act, render, screen } from '@testing-library/react';

import { useProfilePhotoStore } from '@/shared/hooks/use-profile-photo-store';

import { ProfilePhotoBadge, ProfilePhotoContent } from './profile-photo-avatar';

jest.mock('@/shared/services/profile-photo-service', () => ({
  loadProfilePhoto: jest.fn().mockResolvedValue(null),
  saveProfilePhoto: jest.fn(),
}));

describe('ProfilePhotoContent', () => {
  beforeEach(() => {
    useProfilePhotoStore.setState({ photoUrl: null, status: 'ready' });
  });

  it('sin foto conserva el contenido de respaldo (las iniciales)', () => {
    render(<span><ProfilePhotoContent fallback="FL" /></span>);
    expect(screen.getByText('FL')).toBeInTheDocument();
    expect(document.querySelector('img')).not.toBeInTheDocument();
  });

  it('con foto la muestra en lugar de las iniciales', () => {
    useProfilePhotoStore.setState({ photoUrl: 'blob:foto', status: 'ready' });
    render(<span><ProfilePhotoContent fallback="FL" /></span>);
    expect(document.querySelector('img')).toHaveAttribute('src', 'blob:foto');
    expect(screen.queryByText('FL')).not.toBeInTheDocument();
  });

  it('se actualiza al instante cuando se guarda una foto nueva', () => {
    render(<span><ProfilePhotoContent fallback="FL" /></span>);
    expect(screen.getByText('FL')).toBeInTheDocument();
    // Simula que Mis registros guardó una foto: el avatar cambia sin volver a montarse
    act(() => {
      useProfilePhotoStore.setState({ photoUrl: 'blob:nueva' });
    });
    expect(document.querySelector('img')).toHaveAttribute('src', 'blob:nueva');
  });
});

describe('ProfilePhotoBadge', () => {
  beforeEach(() => {
    useProfilePhotoStore.setState({ photoUrl: null, status: 'ready' });
  });

  it('sin foto no dibuja nada', () => {
    render(<ProfilePhotoBadge />);
    expect(screen.queryByTestId('profile-photo-badge')).not.toBeInTheDocument();
  });

  it('con foto dibuja el círculo con la foto', () => {
    useProfilePhotoStore.setState({ photoUrl: 'blob:foto', status: 'ready' });
    render(<ProfilePhotoBadge />);
    expect(screen.getByTestId('profile-photo-badge').querySelector('img')).toHaveAttribute('src', 'blob:foto');
  });
});