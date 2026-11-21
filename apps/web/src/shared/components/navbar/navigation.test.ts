
import { activeSection, directHref, navigationFor, NAVBAR_ACCOUNT_LINKS, primaryNavigation, visibleLinks } from './navigation';

const destinations = (role: Parameters<typeof navigationFor>[0]) => navigationFor(role).flatMap(section => section.items.map(item => item.href)).filter(Boolean);
const mentorshipItems = () => navigationFor('titulado', true).find(section => section.id === 'mentorship')!.items;

it('BUG-06-1601: separa "Mis solicitudes" de "Solicitudes recibidas" en el menú de Mentorías', () => {
  const items = mentorshipItems();
  expect(items).toEqual(expect.arrayContaining([
    expect.objectContaining({ label: 'Mis solicitudes', href: '/mentorship/requests' }),
    expect.objectContaining({ label: 'Solicitudes recibidas', href: '/mentorship/requests/received' }),
  ]));
  expect(items.find(item => item.label === 'Mis solicitudes')?.href)
    .not.toBe('/mentorship/requests/received');
});

it('BUG-06-1601: solo el destino de la vista actual queda marcado como activo', () => {
  expect(isCurrentDestination('/mentorship/requests', '/mentorship/requests')).toBe(true);
  expect(isCurrentDestination('/mentorship/requests/received', '/mentorship/requests')).toBe(false);
  expect(isCurrentDestination('/mentorship/requests', '/mentorship/requests/received')).toBe(false);
  expect(isCurrentDestination('/mentorship/requests?estado=PENDIENTE', '/mentorship/requests')).toBe(false);
  expect(isCurrentDestination('/portal/institucional?tab=comunidad', '/portal/institucional?tab=comunidad')).toBe(true);
  expect(isCurrentDestination('/portal/institucional?tab=carreras', '/portal/institucional?tab=comunidad')).toBe(false);
});

it('BUG-06-1604: usa la etiqueta "Explorar mentores" e iconos en los destinos de Mentorías', () => {
  expect(destinations('titulado')).toContain('/mentorship');
  expect(mentorshipItems().some(item => item.label === 'Red de mentorías')).toBe(false);
  expect(mentorshipItems().find(item => item.href === '/mentorship')?.label).toBe('Explorar mentores');
  const signedInItems = mentorshipItems().filter(item => item.href && !item.guestOnly);
  expect(signedInItems.length).toBeGreaterThan(0);
  expect(signedInItems.every(item => item.icon)).toBe(true);
});

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
  expect(destinations('titulado')).toContain('/mentorship/requests');
  expect(destinations('titulado')).toContain('/my-applications');
  expect(destinations('titulado')).not.toContain('/mentorship/profile');
  expect(destinations('titulado')).not.toContain('/companies');
  expect(destinations('empresa')).toContain('/empresa/vacantes/publicar');
  expect(destinations('empresa')).not.toContain('/my-applications');
  expect(destinations('empresa')).not.toContain('/mentorship/profile');
});

it('conserva todas las opciones de Mentorías y limita las de mentor a participación activa', () => {
  const linksFor = (activeMentor: boolean) => navigationFor('titulado', activeMentor)
    .find(section => section.id === 'mentorship')?.items ?? [];
  const generalLinks = linksFor(false);
  const mentorLinks = linksFor(true);

  expect(generalLinks.map(link => link.label)).toEqual([
    'Explorar mentores',
    'Mis solicitudes',
  ]);
  expect(generalLinks.find(link => link.label === 'Mis solicitudes')?.href)
    .toBe('/mentorship/requests');
  expect(mentorLinks.map(link => link.label)).toEqual([
    'Explorar mentores',
    'Mi perfil',
    'Información',
    'Áreas',
    'Intereses',
    'Disponibilidad',
    'Mis solicitudes',
    'Solicitudes recibidas',
  ]);
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
});


