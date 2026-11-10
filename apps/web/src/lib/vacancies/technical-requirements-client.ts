import type {
  EstructuraIndexacionVacante,
  NivelEsperado,
  RequisitoTecnico,
  TipoRequisito,
} from './contracts';
import { apiUrl } from '../../shared/services/api-contract';
import { authenticatedFetch } from '../../shared/services/auth-session';

export class TechnicalRequirementsClient {
  private readonly baseUrl: string;

  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
  }

  private async requestRemote<T>(
    path: string,
    init?: RequestInit,
  ): Promise<T> {
    let response: Response;
    try {
      const url = this.baseUrl ? `${this.baseUrl}${path}` : apiUrl(path);
      response = await authenticatedFetch(url, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...init?.headers,
        },
        cache: 'no-store',
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw error;
      }
      throw new Error(
        'No se pudo conectar con el servicio de requisitos técnicos.',
      );
    }

    if (!response.ok) {
      const body: unknown = await response.json().catch(() => null);
      const message = isRecord(body) ? body.message : undefined;
      throw new Error(
        Array.isArray(message)
          ? message.filter((item): item is string => typeof item === 'string').join(' ')
          : typeof message === 'string'
            ? message
            : 'No se pudo actualizar los requisitos técnicos.',
      );
    }

    return (await response.json()) as T;
  }

  static canonicalName(name: string): string {
    return name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ');
  }

  async asociarRequisitos(
    idVacante: string,
    requisitos: Omit<RequisitoTecnico, 'id' | 'idVacante' | 'fechaCreacion'>[],
  ): Promise<RequisitoTecnico[]> {
    return this.asociarRequisitosRemotos(idVacante, requisitos);
  }

  async obtenerRequisitos(idVacante: string): Promise<RequisitoTecnico[]> {
    return this.obtenerRequisitosRemotos(idVacante);
  }

  async obtenerRequisitosRemotos(
    idVacante: string,
  ): Promise<RequisitoTecnico[]> {
    const requirements = await this.requestRemote<unknown>(
      `/api/v1/vacantes/${encodeURIComponent(idVacante)}/requisitos`,
    );
    if (
      !Array.isArray(requirements) ||
      !requirements.every(isTechnicalRequirement)
    ) {
      throw new Error(
        'El servicio devolvió requisitos técnicos con un formato no válido.',
      );
    }
    return requirements;
  }

  async obtenerEstructuraMatching(
    idVacante: string,
  ): Promise<EstructuraIndexacionVacante> {
    const structure = await this.requestRemote<unknown>(
      `/api/v1/vacantes/${encodeURIComponent(idVacante)}/requisitos/matching`,
    );
    if (!isMatchingStructure(structure)) {
      throw new Error(
        'El servicio devolvió una estructura de matching con un formato no válido.',
      );
    }
    return structure;
  }

  async actualizarRequisito(
    idVacante: string,
    idRequisito: string,
    data: {
      nivel?: NivelEsperado;
      tipo?: TipoRequisito;
      descripcion?: string;
    },
  ): Promise<RequisitoTecnico> {
    return this.actualizarRequisitoRemoto(idVacante, idRequisito, data);
  }

  async actualizarRequisitoRemoto(
    idVacante: string,
    idRequisito: string,
    data: {
      nivel?: NivelEsperado;
      tipo?: TipoRequisito;
      descripcion?: string;
    },
  ): Promise<RequisitoTecnico> {
    const requirement = await this.requestRemote<unknown>(
      `/api/v1/vacantes/${encodeURIComponent(idVacante)}/requisitos/${encodeURIComponent(idRequisito)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      },
    );
    if (!isTechnicalRequirement(requirement)) {
      throw new Error(
        'El servicio devolvió un requisito técnico con un formato no válido.',
      );
    }
    return requirement;
  }

  async asociarRequisitosRemotos(
    idVacante: string,
    requisitos: Omit<RequisitoTecnico, 'id' | 'idVacante' | 'fechaCreacion'>[],
  ): Promise<RequisitoTecnico[]> {
    const requirements = await this.requestRemote<unknown>(
      `/api/v1/vacantes/${encodeURIComponent(idVacante)}/requisitos`,
      {
        method: 'POST',
        body: JSON.stringify({ requisitos }),
      },
    );
    if (
      !Array.isArray(requirements) ||
      !requirements.every(isTechnicalRequirement)
    ) {
      throw new Error(
        'El servicio devolvió requisitos técnicos con un formato no válido.',
      );
    }
    return requirements;
  }

  async eliminarRequisito(
    idVacante: string,
    idRequisito: string,
  ): Promise<void> {
    return this.eliminarRequisitoRemoto(idVacante, idRequisito);
  }

  async eliminarRequisitoRemoto(
    idVacante: string,
    idRequisito: string,
  ): Promise<void> {
    await this.requestRemote<{ eliminado: true; id: string }>(
      `/api/v1/vacantes/${encodeURIComponent(idVacante)}/requisitos/${encodeURIComponent(idRequisito)}`,
      { method: 'DELETE' },
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isTechnicalRequirement(
  value: unknown,
): value is RequisitoTecnico {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.idVacante === 'string' &&
    typeof value.competencia === 'string' &&
    (value.nivel === 'Básico' ||
      value.nivel === 'Intermedio' ||
      value.nivel === 'Avanzado' ||
      value.nivel === 'Experto') &&
    (value.tipo === 'Obligatorio' || value.tipo === 'Deseable') &&
    (value.descripcion === undefined ||
      typeof value.descripcion === 'string') &&
    typeof value.fechaCreacion === 'string'
  );
}

function isMatchingStructure(
  value: unknown,
): value is EstructuraIndexacionVacante {
  if (!isRecord(value) || !isRecord(value.metadatosMatching)) return false;
  const metadata = value.metadatosMatching;
  const index = value.competenciasIndex;
  return (
    typeof value.idVacante === 'string' &&
    typeof value.totalRequisitos === 'number' &&
    Array.isArray(value.obligatorios) &&
    value.obligatorios.every(isTechnicalRequirement) &&
    Array.isArray(value.deseables) &&
    value.deseables.every(isTechnicalRequirement) &&
    isRecord(index) &&
    Object.values(index).every((item) => {
      if (!isRecord(item)) return false;
      return (
        typeof item.idRequisito === 'string' &&
        typeof item.competenciaOriginal === 'string' &&
        typeof item.nivelEsperado === 'string' &&
        typeof item.pesoNivel === 'number' &&
        (item.tipo === 'Obligatorio' || item.tipo === 'Deseable') &&
        typeof item.esObligatorio === 'boolean' &&
        (item.descripcion === undefined ||
          typeof item.descripcion === 'string')
      );
    }) &&
    typeof metadata.totalObligatorios === 'number' &&
    typeof metadata.totalDeseables === 'number' &&
    typeof metadata.requiereMatchingExacto === 'boolean' &&
    typeof metadata.versionMotor === 'string'
  );
}

export const technicalRequirementsClient = new TechnicalRequirementsClient();
