import type { NavbarLink, NavbarRole, NavbarSection } from './types';

export const NAVBAR_ROLE_LABEL: Record<NavbarRole, string> = {
  titulado: 'Titulado',
  administrador: 'Administrador',
  empresa: 'Empresa',
};

const members = ['titulado', 'administrador'] as const;
const employers = ['empresa', 'administrador'] as const;
const admins = ['administrador'] as const;
const signedIn = ['titulado', 'empresa', 'administrador'] as const;

export const NAVBAR_SECTIONS: NavbarSection[] = [
  { id: 'home', label: 'Inicio', items: [
    { id: 'inst-comunidad', label: 'Comunidad institucional', href: '/portal/institucional?tab=comunidad' },
    { id: 'inst-carreras', label: 'Carreras', href: '/portal/institucional?tab=carreras' },
    { id: 'institutional', label: 'Sobre nosotros', href: '/portal/institucional?tab=nosotros' },
    { id: 'portal', label: 'Portal de egresados', href: '/portal', roles: signedIn },
    { id: 'community', label: 'Comunidad de egresados', href: '/portal/comunidad', roles: signedIn },
    { id: 'benefits', label: 'Beneficios y convenios', href: '/portal/beneficios', roles: signedIn },
  ] },
  { id: 'directory', label: 'Directorio', items: [
    { id: 'graduate-directory', label: 'Directorio de egresados', href: '/portal/institucional?tab=directorio', roles: signedIn },
    { id: 'profile', label: 'Mi perfil profesional', href: '/profile', roles: members },
    { id: 'records', label: 'Mis registros', href: '/profile/records', roles: members },
    { id: 'complete-profile', label: 'Completar mi perfil', href: '/profile/completar', roles: members },
  ] },
  { id: 'jobs', label: 'Bolsa de trabajo', items: [
    { id: 'inst-empleos', label: 'Sobre la bolsa de trabajo', href: '/portal/institucional?tab=empleos' },
    { id: 'jobs', label: 'Oportunidades laborales', href: '/portal/empleos', roles: signedIn },
    { id: 'job-postings', label: 'Ofertas laborales actuales', href: '/job-postings', roles: signedIn },
    { id: 'company', label: 'Perfil de mi empresa', href: '/companies', roles: employers },
    { id: 'publish-job', label: 'Publicar una vacante', href: '/empresa/vacantes/publicar', roles: employers },
  ] },
  { id: 'mentorship', label: 'Mentorías', items: [
    { id: 'inst-mentorias', label: 'Sobre las mentorías', href: '/portal/institucional?tab=mentorias' },
    { id: 'mentorship', label: 'Red de mentorías', href: '/mentorship', roles: signedIn },
    { id: 'mentor-profile', label: 'Mi perfil de mentor', href: '/mentorship/profile', roles: members },
    { id: 'mentor-information', label: 'Información de mi perfil', href: '/mentorship/profile/information', roles: members },
    { id: 'mentor-areas', label: 'Áreas técnicas', href: '/mentorship/profile/areas', roles: members },
    { id: 'mentor-interests', label: 'Mis intereses', href: '/mentorship/profile/interests', roles: members },
    { id: 'mentor-availability', label: 'Mi disponibilidad', href: '/mentorship/profile/availability', roles: members },
    { id: 'mentor-requests', label: 'Solicitudes recibidas', href: '/mentorship/requests', roles: members },
    { id: 'mentor-request-new', label: 'Solicitar una mentoría', href: '/mentorship/requests/new', roles: members },
  ] },
  { id: 'events', label: 'Eventos', items: [
    { id: 'inst-eventos', label: 'Sobre los eventos', href: '/portal/institucional?tab=eventos' },
    { id: 'events-catalog', label: 'Calendario de eventos', href: '/portal/eventos', roles: signedIn },
    { id: 'admin-events', label: 'Gestión de eventos', href: '/events', roles: admins },
    { id: 'create-event', label: 'Crear evento', href: '/events/create', roles: admins },
    { id: 'draft-events', label: 'Borradores', href: '/events/drafts', roles: admins },
  ] },
];

export const NAVBAR_ACCOUNT_LINKS: NavbarLink[] = [
  { id: 'my-profile', label: 'Mi perfil profesional', href: '/profile', roles: members },
  { id: 'my-company', label: 'Perfil de Empresa', href: '/companies', roles: employers },
  { id: 'account-publish-job', label: 'Publicar Vacante', href: '/empresa/vacantes/publicar', roles: employers },
  { id: 'my-jobs', label: 'Mis Vacantes', pending: 'Próximamente', roles: employers },
  { id: 'applicants', label: 'Postulantes', href: '/empresa/postulantes', roles: employers },
  { id: 'applications', label: 'Solicitudes de registro', href: '/applications', roles: admins },
  { id: 'reports', label: 'Reportes Institucionales', href: '/reports', roles: admins },
  { id: 'employment-survey-admin', label: 'Encuestas de Empleabilidad', href: '/reports/encuestas', roles: admins },
  { id: 'employment-surveys', label: 'Encuestas', pending: 'Próximamente', roles: members },
];

export function visibleLinks(items: NavbarLink[], role: NavbarRole | null) {
  return items.filter(item => !item.roles || (role && item.roles.includes(role)));
}

export function navigationFor(role: NavbarRole | null): NavbarSection[] {
  return NAVBAR_SECTIONS
    .map(section => ({ ...section, items: visibleLinks(section.items, role) }))
    .filter(section => section.items.length > 0);
}

export function activeSection(path: string): string | null {
  const cleanPath = path.split('?')[0];
  const section = NAVBAR_SECTIONS.find(sec => {
    return sec.items.some(item => {
      if (!item.href) return false;
      const itemPath = item.href.split('?')[0];
      if (itemPath === cleanPath) return true;
      if (itemPath !== '/' && cleanPath.startsWith(itemPath)) return true;
      return false;
    });
  });
  return section ? section.id : null;
}