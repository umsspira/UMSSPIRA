/// <reference types="jest" />

import {
  extractAccreditationFilters,
  getSemesterFromDate,
  parseSemester,
} from './accreditation-filters';

describe('accreditation-filters contracts and helpers (T3.1)', () => {
  describe('getSemesterFromDate (CA-02)', () => {
    it('calcula semestre 1 para fechas entre enero y junio en Bolivia', () => {
      // 15 de marzo de 2026
      const date = new Date('2026-03-15T12:00:00Z');
      expect(getSemesterFromDate(date)).toBe('1/2026');
    });

    it('calcula semestre 2 para fechas entre julio y diciembre en Bolivia', () => {
      // 10 de noviembre de 2026
      const date = new Date('2026-11-10T12:00:00Z');
      expect(getSemesterFromDate(date)).toBe('2/2026');
    });

    it('respeta la zona horaria de Bolivia (UTC-4) en los límites de mes', () => {
      // 1 de julio 03:59:59 UTC es 30 de junio 23:59:59 en Bolivia -> Semestre 1
      const endOfJuneInBolivia = new Date('2026-07-01T03:59:59Z');
      expect(getSemesterFromDate(endOfJuneInBolivia)).toBe('1/2026');

      // 1 de julio 04:00:00 UTC es 1 de julio 00:00:00 en Bolivia -> Semestre 2
      const startOfJulyInBolivia = new Date('2026-07-01T04:00:00Z');
      expect(getSemesterFromDate(startOfJulyInBolivia)).toBe('2/2026');
    });
  });

  describe('parseSemester', () => {
    it('normaliza formatos con barra o guión', () => {
      expect(parseSemester('1/2026')).toBe('1/2026');
      expect(parseSemester('2-2026')).toBe('2/2026');
      expect(parseSemester('  2/2025  ')).toBe('2/2025');
    });

    it('devuelve undefined para valores inválidos o vacíos', () => {
      expect(parseSemester(undefined)).toBeUndefined();
      expect(parseSemester('')).toBeUndefined();
      expect(parseSemester('3/2026')).toBeUndefined();
      expect(parseSemester('invalid')).toBeUndefined();
    });
  });

  describe('extractAccreditationFilters', () => {
    it('extrae cohorte y semestre en español', () => {
      const filters = extractAccreditationFilters({
        cohorte: 2023,
        semestre: '2-2026',
      });
      expect(filters).toEqual({
        cohort: 2023,
        semester: '2/2026',
      });
    });

    it('extrae cohorte y semestre en inglés como fallback', () => {
      const filters = extractAccreditationFilters({
        cohort: 2022,
        semester: '1/2025',
      });
      expect(filters).toEqual({
        cohort: 2022,
        semester: '1/2025',
      });
    });

    it('devuelve undefined si no hay filtros especificados', () => {
      expect(extractAccreditationFilters({})).toBeUndefined();
      expect(extractAccreditationFilters({ careerId: 'some-id' })).toBeUndefined();
    });
  });
});
