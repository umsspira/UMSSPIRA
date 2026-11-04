import { Injectable, Logger } from '@nestjs/common';
import type {
  TechnicalVacancyRequirement,
  VacancyAffinityResponse,
  GraduateProfileSummary,
} from '@umsspira/shared-types';
import { NlpMatcherService, MatcherOptions } from './nlp-matcher.service';

type RequirementRow = {
  id: string;
  id_vacante: string;
  competencia: string;
  nivel: string;
  tipo: string;
  descripcion: string | null;
  fecha_creacion: string;
};

@Injectable()
export class JobPostingAffinityService {
  private readonly logger = new Logger(JobPostingAffinityService.name);

  // Perfiles de demostración o prueba deterministas para pruebas locales y fallback
  private mockProfiles: Map<string, GraduateProfileSummary> = new Map([
    [
      'egresado-demo-completo',
      {
        id: 'egresado-demo-completo',
        nombre: 'Carlos Mendoza',
        carrera: 'Ingeniería de Sistemas',
        competencias: [
          'React',
          'TypeScript',
          'Node.js',
          'PostgreSQL',
          'Diseño web adaptable',
          'Git',
          'Docker',
        ],
        descripcionProfesional:
          'Desarrollador Full Stack con experiencia en React, TypeScript y APIs REST con Node.js y bases de datos PostgreSQL.',
      },
    ],
    [
      'egresado-demo-parcial',
      {
        id: 'egresado-demo-parcial',
        nombre: 'Ana Rojas',
        carrera: 'Ingeniería Informática',
        competencias: ['React', 'JavaScript', 'HTML5', 'CSS3'],
        descripcionProfesional: 'Desarrolladora frontend apasionada por crear interfaces intuitivas.',
      },
    ],
    [
      'egresado-demo-incompleto',
      {
        id: 'egresado-demo-incompleto',
        nombre: 'Egresado Sin Datos',
        carrera: 'Ingeniería de Sistemas',
        competencias: [],
        descripcionProfesional: '',
      },
    ],
  ]);

  constructor(private readonly nlpMatcher: NlpMatcherService) {}

  /**
   * Permite registrar o actualizar perfiles mock (útil para pruebas unitarias y desarrollo).
   */
  public registerMockProfile(profile: GraduateProfileSummary): void {
    this.mockProfiles.set(profile.id, profile);
  }

  /**
   * Obtiene los requisitos técnicos de la vacante (desde Supabase o mock en memoria).
   */
  public async getVacancyRequirements(
    vacancyId: string,
  ): Promise<TechnicalVacancyRequirement[]> {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      // Si Supabase no está configurado, buscamos en los fixtures de prueba
      return [];
    }

