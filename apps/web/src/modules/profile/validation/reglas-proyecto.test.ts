import { MENSAJE_ENLACE_PROYECTO, validarEnlaceProyecto } from './reglas-proyecto';

describe('validarEnlaceProyecto (T19.3)', () => {
  it.each(['https://github.com/ana/inventario', 'https://ana.dev', '  https://ana.dev/portafolio  '])(
    'acepta %s',
    (enlace) => {
      expect(validarEnlaceProyecto(enlace)).toBeUndefined();
    },
  );

  it.each(['http://ana.dev', 'ana.dev', 'www.ana.dev', 'https://', 'https://ana dev', 'ftp://ana.dev'])(
    'rechaza %s',
    (enlace) => {
      expect(validarEnlaceProyecto(enlace)).toBe(MENSAJE_ENLACE_PROYECTO);
    },
  );
});
