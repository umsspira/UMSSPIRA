import { ServiceUnavailableException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface VacancyIndexDocument {
  id: string;
  titulo: string | null;
  modalidad: string | null;
  nivel_experiencia: string | null;
  descripcion_tecnica: string | null;
  estado: string | null;
  fecha_actualizacion: Date | null;
  requisitos_tecnicos: Array<{ nombre: string; nivel: string | null }>;
  ubicaciones: string[];
}

@Injectable()
export class VacancySearchIndexerService {
  constructor(private readonly config: ConfigService) {}

  assertConfigured(): void {
    this.getBaseUrl();
  }

  async upsert(document: VacancyIndexDocument): Promise<void> {
    const baseUrl = this.getBaseUrl();
    const index = this.config.get<string>('ELASTICSEARCH_INDEX', 'vacantes');

    const endpoint = new URL(
      `${index}/_doc/${encodeURIComponent(document.id)}?refresh=wait_for`,
      `${baseUrl.replace(/\/+$/, '')}/`,
    );
    const apiKey = this.config.get<string>('ELASTICSEARCH_API_KEY');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) {
      headers.Authorization = `ApiKey ${apiKey}`;
    }

    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: 'PUT',
        headers,
        body: JSON.stringify(document),
        signal: AbortSignal.timeout(10_000),
      });
    } catch (error) {
      throw new ServiceUnavailableException(
        'No se pudo sincronizar la vacante con el índice. La actualización puede reintentarse.',
        { cause: error },
      );
    }

    if (!response.ok) {
      throw new ServiceUnavailableException(
        'El índice rechazó la actualización de la vacante. La actualización puede reintentarse.',
      );
    }
  }

  private getBaseUrl(): string {
    const baseUrl = this.config.get<string>('ELASTICSEARCH_URL');
    if (!baseUrl) {
      throw new ServiceUnavailableException('El índice de vacantes no está configurado.');
    }
    return baseUrl;
  }
}
