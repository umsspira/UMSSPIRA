import type { Vacancy } from '../../../../lib/api/vacantes';
import type {
  NivelEsperado,
  RequisitoTecnico,
  TipoRequisito,
} from '../../../../lib/vacancies/contracts';

export type RequisitoTecnicoEditable = {
  id?: string;
  competencia: string;
  nivel: NivelEsperado;
  tipo: TipoRequisito;
  descripcion?: string;
};

export type VacanteEditable = {
  id: string;
  nombre: string;
  estado: string;
  codigo: string;
  descripcion: string;
  requisitos: RequisitoTecnicoEditable[];
};

export type EstadoEdicion =
  | 'cargando'
  | 'inicial'
  | 'error'
  | 'pendiente'
  | 'guardando'
  | 'guardado';

export const DESCRIPCION_MAX_CARACTERES = 300;

export function crearVacanteEditable(
  vacancy: Vacancy,
  requirements: RequisitoTecnico[],
): VacanteEditable {
  return {
    id: vacancy.id,
    nombre: vacancy.titulo,
    estado: vacancy.estado,
    codigo: vacancy.id,
    descripcion: vacancy.descripcion,
    requisitos: requirements.map((requirement) => ({
      id: requirement.id,
      competencia: requirement.competencia,
      nivel: requirement.nivel,
      tipo: requirement.tipo,
      descripcion: requirement.descripcion,
    })),
  };
}

export function requisitoDuplicado(
  requisitos: RequisitoTecnicoEditable[],
  nombre: string,
): boolean {
  const normalizedName = canonicalName(nombre);
  return requisitos.some(
    (requirement) => canonicalName(requirement.competencia) === normalizedName,
  );
}

export function validarVacante(vacante: VacanteEditable): string | null {
  if (!vacante.nombre.trim()) {
    return 'El nombre del cargo es obligatorio.';
  }

  if (vacante.nombre.trim().length > 150) {
    return 'El nombre del cargo no puede superar los 150 caracteres.';
  }

  if (!vacante.descripcion.trim()) {
    return 'La descripción de la vacante es obligatoria.';
  }

  if (
    vacante.descripcion.trim().length < 20 ||
    vacante.descripcion.trim().length > DESCRIPCION_MAX_CARACTERES
  ) {
    return `La descripción debe tener entre 20 y ${DESCRIPCION_MAX_CARACTERES} caracteres.`;
  }

  if (!vacante.estado.trim()) {
    return 'Selecciona un estado para la vacante.';
  }

  if (vacante.requisitos.length === 0) {
    return 'La vacante debe tener al menos un requisito técnico.';
  }

  if (vacante.requisitos.length > 30) {
    return 'La vacante no puede tener más de 30 requisitos técnicos.';
  }

  if (vacante.requisitos.some((requirement) => requirement.competencia.trim().length < 2)) {
    return 'Cada requisito técnico debe tener al menos 2 caracteres.';
  }

  if (
    vacante.requisitos.some((requirement) => requirement.competencia.trim().length > 100)
  ) {
    return 'Cada requisito técnico puede tener como máximo 100 caracteres.';
  }

  if (
    new Set(
      vacante.requisitos.map((requirement) =>
        canonicalName(requirement.competencia),
      ),
    ).size !== vacante.requisitos.length
  ) {
    return 'No se permiten requisitos técnicos duplicados.';
  }

  return null;
}

export function vacanteTieneCambios(
  vacante: VacanteEditable | null,
  original: VacanteEditable | null,
): boolean {
  return (
    vacante !== null &&
    original !== null &&
    JSON.stringify(vacante) !== JSON.stringify(original)
  );
}

function canonicalName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}
