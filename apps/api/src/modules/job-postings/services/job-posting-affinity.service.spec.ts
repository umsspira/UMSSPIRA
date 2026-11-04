import { JobPostingAffinityService } from './job-posting-affinity.service';
import { NlpMatcherService } from './nlp-matcher.service';
import type {
  TechnicalVacancyRequirement,
  GraduateProfileSummary,
} from '@umsspira/shared-types';

describe('JobPostingAffinityService', () => {
  let service: JobPostingAffinityService;
  let nlpMatcher: NlpMatcherService;

  const vacanteFrontendRequirements: TechnicalVacancyRequirement[] = [
    {
      id: 'req-1',
      idVacante: 'vac-frontend',
      competencia: 'React',
      nivel: 'Avanzado',
      tipo: 'Obligatorio',
    },
    {
      id: 'req-2',
      idVacante: 'vac-frontend',
      competencia: 'Diseño responsive',
      nivel: 'Intermedio',
      tipo: 'Obligatorio',
    },
    {
      id: 'req-3',
      idVacante: 'vac-frontend',
      competencia: 'TypeScript',
      nivel: 'Básico',
      tipo: 'Deseable',
    },
  ];

  const vacanteBackendRequirements: TechnicalVacancyRequirement[] = [
    {
      id: 'req-4',
      idVacante: 'vac-backend',
      competencia: 'Python',
      nivel: 'Avanzado',
      tipo: 'Obligatorio',
    },
    {
      id: 'req-5',
      idVacante: 'vac-backend',
      competencia: 'Django',
      nivel: 'Intermedio',
      tipo: 'Obligatorio',
    },
  ];

  const profileCarlos: GraduateProfileSummary = {
    id: 'egresado-carlos',
    nombre: 'Carlos Mendoza',
    competencias: ['React', 'Diseño web adaptable', 'TypeScript'],
    descripcionProfesional: 'Desarrollador frontend con experiencia sólida en React.',
  };

  const profileMaria: GraduateProfileSummary = {
    id: 'egresado-maria',
    nombre: 'Maria Gomez',
    competencias: ['Python', 'Django', 'PostgreSQL'],
    descripcionProfesional: 'Especialista en desarrollo backend Python.',
  };

  beforeEach(() => {
    nlpMatcher = new NlpMatcherService();
    service = new JobPostingAffinityService(nlpMatcher);
    service.registerMockProfile(profileCarlos);
    service.registerMockProfile(profileMaria);
  });

  it('debe calcular afinidad exitosa para perfil y vacante compatibles (Criterio 1, 2, 3, 5, 6)', async () => {
    const result = await service.calculateAffinity('vac-frontend', 'egresado-carlos', {
      overrideRequirements: vacanteFrontendRequirements,
    });

    expect(result.estado).toBe('SUCCESS');
    expect(result.idVacante).toBe('vac-frontend');
    expect(result.idEgresado).toBe('egresado-carlos');
    expect(result.porcentaje).not.toBeNull();
    expect(result.porcentaje).toBeGreaterThanOrEqual(0);
    expect(result.porcentaje).toBeLessThanOrEqual(100);
    expect(result.detalles?.totalRequisitos).toBe(3);
    expect(result.detalles?.obligatoriosCumplidos).toBe(2);
    expect(result.detalles?.deseablesCumplidos).toBe(1);
    expect(result.detalles?.habilidades).toHaveLength(3);
  });

  it('debe manejar perfiles incompletos retornando INCOMPLETE_PROFILE y porcentaje null (Criterio 7)', async () => {
    const profileVacio: GraduateProfileSummary = {
      id: 'egresado-vacio',
      competencias: [],
      descripcionProfesional: '',
    };
    service.registerMockProfile(profileVacio);

    const result = await service.calculateAffinity('vac-frontend', 'egresado-vacio', {
      overrideRequirements: vacanteFrontendRequirements,
    });

    expect(result.estado).toBe('INCOMPLETE_PROFILE');
    expect(result.porcentaje).toBeNull();
    expect(result.mensaje).toContain('perfil profesional del egresado está incompleto');
  });

  it('debe indicar falta de datos si la vacante no tiene requisitos técnicos sin inventar porcentajes (Criterio 8)', async () => {
    const result = await service.calculateAffinity('vac-sin-reqs', 'egresado-carlos', {
      overrideRequirements: [],
    });

    expect(result.estado).toBe('INSUFFICIENT_REQUIREMENTS');
    expect(result.porcentaje).toBeNull();
    expect(result.mensaje).toContain('no cuenta con requisitos técnicos suficientes');
  });

  it('debe ser resiliente ante fallos del servicio NLP retornando NLP_ERROR de forma controlada (Criterio 9)', async () => {
    const result = await service.calculateAffinity('vac-frontend', 'egresado-carlos', {
      overrideRequirements: vacanteFrontendRequirements,
      forceNlpFailure: true,
    });

    expect(result.estado).toBe('NLP_ERROR');
    expect(result.porcentaje).toBeNull();
    expect(result.mensaje).toContain('no se encuentra disponible');
  });

  it('debe actualizar el resultado al cambiar o consultar otra vacante (Criterio 10)', async () => {
    // Carlos evaluado contra vac-frontend
    const resFrontend = await service.calculateAffinity('vac-frontend', 'egresado-carlos', {
      overrideRequirements: vacanteFrontendRequirements,
    });
    // Carlos evaluado contra vac-backend
    const resBackend = await service.calculateAffinity('vac-backend', 'egresado-carlos', {
      overrideRequirements: vacanteBackendRequirements,
    });

    expect(resFrontend.idVacante).toBe('vac-frontend');
    expect(resFrontend.porcentaje).toBeGreaterThan(80);

    expect(resBackend.idVacante).toBe('vac-backend');
    expect(resBackend.porcentaje).toBe(0);
  });

  it('debe soportar consultas simultáneas sin mezclar datos de distintos egresados (Criterio 4 y 11)', async () => {
    const [resCarlos, resMaria] = await Promise.all([
      service.calculateAffinity('vac-backend', 'egresado-carlos', {
        overrideRequirements: vacanteBackendRequirements,
      }),
      service.calculateAffinity('vac-backend', 'egresado-maria', {
        overrideRequirements: vacanteBackendRequirements,
      }),
    ]);

    expect(resCarlos.idEgresado).toBe('egresado-carlos');
    expect(resCarlos.idVacante).toBe('vac-backend');
    expect(resCarlos.porcentaje).toBe(0); // Carlos no sabe Python

    expect(resMaria.idEgresado).toBe('egresado-maria');
    expect(resMaria.idVacante).toBe('vac-backend');
    expect(resMaria.porcentaje).toBe(100); // María cumple 100% de backend
  });
});
