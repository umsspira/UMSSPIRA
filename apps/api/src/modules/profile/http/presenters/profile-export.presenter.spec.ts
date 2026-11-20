import type { ProfileSnapshot } from '../../domain/entities/profile-record';
import { presentProfileExport } from './profile-export.presenter';

const profile: ProfileSnapshot = {
  graduate: { id: 't1', name: 'Carlos Mendoza Ríos', career: null, cohort: null },
  education: [],
  experience: [],
  certifications: [],
  projects: [],
  description: { text: '', updatedAt: null },
};

const fullProfile: ProfileSnapshot = {
  graduate: { id: 't1', name: 'Carlos Mendoza Ríos', career: 'Ingeniería de Sistemas', cohort: null },
  education: [
    {
      id: 'e1',
      graduateId: 't1',
      createdAt: null,
      kind: 'education',
      institution: 'Universidad Mayor de San Simón',
      title: 'Licenciatura en Ingeniería de Sistemas',
      degree: 'Licenciatura',
      graduationYear: 2018,
    },
  ],
  experience: [
    {
      id: 'x1',
      graduateId: 't1',
      createdAt: null,
      kind: 'experience',
      company: 'NTT DATA',
      position: 'Tech Lead',
      startDate: new Date('2023-07-01T00:00:00Z'),
      endDate: null,
    },
    {
      id: 'x2',
      graduateId: 't1',
      createdAt: null,
      kind: 'experience',
      company: 'Jalasoft',
      position: 'Desarrollador Senior',
      startDate: new Date('2021-01-04T00:00:00Z'),
      endDate: new Date('2023-06-30T00:00:00Z'),
    },
  ],
  certifications: [
    {
      id: 'c1',
      graduateId: 't1',
      createdAt: null,
      kind: 'certification',
      name: 'AWS Solutions Architect',
      issuer: 'Amazon Web Services',
      degree: 'Profesional',
      issuedYear: 2022,
      backup: null,
    },
  ],
  projects: [],
  description: { text: '', updatedAt: null },
};

describe('presentProfileExport (HU5-05)', () => {
  it('nombra las secciones como en el Sprint Backlog', () => {
    const file = presentProfileExport(profile, new Date('2026-10-22T12:00:00Z'));
    const json = JSON.parse(file.content);

    expect(file.name).toBe('perfil_carlos_mendoza_rios_2026-10-22.json');
    expect(Object.keys(json)).toEqual([
      'IdEgresado',
      'FechaDescarga',
      'Nombre',
      'Carrera',
      'Promocion',
      'Formación académica',
      'Experiencia laboral',
      'Certificaciones',
    ]);
    expect(json['Formación académica']).toEqual([]);
    expect(json['Experiencia laboral']).toEqual([]);
    expect(json.Certificaciones).toEqual([]);
  });

  it('usa los mismos campos con mayúscula inicial que la descarga del frontend', () => {
    const json = JSON.parse(presentProfileExport(fullProfile, new Date('2026-10-22T12:00:00Z')).content);

    expect(json).toMatchObject({
      IdEgresado: 't1',
      FechaDescarga: '2026-10-22',
      Nombre: 'Carlos Mendoza Ríos',
      Carrera: 'Ingeniería de Sistemas',
      Promocion: null,
    });
    expect(json['Formación académica'][0]).toEqual({
      Institucion: 'Universidad Mayor de San Simón',
      Titulo: 'Licenciatura en Ingeniería de Sistemas',
      Grado: 'Licenciatura',
      Anio: 2018,
      Respaldo: null,
    });
    expect(json['Experiencia laboral'][0]).toEqual({
      Empresa: 'NTT DATA',
      Cargo: 'Tech Lead',
      Periodo: 'Jul 2023 – Presente',
      FechaInicio: '2023-07-01',
      FechaFin: null,
    });
    expect(json['Experiencia laboral'][1]).toEqual({
      Empresa: 'Jalasoft',
      Cargo: 'Desarrollador Senior',
      Periodo: 'Ene 2021 – Jun 2023',
      FechaInicio: '2021-01-04',
      FechaFin: '2023-06-30',
    });
    expect(json.Certificaciones[0]).toEqual({
      Nombre: 'AWS Solutions Architect',
      Entidad: 'Amazon Web Services',
      Anio: 2022,
      Grado: 'Profesional',
    });
  });

  it('un titulado sin nombre ni carrera exporta cadenas vacías, no null', () => {
    const json = JSON.parse(
      presentProfileExport(
        { ...profile, graduate: { id: 't2', name: null, career: null, cohort: null } },
        new Date('2026-10-22T12:00:00Z'),
      ).content,
    );

    expect(json.Nombre).toBe('');
    expect(json.Carrera).toBe('');
  });

  it('usa indentación de 2 espacios', () => {
    const { content } = presentProfileExport(profile, new Date('2026-10-22T12:00:00Z'));
    expect(content).toBe(JSON.stringify(JSON.parse(content), null, 2));
  });
});
