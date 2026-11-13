import { PROFILE_RECORDS_MOCK } from '@/modules/profile/testing/profile-fixtures';
import type { ProfileRecords } from '@/modules/profile/types/profile-record';

import { completarSeccionHref, isProfileEmpty, profileCompleteness, seccionDeUrl } from './profile-completeness';

const VACIO: ProfileRecords = { education: [], experience: [], certification: [], project: [] };

describe('profileCompleteness (T6.5)', () => {
  it('un perfil vacío está al 0% y le faltan las 5 secciones', () => {
    const completitud = profileCompleteness(VACIO, '');

    expect(completitud.percentage).toBe(0);
    expect(completitud.missing.map((seccion) => seccion.label)).toEqual([
      'Formación',
      'Experiencia',
      'Certificaciones',
      'Descripción',
      'Proyectos',
    ]);
  });

  it('cada sección vale 20% y la descripción solo cuenta con texto (HU-19, T19.6)', () => {
    const conFormacion = { ...VACIO, education: PROFILE_RECORDS_MOCK.education };

    expect(profileCompleteness(conFormacion, '   ').percentage).toBe(20);
    expect(profileCompleteness(conFormacion, 'Analista').percentage).toBe(40);
  });

  it('el primer proyecto completa la sección Proyectos (HU-19, T19.6)', () => {
    const conProyecto = { ...VACIO, project: PROFILE_RECORDS_MOCK.project };
    const completitud = profileCompleteness(conProyecto, '');

    expect(completitud.percentage).toBe(20);
    expect(completitud.sections.find((seccion) => seccion.id === 'proyectos')?.complete).toBe(true);
  });

  it('con registros en las 4 secciones y descripción está al 100% sin faltantes', () => {
    const completitud = profileCompleteness(PROFILE_RECORDS_MOCK, 'Ingeniero de sistemas');

    expect(completitud.percentage).toBe(100);
    expect(completitud.missing).toEqual([]);
  });
});

describe('seccionDeUrl y completarSeccionHref (T6.6)', () => {
  it('solo acepta una de las 5 secciones', () => {
    expect(seccionDeUrl('descripcion-profesional')).toBe('descripcion-profesional');
    expect(seccionDeUrl('proyectos')).toBe('proyectos');
    expect(seccionDeUrl('otra')).toBeUndefined();
    expect(seccionDeUrl(undefined)).toBeUndefined();
  });

  it('arma el enlace al formulario con el regreso al resumen', () => {
    expect(completarSeccionHref('formacion-academica')).toBe(
      '/profile/completar?seccion=formacion-academica&returnTo=%2Fprofile',
    );
  });
});

describe('isProfileEmpty (T12.1)', () => {
  const empty: ProfileRecords = { education: [], experience: [], certification: [], project: [] };

  it('es verdadero sin registros y sin descripción', () => {
    expect(isProfileEmpty(empty, '')).toBe(true);
    expect(isProfileEmpty(empty, '   ')).toBe(true);
  });

  it('es falso con al menos un registro', () => {
    expect(isProfileEmpty({ ...empty, education: PROFILE_RECORDS_MOCK.education.slice(0, 1) }, '')).toBe(false);
    expect(isProfileEmpty({ ...empty, experience: PROFILE_RECORDS_MOCK.experience.slice(0, 1) }, '')).toBe(false);
    expect(isProfileEmpty({ ...empty, certification: PROFILE_RECORDS_MOCK.certification.slice(0, 1) }, '')).toBe(false);
    // HU-19: un perfil con solo un proyecto ya no está vacío
    expect(isProfileEmpty({ ...empty, project: PROFILE_RECORDS_MOCK.project }, '')).toBe(false);
  });

  it('es falso si solo tiene la descripción profesional', () => {
    expect(isProfileEmpty(empty, 'Ingeniero de sistemas.')).toBe(false);
  });
});
