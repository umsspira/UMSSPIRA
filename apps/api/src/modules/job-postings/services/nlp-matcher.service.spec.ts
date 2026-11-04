import { NlpMatcherService } from './nlp-matcher.service';
import type { TechnicalVacancyRequirement } from '@umsspira/shared-types';

describe('NlpMatcherService', () => {
  let service: NlpMatcherService;

  beforeEach(() => {
    service = new NlpMatcherService();
  });

  describe('matchSkill', () => {
    it('debe identificar una coincidencia exacta insensible a mayúsculas y acentos', () => {
      const req: TechnicalVacancyRequirement = {
        id: '1',
        idVacante: 'v1',
        competencia: 'React',
        nivel: 'Avanzado',
        tipo: 'Obligatorio',
      };
      const result = service.matchSkill(req, ['react', 'node.js']);

      expect(result.coincide).toBe(true);
      expect(result.tipoResultado).toBe('Exacta');
      expect(result.habilidadPerfil).toBe('react');
      expect(result.score).toBe(1.0);
    });

    it('debe identificar una coincidencia similar NLP con sinónimos conocidos', () => {
      const req: TechnicalVacancyRequirement = {
        id: '2',
        idVacante: 'v1',
        competencia: 'Diseño responsive',
        nivel: 'Intermedio',
        tipo: 'Obligatorio',
      };
      const result = service.matchSkill(req, ['Diseño web adaptable', 'CSS3']);

      expect(result.coincide).toBe(true);
      expect(result.tipoResultado).toBe('Similar - NLP');
      expect(result.habilidadPerfil).toBe('Diseño web adaptable');
      expect(result.score).toBeGreaterThan(0.7);
    });

    it('debe clasificar como "No encontrada" cuando la habilidad no está presente', () => {
      const req: TechnicalVacancyRequirement = {
        id: '3',
        idVacante: 'v1',
        competencia: 'Kubernetes',
        nivel: 'Avanzado',
        tipo: 'Deseable',
      };
      const result = service.matchSkill(req, ['HTML', 'CSS']);

      expect(result.coincide).toBe(false);
      expect(result.tipoResultado).toBe('No encontrada');
      expect(result.habilidadPerfil).toBeUndefined();
      expect(result.score).toBe(0.0);
    });
  });

  describe('calculateBreakdown', () => {
    const mockRequirements: TechnicalVacancyRequirement[] = [
      {
        id: '1',
        idVacante: 'v1',
        competencia: 'React',
        nivel: 'Avanzado',
        tipo: 'Obligatorio',
      },
      {
        id: '2',
        idVacante: 'v1',
        competencia: 'TypeScript',
        nivel: 'Intermedio',
        tipo: 'Obligatorio',
      },
      {
        id: '3',
        idVacante: 'v1',
        competencia: 'Docker',
        nivel: 'Básico',
        tipo: 'Deseable',
      },
    ];

    it('debe calcular 100% de afinidad cuando se cumplen todos los requisitos', () => {
      const { porcentaje, breakdown } = service.calculateBreakdown(
        mockRequirements,
        ['React', 'TypeScript', 'Docker'],
      );

      expect(porcentaje).toBe(100);
      expect(breakdown.obligatoriosCumplidos).toBe(2);
      expect(breakdown.deseablesCumplidos).toBe(1);
    });

    it('debe garantizar que el porcentaje esté estrictamente entre 0% y 100%', () => {
      const { porcentaje } = service.calculateBreakdown(
        mockRequirements,
        ['React'],
      );

      expect(porcentaje).toBeGreaterThan(0);
      expect(porcentaje).toBeLessThan(100);
      expect(porcentaje).toBeGreaterThanOrEqual(0);
      expect(porcentaje).toBeLessThanOrEqual(100);
    });

    it('debe ponderar los requisitos obligatorios con mayor peso que los deseables', () => {
      // Caso A: Solo cumple el deseable (Docker)
      const resSoloDeseable = service.calculateBreakdown(
        mockRequirements,
        ['Docker'],
      );
      // Caso B: Solo cumple un obligatorio (React)
      const resSoloObligatorio = service.calculateBreakdown(
        mockRequirements,
        ['React'],
      );

      expect(resSoloObligatorio.porcentaje).toBeGreaterThan(
        resSoloDeseable.porcentaje,
      );
    });

    it('debe lanzar error controlado si forceNlpFailure está activo', () => {
      expect(() =>
        service.calculateBreakdown(mockRequirements, ['React'], undefined, {
          forceNlpFailure: true,
        }),
      ).toThrow('Fallo simulado del servicio NLP.');
    });
  });
});
