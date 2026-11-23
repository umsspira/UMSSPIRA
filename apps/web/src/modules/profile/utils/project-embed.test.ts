import { canTryEmbed, framingBlockedByHeaders, isHttpsUrl, isKnownNonEmbeddable, isPrivateAddress } from './project-embed';

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

describe('cabeceras que impiden mostrar el sitio (HU-20)', () => {
  const APP = 'https://umsspira.vercel.app';

  it('X-Frame-Options DENY o SAMEORIGIN bloquean', () => {
    expect(framingBlockedByHeaders('DENY', null, APP)).toBe(true);
    expect(framingBlockedByHeaders('sameorigin', null, APP)).toBe(true);
  });

  it('frame-ancestors sin nuestro origen bloquea; con * o con nuestro dominio no', () => {
    expect(framingBlockedByHeaders(null, "default-src 'self'; frame-ancestors 'self'", APP)).toBe(true);
    expect(framingBlockedByHeaders(null, "frame-ancestors 'none'", APP)).toBe(true);
    expect(framingBlockedByHeaders(null, 'frame-ancestors *', APP)).toBe(false);
    expect(framingBlockedByHeaders(null, 'frame-ancestors https://*.vercel.app', APP)).toBe(false);
    expect(framingBlockedByHeaders(null, 'frame-ancestors https://umsspira.vercel.app', APP)).toBe(false);
  });

  it('sin cabeceras de protección se deja mostrar', () => {
    expect(framingBlockedByHeaders(null, null, APP)).toBe(false);
    expect(framingBlockedByHeaders(null, "default-src 'self'", APP)).toBe(false);
  });
});

describe('direcciones internas (HU-20)', () => {
  it('reconoce localhost, red privada y enlace local', () => {
    for (const ip of ['127.0.0.1', '10.0.0.5', '172.16.3.1', '192.168.1.10', '169.254.169.254', '::1', 'fd00::1', '::ffff:127.0.0.1']) {
      expect(isPrivateAddress(ip)).toBe(true);
    }
  });

  it('deja pasar direcciones públicas', () => {
    expect(isPrivateAddress('8.8.8.8')).toBe(false);
    expect(isPrivateAddress('2606:4700::1111')).toBe(false);
  });
});
