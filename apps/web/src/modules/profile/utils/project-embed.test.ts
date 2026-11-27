import { canTryEmbed, isHttpsUrl, isKnownNonEmbeddable } from './project-embed';

describe('project-embed (HU-20)', () => {
  it('solo acepta enlaces https válidos', () => {
    expect(isHttpsUrl('https://mi-sitio.dev')).toBe(true);
    expect(isHttpsUrl('http://mi-sitio.dev')).toBe(false);
    expect(isHttpsUrl('javascript:alert(1)')).toBe(false);
    expect(isHttpsUrl('mi-sitio.dev')).toBe(false);
  });

  it('reconoce los sitios que nunca se dejan mostrar, incluidos sus subdominios', () => {
    expect(isKnownNonEmbeddable('https://github.com/g7/repo')).toBe(true);
    expect(isKnownNonEmbeddable('https://gist.github.com/abc')).toBe(true);
    expect(isKnownNonEmbeddable('https://www.linkedin.com/in/alguien')).toBe(true);
    expect(isKnownNonEmbeddable('https://notgithub.com')).toBe(false);
  });

  it('solo intenta el iframe con https y fuera de la lista', () => {
    expect(canTryEmbed('https://mi-sitio.dev')).toBe(true);
    expect(canTryEmbed('https://github.com/g7')).toBe(false);
    expect(canTryEmbed('http://mi-sitio.dev')).toBe(false);
  });
});
