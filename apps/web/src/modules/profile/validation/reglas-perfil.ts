// Reglas de validación del formulario de perfil (HU-02). Cada función devuelve el mensaje de error
// del criterio o undefined si el valor es válido, para mostrarlo junto al campo antes de agregar el registro.

import {
  BACKUP_FILE_MESSAGE,
  MAX_BACKUP_BYTES,
  validateBackupFile,
} from '@/modules/profile/utils/validate-backup-file';

export const MENSAJE_ANIO_EGRESO_FUTURO = 'El año de egreso no puede ser posterior al año actual';
export const MENSAJE_HASTA_ANTERIOR_A_DESDE = 'La fecha fin no puede ser anterior a la fecha inicio';
// HU-18: el respaldo acepta PDF o JPG; formato y tamaño comparten el mismo mensaje
export const MENSAJE_RESPALDO_FORMATO = BACKUP_FILE_MESSAGE;
export const MENSAJE_RESPALDO_TAMANIO = BACKUP_FILE_MESSAGE;
export const MENSAJE_FORMACION_DUPLICADA = 'La formación académica ya se encuentra registrada';

export const TAMANIO_MAXIMO_RESPALDO = MAX_BACKUP_BYTES;
// Fecha mínima de inicio y fin de una experiencia laboral (BUG-HU2-008); cambiar aquí si se acuerda otra
export const FECHA_MINIMA_EXPERIENCIA = '1950-01-01';
// Largo máximo de institución y título: el mismo que valida el DTO de formación del backend (T2.1)
export const LARGO_MAXIMO_FORMACION = 150;

// Año de egreso (AAAA): no puede ser mayor al año actual
export function validarAnioEgreso(anio: string): string | undefined {
  if (!/^\d{4}$/.test(anio)) return undefined;
  return Number(anio) > new Date().getFullYear() ? MENSAJE_ANIO_EGRESO_FUTURO : undefined;
}

type FormacionComparable = { institucion: string; titulo: string; anioEgreso: string | number };

// Ignora mayúsculas/minúsculas y espacios al inicio y al final
const normalizar = (texto: string) => texto.trim().toLowerCase();

// Duplicada = misma Institución + Título + Año de egreso que una ya registrada.
// Misma regla que esFormacionDuplicada del backend (apps/api/src/modules/perfil/validators/formacion-duplicada.ts).
export function validarFormacionDuplicada(
  nueva: FormacionComparable,
  existentes: FormacionComparable[],
): string | undefined {
  const duplicada = existentes.some(
    (guardada) =>
      normalizar(guardada.institucion) === normalizar(nueva.institucion) &&
      normalizar(guardada.titulo) === normalizar(nueva.titulo) &&
      Number(guardada.anioEgreso) === Number(nueva.anioEgreso),
  );
  return duplicada ? MENSAJE_FORMACION_DUPLICADA : undefined;
}

// Fechas AAAA-MM-DD de experiencia laboral: la fecha fin puede ser igual a la de inicio, pero no anterior.
// Sin alguna de las dos (por ejemplo, trabajo actual) no hay rango que validar.
export function validarRangoFechas(desde: string, hasta: string): string | undefined {
  if (!desde || !hasta) return undefined;
  return hasta < desde ? MENSAJE_HASTA_ANTERIOR_A_DESDE : undefined;
}

// PDF o JPG de hasta 5 MB (HU-18). Se conserva por compatibilidad con otras ramas;
// el código nuevo usa validateBackupFile de utils/validate-backup-file.ts
export function validarRespaldo(archivo: File): string | undefined {
  return validateBackupFile(archivo);
}

// Certificaciones (HU-08, T8.3): los 4 campos son obligatorios y el año va de 1980 al año actual
export const MENSAJE_CAMPO_OBLIGATORIO = 'Este campo es obligatorio';
export const MENSAJE_RESPALDO_OBLIGATORIO = 'Adjunta el respaldo de la certificación (PDF o JPG de hasta 5 MB)';
export const ANIO_MINIMO_CERTIFICACION = 1980;

export function mensajeAnioCertificacion(): string {
  return `El año debe estar entre ${ANIO_MINIMO_CERTIFICACION} y ${new Date().getFullYear()}`;
}

// Año de emisión (AAAA): obligatorio y dentro del rango
export function validarAnioCertificacion(anio: string): string | undefined {
  if (!anio.trim()) return MENSAJE_CAMPO_OBLIGATORIO;
  const numero = Number(anio);
  if (!/^\d{4}$/.test(anio) || numero < ANIO_MINIMO_CERTIFICACION || numero > new Date().getFullYear()) {
    return mensajeAnioCertificacion();
  }
  return undefined;
}

type CertificacionValidable = { nombre: string; entidadEmisora: string; anioEmision: string; respaldo: File | null };
export type ErroresCertificacion = Partial<Record<keyof CertificacionValidable, string>>;

// Devuelve un mensaje por cada campo con problema; un objeto vacío significa que se puede guardar
export function validarCertificacion(datos: CertificacionValidable): ErroresCertificacion {
  const errores: ErroresCertificacion = {};
  if (!datos.nombre.trim()) errores.nombre = MENSAJE_CAMPO_OBLIGATORIO;
  if (!datos.entidadEmisora.trim()) errores.entidadEmisora = MENSAJE_CAMPO_OBLIGATORIO;
  const errorAnio = validarAnioCertificacion(datos.anioEmision);
  if (errorAnio) errores.anioEmision = errorAnio;
  if (!datos.respaldo) errores.respaldo = MENSAJE_RESPALDO_OBLIGATORIO;
  else {
    const errorRespaldo = validateBackupFile(datos.respaldo);
    if (errorRespaldo) errores.respaldo = errorRespaldo;
  }
  return errores;
}

// Máximo 2 trabajos actuales (experiencia sin fecha fin), HU-21 CA-09: con 2 ya guardados,
// la casilla «Actualmente trabajo aquí» queda desactivada con este mensaje.
export const MAXIMO_TRABAJOS_ACTUALES = 2;
export const MENSAJE_MAXIMO_TRABAJOS_ACTUALES = 'Ya tienes dos trabajos actuales';

// otrosActuales = trabajos actuales ya guardados, sin contar el que se está editando
export function hasMaxCurrentJobs(otrosActuales: number): boolean {
  return otrosActuales >= MAXIMO_TRABAJOS_ACTUALES;
}

// HU-19 (T19.2): el enlace del proyecto tiene que ser una dirección https válida; la API aplica la misma regla
export const MENSAJE_ENLACE_PROYECTO = 'Ingresa un enlace válido que empiece con https://';
export const LARGO_MAXIMO_NOMBRE_PROYECTO = 150;
export const LARGO_MAXIMO_ENLACE_PROYECTO = 500;
export const LARGO_MAXIMO_DESCRIPCION_PROYECTO = 500;
export const LARGO_MAXIMO_TECNOLOGIAS_PROYECTO = 300;

export function validarEnlaceProyecto(enlace: string): string | undefined {
  try {
    return new URL(enlace.trim()).protocol === 'https:' ? undefined : MENSAJE_ENLACE_PROYECTO;
  } catch {
    return MENSAJE_ENLACE_PROYECTO;
  }
}
