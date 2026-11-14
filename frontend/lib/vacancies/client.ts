import type {
  CanonicalVacancy,
  ValidateVacancyStructureRequest,
  ValidateVacancyStructureResponse,
} from "./contracts";

export const VACANCY_STRUCTURE_VALIDATION_PATH = "/vacantes/estructura/validar";

type Fetcher = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export interface VacancyStructureClientOptions {
  baseUrl?: string;
  fetcher?: Fetcher;
}

export class VacancyStructureApiError extends Error {
  constructor(
    public readonly details: string[],
    public readonly status?: number,
  ) {
    super(details.join(" "));
    this.name = "VacancyStructureApiError";
  }
}

export class VacancyStructureClient {
  private readonly baseUrl: string;
  private readonly fetcher: Fetcher;

  constructor(options: VacancyStructureClientOptions = {}) {
    const defaultApiUrl =
      process.env.NODE_ENV === 'production'
        ? 'https://backend-umsspira.vercel.app'
        : 'http://localhost:3001';

    this.baseUrl = normalizeBaseUrl(
      options.baseUrl ??
        process.env.NEXT_PUBLIC_API_URL?.trim() ??
        defaultApiUrl,
    );
    this.fetcher = options.fetcher ?? ((input, init) => fetch(input, init));
  }

  /**
   * Valida el contrato de HU1 sin crear ni actualizar una vacante.
   * La persistencia y su integración con pantallas corresponden a HU3.
   */
  async validate(
    vacancy: ValidateVacancyStructureRequest,
  ): Promise<ValidateVacancyStructureResponse> {
    let response: Response;

    try {
      response = await this.fetcher(
        `${this.baseUrl}${VACANCY_STRUCTURE_VALIDATION_PATH}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(vacancy),
        },
      );
    } catch {
      throw new VacancyStructureApiError([
        "No se pudo conectar con el backend de validación.",
      ]);
    }

    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const details = extractMessages(body);
      throw new VacancyStructureApiError(
        details.length > 0
          ? details
          : ["El backend rechazó la estructura de la vacante."],
        response.status,
      );
    }

    if (!isValidationResponse(body)) {
      throw new VacancyStructureApiError(
        ["El backend devolvió una respuesta de validación no reconocida."],
        response.status,
      );
    }

    return body;
  }
}

function normalizeBaseUrl(baseUrl: string): string {
  const normalized = baseUrl.trim().replace(/\/+$/, "");
  if (!normalized) {
    throw new Error("La URL del backend no puede estar vacía.");
  }

  return normalized;
}

function extractMessages(body: unknown): string[] {
  if (!isRecord(body)) return [];

  const { message } = body;
  if (Array.isArray(message)) {
    return message.filter((item): item is string => typeof item === "string");
  }

  return typeof message === "string" ? [message] : [];
}

function isValidationResponse(
  value: unknown,
): value is ValidateVacancyStructureResponse {
  return (
    isRecord(value) &&
    value.valida === true &&
    isCanonicalVacancy(value.vacante)
  );
}

function isCanonicalVacancy(value: unknown): value is CanonicalVacancy {
  if (!isRecord(value) || !isRecord(value.requisitosTecnicos)) return false;

  const requirementIds = value.requisitosTecnicos.requerimientoLaboralIds;
  return (
    typeof value.id === "string" &&
    typeof value.titulo === "string" &&
    typeof value.idEmpresa === "string" &&
    typeof value.estado === "string" &&
    Array.isArray(requirementIds) &&
    requirementIds.every((item) => typeof item === "string")
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
