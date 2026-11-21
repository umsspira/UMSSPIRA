import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

import { useProfilePhotoStore } from '@/shared/hooks/use-profile-photo-store';

import { ProfilePhotoBadge, ProfilePhotoContent } from './profile-photo-avatar';

describe('ProfilePhotoContent', () => {
  beforeEach(() => {
    useProfilePhotoStore.setState({ photoUrl: null, status: 'ready' });
  });


  it('sin foto conserva el contenido de respaldo (las iniciales)', () => {
    render(<span><ProfilePhotoContent fallback="FL" /></span>);
    expect(screen.getByText('FL')).toBeInTheDocument();
    expect(document.querySelector('img')).not.toBeInTheDocument();
  });

  it('con una foto guardada conserva las iniciales y no muestra la foto', () => {
    useProfilePhotoStore.setState({ photoUrl: 'blob:foto', status: 'ready' });
    render(<span><ProfilePhotoContent fallback="FL" /></span>);
    expect(screen.getByText('FL')).toBeInTheDocument();
    expect(document.querySelector('img')).not.toBeInTheDocument();
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

  it('no dibuja el badge aunque haya una foto guardada', () => {
    useProfilePhotoStore.setState({ photoUrl: 'blob:foto', status: 'ready' });
    render(<ProfilePhotoBadge />);
    expect(screen.queryByTestId('profile-photo-badge')).not.toBeInTheDocument();
  });
});