    try {
      const endpoint = new URL(
        `${url.replace(/\/$/, '')}/rest/v1/requisito_tecnico_vacante`,
      );
      endpoint.searchParams.set('id_vacante', `eq.${vacancyId}`);
      endpoint.searchParams.set(
        'select',
        'id,id_vacante,competencia,nivel,tipo,descripcion,fecha_creacion',
      );
      endpoint.searchParams.set('order', 'fecha_creacion.asc');

      const response = await fetch(endpoint, {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Supabase respondió con status ${response.status}`);
      }

      const rows = (await response.json()) as RequirementRow[];

      return rows.map((row) => ({
        id: row.id,
        idVacante: row.id_vacante,
        competencia: row.competencia,
        nivel: row.nivel,
        tipo: row.tipo,
        descripcion: row.descripcion,
        fechaCreacion: row.fecha_creacion,
      }));
    } catch (error) {
      this.logger.warn(`No se pudieron obtener requisitos de Supabase para ${vacancyId}: ${(error as Error).message}`);
      return [];
    }
  }

  /**
   * Obtiene el perfil profesional del egresado consultante.
   */
  public async getGraduateProfile(
    graduateId: string,
  ): Promise<GraduateProfileSummary | null> {
    // 1. Revisar mocks registrados
    if (this.mockProfiles.has(graduateId)) {
      return this.mockProfiles.get(graduateId)!;
    }

    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      return null;
    }

    try {
      // Consultar perfil_area / egresado desde Supabase
      const endpoint = new URL(`${url.replace(/\/$/, '')}/rest/v1/perfil_area`);
      endpoint.searchParams.set('id_egresado', `eq.${graduateId}`);
      endpoint.searchParams.set('select', 'descripcion_profesional');

      const response = await fetch(endpoint, {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
      });

      let descripcionProfesional = '';
      if (response.ok) {
        const rows = (await response.json()) as Array<{ descripcion_profesional?: string }>;
        if (rows.length > 0 && rows[0].descripcion_profesional) {
          descripcionProfesional = rows[0].descripcion_profesional;
        }
      }

      // Consultar certificaciones del egresado
      const certEndpoint = new URL(`${url.replace(/\/$/, '')}/rest/v1/certificacion`);
      certEndpoint.searchParams.set('id_egresado', `eq.${graduateId}`);
      certEndpoint.searchParams.set('select', 'nombre');

      const certResponse = await fetch(certEndpoint, {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
      });

      const competencias: string[] = [];
      if (certResponse.ok) {
        const certRows = (await certResponse.json()) as Array<{ nombre: string }>;
        for (const cert of certRows) {
          if (cert.nombre) competencias.push(cert.nombre);
        }
      }

      return {
        id: graduateId,
        competencias,
        descripcionProfesional,
      };
    } catch (error) {
      this.logger.warn(`No se pudo obtener el perfil de Supabase para ${graduateId}: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Orquesta el cálculo de afinidad garantizando todos los criterios de aceptación de la HU9.
   */
  public async calculateAffinity(
    vacancyId: string,
    graduateId: string,
    options?: MatcherOptions & {
      overrideRequirements?: TechnicalVacancyRequirement[];
      overrideProfile?: GraduateProfileSummary;
    },
  ): Promise<VacancyAffinityResponse> {
    const timestamp = new Date().toISOString();

    // 1. Obtener requisitos técnicos de la vacante seleccionada (Criterio 2)
    const requirements =
      options?.overrideRequirements ?? (await this.getVacancyRequirements(vacancyId));

    // Criterio 8: Requisitos insuficientes -> no producir porcentajes inventados
    if (!requirements || requirements.length === 0) {
      return {
        idVacante: vacancyId,
        idEgresado: graduateId,
        porcentaje: null,
        estado: 'INSUFFICIENT_REQUIREMENTS',
        mensaje: 'La vacante no cuenta con requisitos técnicos suficientes para calcular la afinidad.',
        calculadoEn: timestamp,
      };
    }

    // 2. Obtener el perfil profesional del egresado consultante (Criterio 1)
    const profile =
      options?.overrideProfile ?? (await this.getGraduateProfile(graduateId));

    // Criterio 7: Manejo de perfiles incompletos
    const hasSkills = Boolean(profile?.competencias && profile.competencias.length > 0);
    const hasDescription = Boolean(profile?.descripcionProfesional && profile.descripcionProfesional.trim().length > 0);

    if (!profile || (!hasSkills && !hasDescription)) {
      return {
        idVacante: vacancyId,
        idEgresado: graduateId,
        porcentaje: null,
        estado: 'INCOMPLETE_PROFILE',
        mensaje: 'El perfil profesional del egresado está incompleto para evaluar afinidad.',
        calculadoEn: timestamp,
      };
    }

    // 3. Realizar la comparación mediante el servicio de matching/afinidad (Criterio 3)
    // Criterio 9: Resiliencia ante fallos del servicio NLP
    try {
      const { porcentaje, breakdown } = this.nlpMatcher.calculateBreakdown(
        requirements,
        profile.competencias || [],
        profile.descripcionProfesional,
        options,
      );

      // Criterio 5: Estrictamente entre 0% y 100%
      const boundedPercentage = Math.min(100, Math.max(0, porcentaje));

      return {
        idVacante: vacancyId,
        idEgresado: graduateId,
        porcentaje: boundedPercentage,
        estado: 'SUCCESS',
        mensaje: 'Afinidad calculada exitosamente.',
        detalles: breakdown,
        calculadoEn: timestamp,
      };
    } catch (error) {
      this.logger.error(`Error en el cálculo de NLP para vacante ${vacancyId} y egresado ${graduateId}: ${(error as Error).message}`);
      return {
        idVacante: vacancyId,
        idEgresado: graduateId,
        porcentaje: null,
        estado: 'NLP_ERROR',
        mensaje: 'El servicio de análisis de afinidad no se encuentra disponible temporalmente.',
        calculadoEn: timestamp,
      };
    }
  }
}
