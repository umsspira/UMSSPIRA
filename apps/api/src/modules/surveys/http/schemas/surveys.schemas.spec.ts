import { submitSurveySchema, SALARY_RANGES } from './surveys.schemas';

const respuestaCompleta = {
  condicion_laboral: true,
  cargo: 'Analista de sistemas',
  empresa: 'Jalasoft',
  area: 'Desarrollo de software',
  modalidad: 'Remoto',
  salario_mensual: '5.001–8.000',
  tiempo_insercion: '6',
};

describe('submitSurveySchema (Task 1.5 - Mejora 1.1)', () => {
  describe('Límites alineados con la base de datos', () => {
    it('acepta cargo con 150 caracteres y rechaza con 151', () => {
      const valid = submitSurveySchema.safeParse({ ...respuestaCompleta, cargo: 'a'.repeat(150) });
      expect(valid.success).toBe(true);

      const invalid = submitSurveySchema.safeParse({ ...respuestaCompleta, cargo: 'a'.repeat(151) });
      expect(invalid.success).toBe(false);
    });

    it('acepta empresa con 200 caracteres y rechaza con 201', () => {
      const valid = submitSurveySchema.safeParse({ ...respuestaCompleta, empresa: 'a'.repeat(200) });
      expect(valid.success).toBe(true);

      const invalid = submitSurveySchema.safeParse({ ...respuestaCompleta, empresa: 'a'.repeat(201) });
      expect(invalid.success).toBe(false);
    });

    it('acepta área con 150 caracteres y rechaza con 151', () => {
      const valid = submitSurveySchema.safeParse({ ...respuestaCompleta, area: 'a'.repeat(150) });
      expect(valid.success).toBe(true);

      const invalid = submitSurveySchema.safeParse({ ...respuestaCompleta, area: 'a'.repeat(151) });
      expect(invalid.success).toBe(false);
    });
  });

  describe('Validación de texto con contenido semántico (mínimo 2 letras)', () => {
    it.each([
      ['números sueltos', '12345'],
      ['símbolos especiales', '@@@@'],
      ['letra individual', 'A'],
      ['cero', '0'],
    ])('rechaza cargo con %s (%s)', (_, valorInvalido) => {
      const result = submitSurveySchema.safeParse({ ...respuestaCompleta, cargo: valorInvalido });
      expect(result.success).toBe(false);
    });

    it.each([
      ['números sueltos', '9999'],
      ['símbolos especiales', '###$$%'],
      ['letra individual', 'X'],
    ])('rechaza empresa con %s (%s)', (_, valorInvalido) => {
      const result = submitSurveySchema.safeParse({ ...respuestaCompleta, empresa: valorInvalido });
      expect(result.success).toBe(false);
    });

    it.each([
      ['números sueltos', '0'],
      ['símbolos especiales', '---'],
      ['letra individual', 'T'],
    ])('rechaza área con %s (%s)', (_, valorInvalido) => {
      const result = submitSurveySchema.safeParse({ ...respuestaCompleta, area: valorInvalido });
      expect(result.success).toBe(false);
    });

    it('acepta nombres con letras válidas combinadas con números o acentos', () => {
      const result = submitSurveySchema.safeParse({
        ...respuestaCompleta,
        cargo: 'QA Engineer 2',
        empresa: 'Tecnología Andina S.R.L.',
        area: 'I+D e Innovación',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Catálogo de modalidades', () => {
    it.each(['Presencial', 'Remoto', 'Híbrido'] as const)('acepta modalidad válida: %s', (modalidad) => {
      const result = submitSurveySchema.safeParse({ ...respuestaCompleta, modalidad });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.modalidad).toBe(modalidad);
      }
    });

    it('normaliza "Hibrido" sin tilde hacia "Híbrido"', () => {
      const result = submitSurveySchema.safeParse({ ...respuestaCompleta, modalidad: 'Hibrido' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.modalidad).toBe('Híbrido');
      }
    });

    it('rechaza modalidades no reconocidas', () => {
      const result = submitSurveySchema.safeParse({ ...respuestaCompleta, modalidad: 'Teletrabajo' });
      expect(result.success).toBe(false);
    });
  });

  describe('Catálogo de rangos de salario mensual', () => {
    it.each(SALARY_RANGES)('acepta rango oficial: %s', (rango) => {
      const result = submitSurveySchema.safeParse({ ...respuestaCompleta, salario_mensual: rango });
      expect(result.success).toBe(true);
    });

    it('acepta y normaliza rangos con guion estándar', () => {
      const result = submitSurveySchema.safeParse({ ...respuestaCompleta, salario_mensual: '5.001-8.000' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.salario_mensual).toBe('5.001–8.000');
      }
    });

    it('rechaza montos libres o textos arbitrarios', () => {
      const result = submitSurveySchema.safeParse({ ...respuestaCompleta, salario_mensual: '3500' });
      expect(result.success).toBe(false);
    });
  });

  describe('Validación de tiempo de inserción laboral', () => {
    it.each(['0', '3', '12', '48'])('acepta tiempo numérico en meses (%s)', (meses) => {
      const result = submitSurveySchema.safeParse({ ...respuestaCompleta, tiempo_insercion: meses });
      expect(result.success).toBe(true);
    });

    it.each(['seis meses', '3.5', '-1', 'inmediato'])('rechaza tiempo no numérico o negativo (%s)', (invalido) => {
      const result = submitSurveySchema.safeParse({ ...respuestaCompleta, tiempo_insercion: invalido });
      expect(result.success).toBe(false);
    });
  });

  describe('Condición laboral: No trabaja', () => {
    it('acepta condicion_laboral: false sin campos de trabajo', () => {
      const result = submitSurveySchema.safeParse({ condicion_laboral: false });
      expect(result.success).toBe(true);
    });

    it('rechaza si se envían campos laborales cuando condicion_laboral es false', () => {
      const result = submitSurveySchema.safeParse({
        condicion_laboral: false,
        cargo: 'Desarrollador',
      });
      expect(result.success).toBe(false);
    });
  });
});
