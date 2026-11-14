/// <reference types="jest" />
import { PrismaSurveyRepository } from './prisma-survey.repository';
import type { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';

describe('PrismaSurveyRepository', () => {
  let repository: PrismaSurveyRepository;
  let prisma: {
    respuestaEncuesta: {
      create: jest.Mock;
    };
    encuesta: {
      findFirst: jest.Mock;
    };
    titulado: {
      findUnique: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      respuestaEncuesta: {
        create: jest.fn(),
      },
      encuesta: {
        findFirst: jest.fn(),
      },
      titulado: {
        findUnique: jest.fn(),
      },
    };
    repository = new PrismaSurveyRepository(prisma as unknown as PrismaService);
  });

  describe('save', () => {
    it('persiste la respuesta con condicionLaboral booleano', async () => {
      prisma.respuestaEncuesta.create.mockResolvedValue({ id: 'resp-1' });

      const input = {
        idEncuesta: 'enc-1',
        idTitulado: 'tit-1',
        condicionLaboral: true,
        cargo: 'Desarrollador',
        empresa: 'Empresa Test',
        area: 'Tecnología',
        modalidad: 'Remoto',
        salarioMensual: '5.001–8.000',
        tiempoInsercion: '6',
      };

      const result = await repository.save(input);

      expect(prisma.respuestaEncuesta.create).toHaveBeenCalledWith({
        data: {
          idEncuesta: 'enc-1',
          idTitulado: 'tit-1',
          condicionLaboral: true,
          cargo: 'Desarrollador',
          empresa: 'Empresa Test',
          area: 'Tecnología',
          modalidad: 'Remoto',
          salarioMensual: '5.001–8.000',
          tiempoInsercion: '6',
        },
      });
      expect(result).toEqual({ id: 'resp-1' });
    });
  });

  describe('findActiveSurveyByCareer', () => {
    it('busca la encuesta publicada y vigente para la carrera especificada', async () => {
      const mockSurvey = {
        id: 'survey-1',
        titulo: 'Encuesta 2026',
        estado: 'PUBLICADA',
        id_carrera: 'career-1',
        fecha_inicio: new Date('2026-01-01'),
        fecha_fin: new Date('2026-12-31'),
      };
      prisma.encuesta.findFirst.mockResolvedValue(mockSurvey);

      const result = await repository.findActiveSurveyByCareer('career-1');

      expect(result).toBe(mockSurvey);
      expect(prisma.encuesta.findFirst).toHaveBeenCalledWith({
        where: {
          id_carrera: 'career-1',
          estado: {
            in: ['PUBLICADA'],
          },
          fecha_inicio: { lte: expect.any(Date) },
          fecha_fin: { gte: expect.any(Date) },
        },
        orderBy: { fecha_creacion: 'desc' },
      });
    });

    it('incluye el id_encuesta en el filtro cuando se suministra surveyId', async () => {
      prisma.encuesta.findFirst.mockResolvedValue({ id: 'survey-spec-1' });

      await repository.findActiveSurveyByCareer('career-1', 'survey-spec-1');

      expect(prisma.encuesta.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'survey-spec-1',
            id_carrera: 'career-1',
          }),
        }),
      );
    });

    it('compara contra el inicio del día en Bolivia para no expirar en el último día de vigencia', async () => {
      prisma.encuesta.findFirst.mockResolvedValue(null);

      await repository.findActiveSurveyByCareer('career-1');

      const callArgs = prisma.encuesta.findFirst.mock.calls[0][0];
      const hoyUsado = callArgs.where.fecha_fin.gte as Date;
      expect(hoyUsado).toBeInstanceOf(Date);
      expect(callArgs.where.fecha_inicio.lte).toEqual(hoyUsado);
      expect(callArgs.where.estado).toEqual({ in: ['PUBLICADA'] });
    });
  });

  describe('findActiveSurveyForGraduate', () => {
    it('obtiene la carrera del titulado y resuelve la encuesta activa', async () => {
      prisma.titulado.findUnique.mockResolvedValue({
        id_carrera: 'career-sys-10',
      });
      prisma.encuesta.findFirst.mockResolvedValue({ id: 'survey-active-sys' });

      const result = await repository.findActiveSurveyForGraduate('titulado-1');

      expect(prisma.titulado.findUnique).toHaveBeenCalledWith({
        where: { id: 'titulado-1' },
        select: { id_carrera: true },
      });
      expect(prisma.encuesta.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id_carrera: 'career-sys-10',
          }),
        }),
      );
      expect(result).toEqual({ id: 'survey-active-sys' });
    });

    it('devuelve null si el titulado no existe o no tiene carrera asignada', async () => {
      prisma.titulado.findUnique.mockResolvedValue(null);

      const result = await repository.findActiveSurveyForGraduate('titulado-sin-carrera');

      expect(result).toBeNull();
      expect(prisma.encuesta.findFirst).not.toHaveBeenCalled();
    });

    it('devuelve null si el titulado tiene id_carrera nulo', async () => {
      prisma.titulado.findUnique.mockResolvedValue({ id_carrera: null });

      const result = await repository.findActiveSurveyForGraduate('titulado-id-null');

      expect(result).toBeNull();
      expect(prisma.encuesta.findFirst).not.toHaveBeenCalled();
    });
  });
});
