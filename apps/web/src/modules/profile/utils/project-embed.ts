// Reglas de la vista embebida de un proyecto (HU-20)

// Sitios que nunca se dejan mostrar dentro de otra página (X-Frame-Options o CSP)
export const NON_EMBEDDABLE_DOMAINS = ['github.com', 'gitlab.com', 'bitbucket.org', 'linkedin.com', 'google.com'];

// El navegador no avisa cuando bloquea un iframe: si no carga en este tiempo se trata como bloqueado
export const EMBED_TIMEOUT_MS = 4000;

// Solo se cargan dentro de la ventana los enlaces https válidos
export function isHttpsUrl(url: string): boolean {
  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
}

// Incluye los subdominios: gist.github.com también se bloquea
export function isKnownNonEmbeddable(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return NON_EMBEDDABLE_DOMAINS.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}

// Si el enlace no es https o es de un sitio que nunca se deja mostrar, no se intenta el iframe
export function canTryEmbed(url: string): boolean {
  return isHttpsUrl(url) && !isKnownNonEmbeddable(url);
}
