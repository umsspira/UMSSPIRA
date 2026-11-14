/// <reference types="jest" />

import { accreditationFilterSchema } from './reports.schemas';

describe('reports.schemas (T3.1)', () => {
  describe('accreditationFilterSchema', () => {
    it('valida query vacía correctamente', () => {
      const result = accreditationFilterSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({});
      }
    });

    it('coacciona cohorte válida de string a número y mapea a cohort', () => {
      const result = accreditationFilterSchema.safeParse({
        cohorte: '2023',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.cohort).toBe(2023);
      }
    });

    it('normaliza semestre de formato guión a barra y mapea a semester', () => {
      const result = accreditationFilterSchema.safeParse({
        semestre: '2-2026',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.semester).toBe('2/2026');
      }
    });

    it('valida careerId UUID en minúsculas', () => {
      const uuid = '10000000-0000-4000-8000-000000000001';
      const result = accreditationFilterSchema.safeParse({
        careerId: uuid.toUpperCase(),
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.careerId).toBe(uuid);
      }
    });

    it('rechaza cohorte con formato que no son 4 dígitos', () => {
      expect(accreditationFilterSchema.safeParse({ cohorte: '23' }).success).toBe(false);
      expect(accreditationFilterSchema.safeParse({ cohorte: 'no-numero' }).success).toBe(false);
    });

    it('rechaza formato de semestre inválido', () => {
      expect(accreditationFilterSchema.safeParse({ semestre: '3-2026' }).success).toBe(false);
      expect(accreditationFilterSchema.safeParse({ semestre: '1/2026' }).success).toBe(false);
      expect(accreditationFilterSchema.safeParse({ semestre: '2026-1' }).success).toBe(false);
      expect(accreditationFilterSchema.safeParse({ semestre: 'invalido' }).success).toBe(false);
    });

    it('rechaza campos desconocidos por ser strictObject', () => {
      const result = accreditationFilterSchema.safeParse({
        campoExtra: 'hack',
      });
      expect(result.success).toBe(false);
    });
  });
});
