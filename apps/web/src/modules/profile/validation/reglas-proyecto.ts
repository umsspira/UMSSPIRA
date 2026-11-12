// Reglas del formulario de proyectos (HU-19). Mismos límites y mensaje que el backend
export const MENSAJE_ENLACE_PROYECTO = 'Ingresa una dirección https válida';
export const LARGO_MAXIMO_NOMBRE_PROYECTO = 150;
export const LARGO_MAXIMO_DESCRIPCION_PROYECTO = 300;

// Enlace del proyecto: solo https:// y una URL que new URL pueda leer
export function validarEnlaceProyecto(enlace: string): string | undefined {
  const valor = enlace.trim();
  if (!valor.startsWith('https://')) return MENSAJE_ENLACE_PROYECTO;
  try {
    const url = new URL(valor);
    return url.protocol === 'https:' && url.hostname ? undefined : MENSAJE_ENLACE_PROYECTO;
  } catch {
    return MENSAJE_ENLACE_PROYECTO;
  }
}
