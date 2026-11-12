// El enlace de un proyecto solo se acepta si es una dirección https que new URL puede leer (HU-19)
export function isValidProjectUrl(value: string): boolean {
  if (!value.startsWith('https://')) {
    return false;
  }
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname.length > 0;
  } catch {
    return false;
  }
}
