import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

import { ProfilePhotoSection } from '@/modules/profile/components/profile-photo-section';

describe('ProfilePhotoSection', () => {
  it('muestra las iniciales y no ofrece controles para cargar una foto', () => {
    const { container } = render(<ProfilePhotoSection name="Francisco Lazarte" />);

    expect(screen.getByRole('heading', { name: 'Avatar de perfil' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Avatar de Francisco Lazarte' })).toHaveTextContent('FL');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(container.querySelector('input[type="file"]')).not.toBeInTheDocument();
  });

});