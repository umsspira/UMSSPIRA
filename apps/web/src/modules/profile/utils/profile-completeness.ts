import type { ProfileRecords, ProjectRecord } from '@/modules/profile/types/profile-record';

// Mismos nombres que las secciones de Completar perfil; también es el valor de ?seccion= (T6.6)
export type CompletenessSectionId =
  | 'formacion-academica'
  | 'experiencia-laboral'
  | 'certificaciones'
  | 'descripcion-profesional'
  | 'proyectos-portafolio';

const SECTION_IDS: readonly CompletenessSectionId[] = [
  'formacion-academica',
  'experiencia-laboral',
  'certificaciones',
  'descripcion-profesional',
  'proyectos-portafolio',
];

// ?seccion= llega por URL: solo se acepta una de las 5 secciones
export function seccionDeUrl(valor: string | undefined): CompletenessSectionId | undefined {
  return SECTION_IDS.find((id) => id === valor);
}

// Acceso directo al formulario de la sección faltante; al terminar, «Volver» regresa al resumen (T6.6)
export function completarSeccionHref(id: CompletenessSectionId): string {
  return `/profile/completar?${new URLSearchParams({ seccion: id, returnTo: '/profile' })}`;
}

export type CompletenessSection = {
  id: CompletenessSectionId;
  label: string;
  complete: boolean;
};

export type ProfileCompleteness = {
  // 0 a 100; cada una de las 5 secciones vale lo mismo
  percentage: number;
  sections: CompletenessSection[];
  missing: CompletenessSection[];
};

// Perfil vacío (HU-12): sin formación, experiencia ni certificaciones, sin descripción profesional
// y sin proyectos (HU-19, T19.6)
export function isProfileEmpty(
  records: ProfileRecords,
  description: string,
  projects: readonly ProjectRecord[] = [],
): boolean {
  return (
    records.education.length === 0 &&
    records.experience.length === 0 &&
    records.certification.length === 0 &&
    description.trim().length === 0 &&
    projects.length === 0
  );
}

// Completitud del perfil (HU-06, HU-19 T19.6): Formación, Experiencia, Certificaciones y Proyectos
// cuentan con al menos un registro; la descripción, si tiene texto. Cada sección vale 20%
export function profileCompleteness(
  records: ProfileRecords,
  description: string,
  projects: readonly ProjectRecord[] = [],
): ProfileCompleteness {
  const sections: CompletenessSection[] = [
    { id: 'formacion-academica', label: 'Formación', complete: records.education.length > 0 },
    { id: 'experiencia-laboral', label: 'Experiencia', complete: records.experience.length > 0 },
    { id: 'certificaciones', label: 'Certificaciones', complete: records.certification.length > 0 },
    { id: 'descripcion-profesional', label: 'Descripción', complete: description.trim().length > 0 },
    { id: 'proyectos-portafolio', label: 'Proyectos', complete: projects.length > 0 },
  ];
  const completas = sections.filter((section) => section.complete).length;
  return {
    percentage: Math.round((completas / sections.length) * 100),
    sections,
    missing: sections.filter((section) => !section.complete),
  };
}
