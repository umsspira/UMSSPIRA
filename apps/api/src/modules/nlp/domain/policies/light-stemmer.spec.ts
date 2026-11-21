import { stemToken, stemTokens } from './light-stemmer';

describe('stemToken (HU-11)', () => {
  it.each([
    ['bases', 'base'],
    ['redes', 'red'],
    ['automatizadas', 'automatizado'],
    ['relacionales', 'relacional'],
    ['aplicaciones', 'aplicacion'],
    ['datos', 'dato'],
    ['tests', 'testing'],
    ['tested', 'test'],
  ])('«%s» y «%s» comparten raíz', (left, right) => {
    expect(stemToken(left)).toBe(stemToken(right));
  });

  it.each(['sql', 'aws', 'c++', 'c#', 'node.js', 'k8s', 'css'])(
    'no toca tokens cortos, con símbolos o terminados en «ss»: %s',
    (token) => {
      expect(stemToken(token)).toBe(token);
    },
  );

  it('no junta tecnologías distintas', () => {
    expect(stemToken('java')).not.toBe(stemToken('javascript'));
    expect(stemToken('react')).not.toBe(stemToken('redes'));
  });

  it('stemTokens conserva el orden', () => {
    expect(stemTokens(['bases', 'de', 'datos'])).toEqual([
      stemToken('base'),
      'de',
      stemToken('dato'),
    ]);
  });
});
