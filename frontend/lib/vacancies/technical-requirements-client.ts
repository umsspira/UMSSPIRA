import type {
  EstructuraIndexacionVacante,
  RequisitoTecnico,
} from './contracts';

export const LOCAL_STORAGE_REQUISITOS_KEY = 'umsspira-vacante-requisitos';
const DEFAULT_API_URL =
  process.env.NODE_ENV === 'production'
    ? 'https://backend-umsspira.vercel.app'
    : 'http://localhost:3001';

const BACKEND_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.trim() || DEFAULT_API_URL;

export class TechnicalRequirementsClient {
  constructor(private readonly baseUrl: string = BACKEND_BASE_URL) {}

  /**
   * Helper to canonicalize skill names for duplicate comparison
   */
  static canonicalName(name: string): string {
    return name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  /**
   * Reads all stored requirements from localStorage for all vacancies
   */
  static readAllLocalRequirements(): Record<string, RequisitoTecnico[]> {
    if (typeof window === 'undefined') return {};
    try {
      const saved = window.localStorage.getItem(LOCAL_STORAGE_REQUISITOS_KEY);
      if (!saved) return {};
      const parsed = JSON.parse(saved);
      return typeof parsed === 'object' && parsed !== null ? parsed : {};
    } catch {
      return {};
    }
  }

  /**
   * Saves requirements for a specific vacancy to localStorage
   */
  static saveLocalRequirements(
    idVacante: string,
    requirements: RequisitoTecnico[],
  ): void {
    if (typeof window === 'undefined') return;
    try {
      const all = TechnicalRequirementsClient.readAllLocalRequirements();
      all[idVacante] = requirements;
      window.localStorage.setItem(
        LOCAL_STORAGE_REQUISITOS_KEY,
        JSON.stringify(all),
      );

      // Also sync to general vacancies list if present in localStorage
      TechnicalRequirementsClient.syncWithStoredVacancies(
        idVacante,
        requirements,
      );
    } catch {
      // Storage access gracefully handled
    }
  }

  /**
   * Retrieves requirements for a specific vacancy from localStorage
   */
  static getLocalRequirements(idVacante: string): RequisitoTecnico[] {
    const all = TechnicalRequirementsClient.readAllLocalRequirements();
    return all[idVacante] ?? [];
  }

  /**
   * Synchronizes technical requirement titles to umsspira-vacantes so other views can display them
   */
  private static syncWithStoredVacancies(
    idVacante: string,
    requirements: RequisitoTecnico[],
  ): void {
    try {
      const vacanciesRaw = window.localStorage.getItem('umsspira-vacantes');
      if (!vacanciesRaw) return;
      const vacancies = JSON.parse(vacanciesRaw);
      if (!Array.isArray(vacancies)) return;

      const targetIndex = vacancies.findIndex(
        (v: { id: string | number }) => String(v.id) === idVacante,
      );
      if (targetIndex >= 0) {
        vacancies[targetIndex].requirements = requirements.map(
          (r) => `${r.competencia} ${r.nivel}`,
        );
        window.localStorage.setItem(
          'umsspira-vacantes',
          JSON.stringify(vacancies),
        );
      }
    } catch {
      // Best-effort sync
    }
  }

  /**
   * Associates technical requirements with the vacancy on the backend, falling back to local storage
   */
  async asociarRequisitos(
    idVacante: string,
    requisitos: Omit<RequisitoTecnico, 'id' | 'idVacante' | 'fechaCreacion'>[],
  ): Promise<RequisitoTecnico[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/vacantes/${encodeURIComponent(idVacante)}/requisitos`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requisitos }),
        },
      );

      if (response.ok) {
        const saved = (await response.json()) as RequisitoTecnico[];
        const currentLocal = TechnicalRequirementsClient.getLocalRequirements(idVacante);
        // Merge into local storage preserving unique items
        const merged = [...currentLocal];
        for (const item of saved) {
          if (!merged.some((m) => m.id === item.id)) {
            merged.push(item);
          }
        }
        TechnicalRequirementsClient.saveLocalRequirements(idVacante, merged);
        return saved;
      }

      if (response.status === 400) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || 'Error de validación al asociar los requisitos.',
        );
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('ya está asociado')) {
        throw err;
      }
      // If network fails, handle via local fallback
    }

    // Local fallback
    const current = TechnicalRequirementsClient.getLocalRequirements(idVacante);
    const existingKeys = new Set(
      current.map((r) => TechnicalRequirementsClient.canonicalName(r.competencia)),
    );

    const created: RequisitoTecnico[] = [];
    for (const req of requisitos) {
      const key = TechnicalRequirementsClient.canonicalName(req.competencia);
      if (existingKeys.has(key)) {
        throw new Error(
          `El requisito técnico '${req.competencia}' ya está asociado a esta vacante.`,
        );
      }
      existingKeys.add(key);

      const newItem: RequisitoTecnico = {
        id: `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        idVacante,
        competencia: req.competencia.trim(),
        nivel: req.nivel,
        tipo: req.tipo,
        descripcion: req.descripcion?.trim(),
        fechaCreacion: new Date().toISOString(),
      };
      created.push(newItem);
      current.push(newItem);
    }

