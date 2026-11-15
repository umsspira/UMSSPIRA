import {
  normalizeInterestText,
  sanitizeInterestText,
  validateCustomInterestText,
} from './custom-interest.policy';
import { HttpError } from '../../../../shared/http/errors/http-error';

describe('CustomInterestPolicy', () => {
  describe('normalizeInterestText', () => {
    it('normalizes spaces, case, and diacritics', () => {
      expect(normalizeInterestText('  Inteligencia   ARTIFICIAL  ')).toBe('inteligencia artificial');
      expect(normalizeInterestText('Programación Dinámica')).toBe('programacion dinamica');
      expect(normalizeInterestText('Diseño UX/UI')).toBe('diseno ux/ui');
    });
  });

  describe('sanitizeInterestText', () => {
    it('trims and collapses whitespace without altering case or accents', () => {
      expect(sanitizeInterestText('  Vue.js   3.0  ')).toBe('Vue.js 3.0');
    });
  });

  describe('validateCustomInterestText', () => {
    it('accepts valid technical topics', () => {
      expect(validateCustomInterestText('NestJS + GraphQL')).toBe('NestJS + GraphQL');
      expect(validateCustomInterestText('C# / .NET Core')).toBe('C# / .NET Core');
      expect(validateCustomInterestText('Machine Learning')).toBe('Machine Learning');
      expect(validateCustomInterestText('Algoritmos (Grafos)')).toBe('Algoritmos (Grafos)');
    });

    it('rejects empty or whitespace-only strings (CAF-04)', () => {
      expect(() => validateCustomInterestText('')).toThrow(HttpError);
      expect(() => validateCustomInterestText('   ')).toThrow(HttpError);
      try {
        validateCustomInterestText('   ');
      } catch (err) {
        expect((err as HttpError).code).toBe('TEXTO_REQUERIDO');
        expect((err as HttpError).status).toBe(422);
      }
    });

    it('rejects strings shorter than 3 characters (CAF-05)', () => {
      expect(() => validateCustomInterestText('ab')).toThrow(HttpError);
      try {
        validateCustomInterestText('ab');
      } catch (err) {
        expect((err as HttpError).code).toBe('LONGITUD_INVALIDA');
        expect((err as HttpError).status).toBe(422);
      }
    });

    it('rejects strings longer than 50 characters (CAF-05)', () => {
      const longText = 'A'.repeat(51);
      expect(() => validateCustomInterestText(longText)).toThrow(HttpError);
      try {
        validateCustomInterestText(longText);
      } catch (err) {
        expect((err as HttpError).code).toBe('LONGITUD_INVALIDA');
        expect((err as HttpError).status).toBe(422);
      }
    });

    it('rejects HTML tags and scripts (CAF-11, CANF-06)', () => {
      expect(() => validateCustomInterestText('<script>alert(1)</script>')).toThrow(HttpError);
      expect(() => validateCustomInterestText('<b>Frontend</b>')).toThrow(HttpError);
      expect(() => validateCustomInterestText('javascript:void(0)')).toThrow(HttpError);
    });

    it('rejects SQL injection snippets (CAF-11, CANF-06)', () => {
      expect(() => validateCustomInterestText("test'; DROP TABLE mentor;--")).toThrow(HttpError);
      expect(() => validateCustomInterestText('foo; select * from user')).toThrow(HttpError);
    });

    it('rejects only symbols or unallowed characters (CAF-11)', () => {
      expect(() => validateCustomInterestText('???!!!')).toThrow(HttpError);
      expect(() => validateCustomInterestText('+-//()')).toThrow(HttpError);
      expect(() => validateCustomInterestText('hack$$$@*')).toThrow(HttpError);
    });

    it('rejects offensive / profanity words (CANF-12)', () => {
      expect(() => validateCustomInterestText('Experto en mierda')).toThrow(HttpError);
      try {
        validateCustomInterestText('Experto en mierda');
      } catch (err) {
        expect((err as HttpError).code).toBe('CONTENIDO_NO_PERMITIDO');
        expect((err as HttpError).status).toBe(422);
      }
    });
  });
});
