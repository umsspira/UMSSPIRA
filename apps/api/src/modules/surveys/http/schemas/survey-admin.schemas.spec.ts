import {
  createSurveyAdminSchema,
  surveyIdSchema,
  updateSurveyAdminSchema,
} from './survey-admin.schemas';

describe('survey-admin.schemas', () => {
  describe('createSurveyAdminSchema', () => {
    it('acepta título y fechas, y convierte las fechas a Date', () => {
      const result = createSurveyAdminSchema.parse({
        title: '  Encuesta 2026  ',
        startDate: '2026-11-01',
        endDate: '2026-11-30',
      });

      expect(result.title).toBe('Encuesta 2026');
      expect(result.startDate).toBeInstanceOf(Date);
      expect(result.endDate).toBeInstanceOf(Date);
      expect(result.format).toBeUndefined();
    });

    it('acepta la carrera de la encuesta y la normaliza en minúsculas', () => {
      const result = createSurveyAdminSchema.parse({
        title: 'Encuesta 2026',
        startDate: '2026-11-01',
        endDate: '2026-11-30',
        careerId: 'AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA',
      });

      expect(result.careerId).toBe('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    });

    it('rechaza una carrera que no es un UUID', () => {
      expect(
        createSurveyAdminSchema.safeParse({
          title: 'Encuesta 2026',
          startDate: '2026-11-01',
          endDate: '2026-11-30',
          careerId: 'sistemas',
        }).success,
      ).toBe(false);
    });

    it('rechaza un título vacío', () => {
      expect(
        createSurveyAdminSchema.safeParse({
          title: '   ',
          startDate: '2026-11-01',
          endDate: '2026-11-30',
        }).success,
      ).toBe(false);
    });

    it('rechaza si falta una fecha', () => {
      expect(
        createSurveyAdminSchema.safeParse({ title: 'Encuesta', startDate: '2026-11-01' }).success,
      ).toBe(false);
    });

    it('rechaza campos que no son del formulario', () => {
      expect(
        createSurveyAdminSchema.safeParse({
          title: 'Encuesta',
          startDate: '2026-11-01',
          endDate: '2026-11-30',
          estado: 'PUBLICADA',
        }).success,
      ).toBe(false);
    });
  });

  describe('updateSurveyAdminSchema', () => {
    it('acepta cambios parciales', () => {
      expect(updateSurveyAdminSchema.parse({ title: 'Nuevo título' })).toEqual({
        title: 'Nuevo título',
      });
    });

    it('rechaza un formato de más de 30 caracteres', () => {
      expect(updateSurveyAdminSchema.safeParse({ format: 'x'.repeat(31) }).success).toBe(false);
    });
  });

  describe('surveyIdSchema', () => {
    it('acepta un UUID y rechaza otro texto', () => {
      expect(surveyIdSchema.safeParse('22222222-2222-4222-8222-222222222222').success).toBe(true);
      expect(surveyIdSchema.safeParse('encuesta-1').success).toBe(false);
    });
  });
});