    TechnicalRequirementsClient.saveLocalRequirements(idVacante, current);
    return created;
  }

  /**
   * Retrieves requirements from backend or local cache
   */
  async obtenerRequisitos(idVacante: string): Promise<RequisitoTecnico[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/vacantes/${encodeURIComponent(idVacante)}/requisitos`,
      );
      if (response.ok) {
        const data = (await response.json()) as RequisitoTecnico[];
        TechnicalRequirementsClient.saveLocalRequirements(idVacante, data);
        return data;
      }
    } catch {
      // Fall through to local cache
    }

    return TechnicalRequirementsClient.getLocalRequirements(idVacante);
  }

  /**
   * Retrieves matching index structure for a vacancy
   */
  async obtenerEstructuraMatching(
    idVacante: string,
  ): Promise<EstructuraIndexacionVacante | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/vacantes/${encodeURIComponent(idVacante)}/requisitos/matching`,
      );
      if (response.ok) {
        return (await response.json()) as EstructuraIndexacionVacante;
      }
    } catch {
      // Fall through
    }
    return null;
  }

  /**
   * Updates an existing requirement
   */
  async actualizarRequisito(
    idVacante: string,
    idRequisito: string,
    data: { nivel?: string; tipo?: string; descripcion?: string },
  ): Promise<RequisitoTecnico> {
    try {
      const response = await fetch(
        `${this.baseUrl}/vacantes/${encodeURIComponent(idVacante)}/requisitos/${encodeURIComponent(idRequisito)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        },
      );
      if (response.ok) {
        const updated = (await response.json()) as RequisitoTecnico;
        const current = TechnicalRequirementsClient.getLocalRequirements(idVacante);
        const next = current.map((item) =>
          item.id === idRequisito ? updated : item,
        );
        TechnicalRequirementsClient.saveLocalRequirements(idVacante, next);
        return updated;
      }
    } catch {
      // Fallback
    }

    const current = TechnicalRequirementsClient.getLocalRequirements(idVacante);
    const index = current.findIndex((item) => item.id === idRequisito);
    if (index === -1) {
      throw new Error('Requisito técnico no encontrado.');
    }

    const updated: RequisitoTecnico = {
      ...current[index],
      ...(data.nivel ? { nivel: data.nivel as RequisitoTecnico['nivel'] } : {}),
      ...(data.tipo ? { tipo: data.tipo as RequisitoTecnico['tipo'] } : {}),
      ...(data.descripcion !== undefined ? { descripcion: data.descripcion } : {}),
    };
    current[index] = updated;
    TechnicalRequirementsClient.saveLocalRequirements(idVacante, current);
    return updated;
  }

  /**
   * Deletes a requirement
   */
  async eliminarRequisito(
    idVacante: string,
    idRequisito: string,
  ): Promise<void> {
    try {
      await fetch(
        `${this.baseUrl}/vacantes/${encodeURIComponent(idVacante)}/requisitos/${encodeURIComponent(idRequisito)}`,
        { method: 'DELETE' },
      );
    } catch {
      // Fallback
    }

    const current = TechnicalRequirementsClient.getLocalRequirements(idVacante);
    const filtered = current.filter((item) => item.id !== idRequisito);
    TechnicalRequirementsClient.saveLocalRequirements(idVacante, filtered);
  }
}

export const technicalRequirementsClient = new TechnicalRequirementsClient();
