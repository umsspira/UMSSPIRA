import { activeSection, directHref, navigationFor, NAVBAR_ACCOUNT_LINKS, primaryNavigation, visibleLinks } from './navigation';

const destinations = (role: Parameters<typeof navigationFor>[0]) => navigationFor(role).flatMap(section => section.items.map(item => item.href)).filter(Boolean);

it('no muestra el catálogo en el menú de eventos y reserva la gestión para administradores', () => {
  expect(destinations(null)).not.toContain('/events/catalog');
  expect(destinations(null)).not.toContain('/events/create');
  expect(destinations('titulado')).toContain('/portal/eventos');
  expect(destinations('titulado')).not.toContain('/events');
  expect(destinations('administrador')).toContain('/events');
  expect(destinations('administrador')).toContain('/events/create');
  expect(destinations('administrador')).toContain('/events/drafts');
  expect(destinations('administrador')).not.toContain('/events/catalog');
  expect(destinations('administrador')).not.toContain('/portal/eventos');
  expect(destinations(null)).not.toContain('/empresa/vacantes/publicar');
});

it('separa los accesos personales del titulado y los empresariales', () => {
  expect(destinations('titulado')).toContain('/mentorship/profile');
  expect(destinations('titulado')).toContain('/my-applications');
  expect(destinations('titulado')).not.toContain('/companies');
  expect(destinations('empresa')).toContain('/empresa/vacantes/publicar');
  expect(destinations('empresa')).not.toContain('/my-applications');
  expect(destinations('empresa')).not.toContain('/mentorship/profile');
});

it('incorpora reportes y solicitudes a la cuenta de administrador', () => {
  expect(visibleLinks(NAVBAR_ACCOUNT_LINKS, 'administrador').map(item => item.href)).toEqual(expect.arrayContaining(['/reports', '/applications']));
  expect(visibleLinks(NAVBAR_ACCOUNT_LINKS, 'titulado').map(item => item.href)).not.toContain('/reports');
});

it('activa el módulo por la ruta más específica, incluidos los registros dinámicos', () => {
  expect(activeSection('/events/drafts/draft-123')).toBe('events');
  expect(activeSection('/profile/certifications/cert-1/edit')).toBe('directory');
  expect(activeSection('/portal/empleos')).toBe('jobs');
});


it('HU-004/T4.1: muestra reportes al administrador y reserva encuestas para titulado', () => {
  const adminLinks = visibleLinks(NAVBAR_ACCOUNT_LINKS, 'administrador');
  expect(adminLinks).toEqual(expect.arrayContaining([
    expect.objectContaining({ label: 'Reportes Institucionales', href: '/reports' }),
    expect.objectContaining({ id: 'employment-survey-admin', label: 'Encuestas de Empleabilidad', href: '/reports/encuestas' }),
  ]));
  expect(adminLinks.map(link => link.id)).not.toContain('employment-surveys');
  expect(adminLinks.map(link => link.href)).not.toContain('/surveys');

  const graduateLinks = visibleLinks(NAVBAR_ACCOUNT_LINKS, 'titulado');
  expect(graduateLinks.map(link => link.href)).not.toContain('/reports');
  expect(graduateLinks.map(link => link.href)).not.toContain('/reports/encuestas');
  expect(graduateLinks).toEqual(expect.arrayContaining([
    expect.objectContaining({ id: 'employment-surveys', href: '/surveys' }),
  ]));
  expect(graduateLinks.find(link => link.id === 'employment-surveys')?.pending).toBeUndefined();

  for (const role of ['empresa', null] as const) {
    const links = visibleLinks(NAVBAR_ACCOUNT_LINKS, role).map(link => link.id);
    expect(links).not.toContain('reports');
    expect(links).not.toContain('employment-survey-admin');
    expect(links).not.toContain('employment-surveys');
  }
});

describe('HU15 · una sola lista para escritorio y móvil', () => {
  it('CA-01: Inicio va primero y le siguen las secciones del rol, en el mismo orden', () => {
    for (const role of [null, 'titulado', 'empresa', 'administrador'] as const) {
      const home = role ? '/portal' : '/portal/institucional';
      const items = primaryNavigation(role, home);
      expect(items[0]).toEqual({ id: 'home', label: 'Inicio', href: home, items: [] });
      expect(items.slice(1).map(item => item.id)).toEqual(navigationFor(role).map(section => section.id));
    }
  });

  it('CA-01: las reglas de sesión se aplican igual: el visitante no ve opciones de miembro', () => {
    const guest = primaryNavigation(null, '/portal/institucional');
    expect(guest.flatMap(item => item.items.map(link => link.href))).not.toContain('/profile');
    expect(guest.map(item => item.label)).not.toContain('Directorio');
    expect(primaryNavigation('titulado', '/portal').map(item => item.label)).toContain('Directorio');
  });

  it('CA-03: los accesos directos salen de directHref, sin lista aparte', () => {
    for (const item of primaryNavigation('titulado', '/portal').slice(1)) {
      expect(item.href).toBe(directHref(item.id, 'titulado') ?? undefined);
    }
  });
  it('oculta Comunidad a usuarios registrados y conserva Beneficios para visitantes', () => {
    for (const role of ['titulado', 'empresa', 'administrador'] as const) {
      const items = primaryNavigation(role, '/portal');
      expect(items.map(item => item.id)).not.toContain('community');
      expect(items.map(item => item.id)).toContain('benefits');
      expect(destinations(role)).toContain('/portal/beneficios');
    }

    expect(primaryNavigation(null, '/portal/institucional').map(item => item.id)).toContain('community');
  });
});