import { formatCareerName } from './format-career-name';

describe('formatCareerName', () => {
  it('corrige las variantes de Ingeniería Informática', () => {
    expect(formatCareerName('Ingeniera Informatica')).toBe('Ingeniería Informática');
    expect(formatCareerName('ingenieria informatica')).toBe('Ingeniería Informática');
    expect(formatCareerName('Ing. Informática')).toBe('Ingeniería Informática');
  });

  it('corrige las tildes de Ingeniería de Sistemas', () => {
    expect(formatCareerName('Ingenieria de Sistemas')).toBe('Ingeniería de Sistemas');
  });

  it('conserva los nombres que ya están correctos', () => {
    expect(formatCareerName('Ingeniería Informática')).toBe('Ingeniería Informática');
    expect(formatCareerName('Ingeniería de Sistemas')).toBe('Ingeniería de Sistemas');
  });

  it('no cambia las carreras desconocidas', () => {
    expect(formatCareerName('Medicina')).toBe('Medicina');
  });
});