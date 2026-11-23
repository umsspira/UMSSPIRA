import { Injectable } from '@nestjs/common';
import { KeywordDictionaryLoader } from '../../../nlp/application/services/keyword-dictionary-loader';
import { KeywordExtractorService } from '../../../nlp/application/services/keyword-extractor.service';
import { NlpDictionaryUnavailableError } from '../../../nlp/domain/errors/nlp-dictionary-unavailable-error';
import type { JobPostingAffinityExtractorPort } from '../../application/ports/job-posting-affinity-extractor.port';
import { AffinityDictionaryUnavailableError } from '../../domain/errors/affinity-dictionary-unavailable.error';
import type { KeywordExtractor } from '../../domain/policies/requirement-similarity';

@Injectable()
export class NlpJobPostingAffinityAdapter implements JobPostingAffinityExtractorPort {
  constructor(
    private readonly dictionary: KeywordDictionaryLoader,
    private readonly extractor: KeywordExtractorService,
  ) {}

  // HU-11: el motor recibe el extractor ya cargado para procesar con el mismo diccionario
  // el perfil (campo por campo) y los requisitos de la vacante
  async loadExtractor(): Promise<KeywordExtractor> {
    try {
      await this.dictionary.ensureLoaded();
    } catch (error) {
      if (error instanceof NlpDictionaryUnavailableError) {
        throw new AffinityDictionaryUnavailableError();
      }
      throw error;
    }
    return this.extractor;
  }
}
