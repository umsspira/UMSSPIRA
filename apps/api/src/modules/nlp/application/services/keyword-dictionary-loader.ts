import { Inject, Injectable, Logger } from '@nestjs/common';
import { NlpDictionaryUnavailableError } from '../../domain/errors/nlp-dictionary-unavailable-error';
import type { DictionaryEntry } from '../../domain/entities/dictionary-entry';
import {
  KEYWORD_DICTIONARY_PORT,
  type KeywordDictionaryPort,
} from '../ports/keyword-dictionary.port';
import { KeywordExtractorService } from './keyword-extractor.service';

const MAX_LOGGED_IGNORED_KEYS = 10;

/**
 * Carga el diccionario en la primera petición y reintenta en la siguiente si falla.
 * Una carga concurrente comparte la misma promesa. El calentamiento no es bloqueante.
 */
@Injectable()
export class KeywordDictionaryLoader {
  private readonly logger = new Logger(KeywordDictionaryLoader.name);
  private loaded = false;
  private loading: Promise<void> | null = null;

  constructor(
    @Inject(KEYWORD_DICTIONARY_PORT)
    private readonly source: KeywordDictionaryPort,
    private readonly extractor: KeywordExtractorService,
  ) {}

  async ensureLoaded(): Promise<void> {
    if (this.loaded) {
      return;
    }

    this.loading ??= this.reload();

    try {
      await this.loading;
    } finally {
      this.loading = null;
    }
  }

  /** Intento de precarga al arrancar. Nunca interrumpe el arranque de la API. */
  async warmUp(): Promise<void> {
    try {
      await this.ensureLoaded();
    } catch {
      this.logger.warn(
        'No se pudo precargar el diccionario NLP; se reintentará en la primera petición',
      );
    }
  }

  private async reload(): Promise<void> {
    let entries: DictionaryEntry[];

    try {
      entries = await this.source.load();
    } catch (error) {
      const name = error instanceof Error ? error.name : 'ErrorDesconocido';
      this.logger.warn(`No se pudo cargar el diccionario NLP (${name})`);
      throw this.unavailable();
    }

    if (entries.length === 0) {
      throw this.unavailable();
    }

    const report = this.extractor.loadDictionary(entries);

    // MUEVE EL LOGGING AQUÍ: Registramos las advertencias antes de validar si hubo palabras exitosas.
    if (report.ignored.length > 0) {
      const detail = report.ignored
        .slice(0, MAX_LOGGED_IGNORED_KEYS)
        .map(({ key, reason }) => `${key || '<vacío>'}:${reason}`)
        .join(', ');
      const suffix = report.ignored.length > MAX_LOGGED_IGNORED_KEYS ? ', ...' : '';

      this.logger.warn(
        `Diccionario NLP: ${report.ignored.length} claves ignoradas (${detail}${suffix})`,
      );
    }

    // AHORA SÍ validamos y lanzamos el error si no cargó ninguna palabra válida
    if (report.loaded === 0) {
      throw this.unavailable();
    }

    this.loaded = true;
  }

  private unavailable(): NlpDictionaryUnavailableError {
    return new NlpDictionaryUnavailableError();
  }
}
