import {
  CalendarDays, ClipboardList, Compass, Inbox, Layers, Send, Sparkles, UserRound,
} from 'lucide-react';
import type { NavbarLink, NavbarRole, NavbarSection } from './types';

export const NAVBAR_ROLE_LABEL: Record<NavbarRole, string> = {
  titulado: 'Titulado', empresa: 'Empresa', administrador: 'Administración',
};

const members = ['titulado', 'administrador'] as const;
const employers = ['empresa', 'administrador'] as const;
const admins = ['administrador'] as const;
const graduates = ['titulado'] as const;
// Visitantes (sin sesión) solo ven lo básico: el resto exige iniciar sesión.
const signedIn = ['titulado', 'empresa', 'administrador'] as const;

/** Agregar destinos aquí mantiene iguales los menús de escritorio y móvil. */
export const NAVBAR_SECTIONS: NavbarSection[] = [
  { id: 'community', label: 'Comunidad', items: [
    { id: 'inst-comunidad', label: 'Comunidad institucional', href: '/portal/institucional?tab=comunidad', guestOnly: true },
    { id: 'inst-carreras', label: 'Carreras', href: '/portal/institucional?tab=carreras', guestOnly: true },
    { id: 'institutional', label: 'Sobre nosotros', href: '/portal/institucional?tab=nosotros', guestOnly: true },
    { id: 'portal', label: 'Portal de egresados', href: '/portal', roles: signedIn },
    { id: 'community', label: 'Comunidad de egresados', href: '/portal/comunidad', roles: signedIn },
    { id: 'benefits', label: 'Beneficios y convenios', href: '/portal/beneficios', roles: signedIn },
  ] },
  { id: 'directory', label: 'Directorio', items: [
    { id: 'graduate-directory', label: 'Directorio de egresados', href: '/portal/institucional?tab=directorio', roles: signedIn, hidden: true },
    { id: 'profile', label: 'Mi perfil profesional', href: '/profile', roles: members },
    { id: 'records', label: 'Mis registros', href: '/profile/records', roles: members },
    { id: 'complete-profile', label: 'Completar mi perfil', href: '/profile/completar', roles: members },
    { id: 'affinity', label: 'Mi afinidad profesional', href: '/afinidad', roles: members },
  ] },
  { id: 'jobs', label: 'Bolsa de trabajo', items: [
    { id: 'inst-empleos', label: 'Sobre la bolsa de trabajo', href: '/portal/institucional?tab=empleos', guestOnly: true },
    { id: 'jobs', label: 'Oportunidades laborales', href: '/portal/empleos', roles: signedIn, hidden: true },
    { id: 'job-postings', label: 'Ofertas laborales actuales', href: '/job-postings', roles: signedIn },
    { id: 'my-applications', label: 'Mis postulaciones', href: '/my-applications', roles: graduates },
    { id: 'company', label: 'Perfil de mi empresa', href: '/companies', roles: employers },
    { id: 'publish-job', label: 'Publicar una vacante', href: '/empresa/vacantes/publicar', roles: employers },
  ] },
  { id: 'mentorship', label: 'Mentorías', items: [
    { id: 'inst-mentorias', label: 'Sobre las mentorías', href: '/portal/institucional?tab=mentorias', guestOnly: true },
    { id: 'mentorship', label: 'Explorar mentores', href: '/mentorship', roles: signedIn, icon: Compass },
    { id: 'mentor-profile', label: 'Mi perfil', href: '/mentorship/profile', roles: graduates, icon: UserRound, mentorOnly: true },
    { id: 'mentor-information', label: 'Información', href: '/mentorship/profile/information', roles: graduates, icon: ClipboardList, mentorOnly: true },
    { id: 'mentor-areas', label: 'Áreas', href: '/mentorship/profile/areas', roles: graduates, icon: Layers, mentorOnly: true },
    { id: 'mentor-interests', label: 'Intereses', href: '/mentorship/profile/interests', roles: graduates, icon: Sparkles, mentorOnly: true },
    { id: 'mentor-availability', label: 'Disponibilidad', href: '/mentorship/profile/availability', roles: graduates, icon: CalendarDays, mentorOnly: true },
    { id: 'mentor-my-requests', label: 'Mis solicitudes', href: '/mentorship/requests', roles: graduates, icon: Send },
    { id: 'mentor-requests', label: 'Solicitudes recibidas', href: '/mentorship/requests/received', roles: graduates, icon: Inbox, mentorOnly: true },
  ] },
  { id: 'events', label: 'Eventos', items: [
    { id: 'inst-events', label: 'Eventos institucionales', href: '/portal/institucional?tab=eventos', guestOnly: true },
    { id: 'catalog', label: 'Catálogo de eventos', href: '/portal/eventos', roles: graduates },
    { id: 'manage-events', label: 'Gestión de eventos', href: '/events', roles: admins },
    { id: 'create-event', label: 'Crear evento', href: '/events/create', roles: admins },
    { id: 'draft-events', label: 'Borradores', href: '/events/drafts', roles: admins },
  ] },
];

