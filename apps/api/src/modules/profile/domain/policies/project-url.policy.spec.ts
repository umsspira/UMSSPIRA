import { isValidProjectUrl } from './project-url.policy';

describe('Enlace de un proyecto (HU-19, T19.2)', () => {
  it.each(['https://github.com/ana/inventario', 'https://ana.dev', 'https://ejemplo.com/ruta?x=1'])(
    'acepta %s',
    (value) => {
      expect(isValidProjectUrl(value)).toBe(true);
    },
  );

  it.each(['http://ana.dev', 'ftp://ana.dev', 'ana.dev', 'https://', 'https:// con espacios', ''])(
    'rechaza %s',
    (value) => {
      expect(isValidProjectUrl(value)).toBe(false);
    },
  );
});
