import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

import { ProfilePhotoBadge, ProfilePhotoContent } from './profile-photo-avatar';

// HU-6.20 (G1): el perfil muestra iniciales en lugar de la foto
describe('ProfilePhotoContent', () => {
  it('muestra las iniciales y nunca una foto', () => {
    render(<span><ProfilePhotoContent fallback="FL" /></span>);
    expect(screen.getByText('FL')).toBeInTheDocument();
    expect(document.querySelector('img')).not.toBeInTheDocument();
  });
});

describe('ProfilePhotoBadge', () => {
  it('no dibuja el badge de foto', () => {
    render(<ProfilePhotoBadge />);
    expect(screen.queryByTestId('profile-photo-badge')).not.toBeInTheDocument();
  });
});
