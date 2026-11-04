import { Injectable } from '@nestjs/common';
import type {
  TechnicalVacancyRequirement,
  MatchedSkill,
  SkillMatchType,
  AffinityBreakdown,
} from '@umsspira/shared-types';

export interface MatcherOptions {
  forceNlpFailure?: boolean;
}

@Injectable()
export class NlpMatcherService {
  private static readonly SYNONYMS: Record<string, string[]> = {
    'diseno responsive': ['diseno web adaptable', 'responsive design', 'diseno adaptativo'],
    'react': ['react.js', 'reactjs', 'frontend react'],
    'node': ['node.js', 'nodejs', 'backend node'],
    'postgresql': ['postgres', 'pgsql', 'bd postgresql'],
    'typescript': ['ts', 'tipado estatico typescript'],
    'docker': ['contenedores docker', 'containerization docker'],
    'git': ['control de versiones git', 'github', 'gitlab'],
    'rest api': ['api rest', 'servicios rest', 'apis restful'],
    'testing': ['pruebas unitarias', 'jest', 'qa testing', 'test unitarios'],
  };

  /**
   * Normaliza texto para comparaciones: minúsculas, sin acentos y sin espacios redundantes.
   */
  private normalize(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s]/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Evalúa la similitud semántica o sintáctica entre una habilidad requerida y las del perfil.
   */
  public matchSkill(
    req: TechnicalVacancyRequirement,
    profileSkills: string[],
    profileDescription?: string,
  ): MatchedSkill {
    const normalizedReq = this.normalize(req.competencia);
    const tipo = (req.tipo === 'Obligatorio' || req.tipo === 'Deseable') ? req.tipo : 'Obligatorio';

    // 1. Coincidencia Exacta
    for (const skill of profileSkills) {
      const normalizedSkill = this.normalize(skill);
      if (normalizedSkill === normalizedReq) {
        return {
          competencia: req.competencia,
          nivelRequerido: req.nivel,
          tipo,
          coincide: true,
          tipoResultado: 'Exacta',
          habilidadPerfil: skill,
          score: 1.0,
        };
      }
    }

    // 2. Coincidencia Similar / NLP (sinónimos o equivalencias conocidas)
    const synonyms = NlpMatcherService.SYNONYMS[normalizedReq] || [];
    for (const skill of profileSkills) {
      const normalizedSkill = this.normalize(skill);

      // Si coincide con un sinónimo directo
      if (synonyms.some((syn) => syn === normalizedSkill || normalizedSkill.includes(syn) || syn.includes(normalizedSkill))) {
        return {
          competencia: req.competencia,
          nivelRequerido: req.nivel,
          tipo,
          coincide: true,
          tipoResultado: 'Similar - NLP',
          habilidadPerfil: skill,
          score: 0.85,
        };
      }

      // Subcadena o traslape significativo de palabras
      if (
        normalizedSkill.length > 3 &&
        normalizedReq.length > 3 &&
        (normalizedSkill.includes(normalizedReq) || normalizedReq.includes(normalizedSkill))
      ) {
        return {
          competencia: req.competencia,
          nivelRequerido: req.nivel,
          tipo,
          coincide: true,
          tipoResultado: 'Similar - NLP',
          habilidadPerfil: skill,
          score: 0.8,
        };
      }
    }

    // 3. Búsqueda en descripción profesional del egresado si existe
    if (profileDescription) {
      const normalizedDesc = this.normalize(profileDescription);
      if (normalizedDesc.includes(normalizedReq)) {
        return {
          competencia: req.competencia,
          nivelRequerido: req.nivel,
          tipo,
          coincide: true,
          tipoResultado: 'Similar - NLP',
          habilidadPerfil: req.competencia,
          score: 0.75,
        };
      }
    }

    // 4. No encontrada
    return {
      competencia: req.competencia,
      nivelRequerido: req.nivel,
      tipo,
      coincide: false,
      tipoResultado: 'No encontrada',
      score: 0.0,
    };
  }

  /**
   * Realiza la comparación global y cálculo de afinidad ponderada entre 0 y 100.
   */
  public calculateBreakdown(
    requirements: TechnicalVacancyRequirement[],
    profileSkills: string[],
    profileDescription?: string,
    options?: MatcherOptions,
  ): { porcentaje: number; breakdown: AffinityBreakdown } {
    if (options?.forceNlpFailure) {
      throw new Error('Fallo simulado del servicio NLP.');
    }

    if (requirements.length === 0) {
      return {
        porcentaje: 0,
        breakdown: {
          totalRequisitos: 0,
          obligatoriosCumplidos: 0,
          deseablesCumplidos: 0,
          habilidades: [],
        },
      };
    }

    const matchedSkills: MatchedSkill[] = requirements.map((req) =>
      this.matchSkill(req, profileSkills, profileDescription),
    );

    let totalWeight = 0;
    let earnedWeight = 0;
    let obligatoriosCumplidos = 0;
    let deseablesCumplidos = 0;

    for (const match of matchedSkills) {
      // Requisitos obligatorios ponderan con peso 1.0; deseables con peso 0.5
      const weight = match.tipo === 'Obligatorio' ? 1.0 : 0.5;
      totalWeight += weight;
      earnedWeight += (match.score ?? 0) * weight;

      if (match.coincide) {
        if (match.tipo === 'Obligatorio') {
          obligatoriosCumplidos++;
        } else {
          deseablesCumplidos++;
        }
      }
    }

    const rawPercentage = totalWeight > 0 ? (earnedWeight / totalWeight) * 100 : 0;
    // Criterio 5: Estrictamente entre 0% y 100%
    const boundedPercentage = Math.min(100, Math.max(0, Math.round(rawPercentage * 100) / 100));

    return {
      porcentaje: boundedPercentage,
      breakdown: {
        totalRequisitos: requirements.length,
        obligatoriosCumplidos,
        deseablesCumplidos,
        habilidades: matchedSkills,
      },
    };
  }
}
