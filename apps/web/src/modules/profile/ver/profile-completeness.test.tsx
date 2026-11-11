import '@testing-library/jest-dom';
import { render, screen, within } from '@testing-library/react';

import { PROFILE_RECORDS_MOCK } from '@/modules/profile/testing/profile-fixtures';
import { profileCompleteness } from '@/modules/profile/utils/profile-completeness';

import ProfileCompleteness from './profile-completeness';

describe('ProfileCompleteness (T6.5)', () => {
  it('muestra el porcentaje y las secciones que faltan', () => {
    const records = { ...PROFILE_RECORDS_MOCK, certification: [] };
    render(<ProfileCompleteness completeness={profileCompleteness(records, '')} />);

    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Completitud del perfil' })).toHaveAttribute('aria-valuenow', '50');
    const faltantes = within(screen.getByRole('list', { name: 'Secciones faltantes' })).getAllByRole('listitem');
    expect(faltantes.map((item) => item.textContent)).toEqual(['Certificaciones', 'Descripción']);
  });

  it('avisa cuando el perfil está completo', () => {
    render(<ProfileCompleteness completeness={profileCompleteness(PROFILE_RECORDS_MOCK, 'Analista')} />);

    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText('Tu perfil está completo')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Secciones faltantes' })).not.toBeInTheDocument();
  });
});

describe('Accesos directos a las secciones faltantes (T6.6)', () => {
  it('cada sección faltante lleva a su formulario con returnTo=/profile', () => {
    const records = { ...PROFILE_RECORDS_MOCK, certification: [] };
    render(<ProfileCompleteness completeness={profileCompleteness(records, '')} />);

    expect(screen.getByRole('link', { name: 'Completar Certificaciones' })).toHaveAttribute(
      'href',
      '/profile/completar?seccion=certificaciones&returnTo=%2Fprofile',
    );
    expect(screen.getByRole('link', { name: 'Completar Descripción' })).toHaveAttribute(
      'href',
      '/profile/completar?seccion=descripcion-profesional&returnTo=%2Fprofile',
    );
    expect(screen.queryByRole('link', { name: 'Completar Formación' })).not.toBeInTheDocument();
  });
});
describe('Completitud resaltada (HU-21, CA-05)', () => {
  it('si el perfil no está al 100 % resalta la tarjeta con «Te falta completar» y los accesos', () => {
    const records = { ...PROFILE_RECORDS_MOCK, certification: [] };
    render(<ProfileCompleteness completeness={profileCompleteness(records, '')} />);

    const tarjeta = screen.getByRole('region', { name: 'Completitud del perfil' });
    expect(tarjeta).toHaveAttribute('data-incomplete', 'true');
    expect(tarjeta).toHaveClass('border-burning-flame');
    expect(screen.getByRole('note')).toHaveTextContent('Te falta completar');
    expect(screen.getByRole('link', { name: 'Completar Certificaciones' })).toBeInTheDocument();
  });

  it('al 100 % la tarjeta no se resalta ni muestra el aviso', () => {
    render(<ProfileCompleteness completeness={profileCompleteness(PROFILE_RECORDS_MOCK, 'Analista')} />);

    const tarjeta = screen.getByRole('region', { name: 'Completitud del perfil' });
    expect(tarjeta).not.toHaveAttribute('data-incomplete');
    expect(screen.queryByText('Te falta completar')).not.toBeInTheDocument();
  });
});
