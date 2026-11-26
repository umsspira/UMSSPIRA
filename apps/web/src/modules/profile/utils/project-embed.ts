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

// Lee las cabeceras con que el sitio se protege de verse dentro de otra página (X-Frame-Options o CSP frame-ancestors).
// Si alguna lo impide para nuestro origen, el iframe solo mostraría la página de error del navegador.
export function framingBlockedByHeaders(xFrameOptions: string | null, csp: string | null, appOrigin: string): boolean {
  const xfo = xFrameOptions?.trim().toLowerCase() ?? '';
  if (xfo.startsWith('deny') || xfo.startsWith('sameorigin') || xfo.startsWith('allow-from')) return true;
  const ancestors = (csp ?? '')
    .split(/[;,]/)
    .map((directive) => directive.trim().split(/\s+/))
    .find(([name]) => name?.toLowerCase() === 'frame-ancestors');
  if (!ancestors) return false;
  const sources = ancestors.slice(1).map((source) => source.toLowerCase());
  if (sources.includes('*')) return false;
  const { host, protocol } = new URL(appOrigin);
  return !sources.some((source) => {
    if (source === protocol) return true;
    const pattern = source.replace(/^https?:\/\//, '').replace(/\/$/, '');
    if (pattern.startsWith('*.')) return host.endsWith(pattern.slice(1));
    return pattern === host;
  });
}

// Direcciones internas a las que el servidor no debe ir a consultar (localhost, red privada, enlace local)
export function isPrivateAddress(address: string): boolean {
  const ip = address.toLowerCase().replace(/^::ffff:/, '');
  if (ip === '::1' || ip === '::' || ip.startsWith('fc') || ip.startsWith('fd') || ip.startsWith('fe80')) return true;
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) return false;
  const [a, b] = parts;
  return (
    a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224
  );
}