export const NAVBAR_ACCOUNT_LINKS: NavbarLink[] = [
  { id: 'my-profile', label: 'Mi perfil profesional', href: '/profile', roles: members },
  { id: 'my-applications', label: 'Mis postulaciones', href: '/my-applications', roles: graduates },
  { id: 'my-company', label: 'Perfil de Empresa', href: '/companies', roles: employers },
  { id: 'account-publish-job', label: 'Publicar Vacante', href: '/empresa/vacantes/publicar', roles: employers },
  
  // 👇 AQUÍ ESTÁ EL CAMBIO: Le pusimos el href y quitamos el 'Próximamente' 👇
  { id: 'my-jobs', label: 'Mis Vacantes', href: '/empresa/mis-vacantes', roles: employers },  
  { id: 'company-users', label: 'Gestión de usuarios', href: '/empresa/gestion_usuarios', roles: employers },

  // 👆 FIN DEL CAMBIO 👆

  { id: 'applicants', label: 'Postulantes', href: '/empresa/postulantes', roles: employers },
  { id: 'applications', label: 'Solicitudes de registro', href: '/applications', roles: admins },
  { id: 'company-registry', label: 'Registro de empresas', href: '/company-registry', roles: admins },
  { id: 'reports', label: 'Reportes Institucionales', href: '/reports', roles: admins },
  // HU-004 CA-04: el administrador consulta el área institucional de encuestas,
  // que NO es el formulario /surveys reservado para titulados.
  { id: 'employment-survey-admin', label: 'Encuestas de Empleabilidad', href: '/reports/encuestas', roles: admins },
  // HU-001/HU-002: formulario de la encuesta para el titulado.
  { id: 'employment-surveys', label: 'Encuesta de empleabilidad', href: '/surveys', roles: graduates },
  { id: 'admin-home', label: 'Panel administrativo', href: '/portal/admin', roles: admins },
];

export function visibleLinks(items: NavbarLink[], role: NavbarRole | null, activeMentor = false) {
  return items.filter(item => {
    if (item.guestOnly && role !== null) return false;
    if (item.mentorOnly && !activeMentor) return false;
    return !item.roles || (role !== null && item.roles.includes(role));
  });
}

export function navigationFor(role: NavbarRole | null, activeMentor = false): NavbarSection[] {
  return NAVBAR_SECTIONS
    .map(section => ({ ...section, items: visibleLinks(section.items, role, activeMentor).filter(item => !item.hidden) }))
    .filter(section => section.items.length > 0);
}

/**
 * Marca el destino exacto de la vista actual, incluida su query.
 */
export function isCurrentDestination(href: string, currentPath: string) {
  const [hrefPath, hrefQuery = ''] = href.split('?');
  const [currentHrefPath, currentQuery = ''] = currentPath.split('?');
  if (hrefPath !== currentHrefPath) return false;
  const expected = new URLSearchParams(hrefQuery);
  const current = new URLSearchParams(currentQuery);
  if (expected.size !== current.size) return false;
  return Array.from(expected).every(([key, value]) => current.get(key) === value);
}

/**
 * La coincidencia más específica evita activar Comunidad por todos sus /portal/*.
 * Los enlaces con query (?tab=...) solo coinciden si la query actual también los incluye,
 * y ganan sobre los enlaces sin query de la misma ruta.
 */
export function activeSection(path: string, search = ''): string | null {
  const current = new URLSearchParams(search);
  const matches = NAVBAR_SECTIONS.flatMap(section => section.items.flatMap(item => {
    if (!item.href) return [];
    const [hrefPath, hrefQuery = ''] = item.href.split('?');
    const wanted = Array.from(new URLSearchParams(hrefQuery));
    const samePath = path === hrefPath || (hrefPath !== '/portal' && path.startsWith(`${hrefPath}/`));
    const sameQuery = wanted.every(([key, value]) => current.get(key) === value);
    if (!samePath || !sameQuery) return [];
    return [{ section: section.id, score: hrefPath.length + wanted.length * 1000 }];
  }));
  return matches.sort((a, b) => b.score - a.score)[0]?.section ?? null;
}

/**
 * Con sesión iniciada, Comunidad, Eventos y Bolsa de trabajo (titulado) no despliegan opciones:
 * el botón lleva directo a su panel.
 */
export function directHref(sectionId: string, role: NavbarRole | null): string | null {
  if (role === null) return null;
  if (sectionId === 'community') return '/portal/comunidad';
  if (sectionId === 'events' && role === 'titulado') return '/portal/eventos';
  if (sectionId === 'jobs' && role === 'titulado') return '/job-postings';
  return null;
}

/** Una opción del menú principal: la misma para la barra de escritorio y para el menú móvil (HU15 CA-01/CA-03). */
export interface PrimaryNavItem {
  id: string;
  label: string;
  /** Si existe, la opción es un enlace directo; si no, despliega `items`. */
  href?: string;
  items: NavbarLink[];
}

/**
 * Única fuente de las opciones de navegación: Inicio + secciones según el rol.
 * La barra de escritorio y el menú móvil solo cambian la presentación, nunca la lista (HU15).
 */
export function primaryNavigation(role: NavbarRole | null, home: string): PrimaryNavItem[] {
  return [
    { id: 'home', label: 'Inicio', href: home, items: [] },
    ...navigationFor(role).map(section => ({
      id: section.id,
      label: section.label,
      href: directHref(section.id, role) ?? undefined,
      items: section.items,
    })),
  ];
}

