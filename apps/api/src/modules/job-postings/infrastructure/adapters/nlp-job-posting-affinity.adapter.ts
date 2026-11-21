import { Injectable } from '@nestjs/common';
import { KeywordDictionaryLoader } from '../../../nlp/application/services/keyword-dictionary-loader';
import { KeywordExtractorService } from '../../../nlp/application/services/keyword-extractor.service';
import { NlpDictionaryUnavailableError } from '../../../nlp/domain/errors/nlp-dictionary-unavailable-error';
import type { JobPostingAffinityExtractorPort } from '../../application/ports/job-posting-affinity-extractor.port';
import { AffinityDictionaryUnavailableError } from '../../domain/errors/affinity-dictionary-unavailable.error';

@Injectable()
export class NlpJobPostingAffinityAdapter implements JobPostingAffinityExtractorPort {
  constructor(
    private readonly dictionary: KeywordDictionaryLoader,
    private readonly extractor: KeywordExtractorService,
  ) {}

  async extractSkills(texts: readonly string[]): Promise<string[]> {
    try {
      await this.dictionary.ensureLoaded();
    } catch (error) {
      if (error instanceof NlpDictionaryUnavailableError) {
        throw new AffinityDictionaryUnavailableError();
      }
      throw error;
    }
    // NLP segmenta por salto de línea: ningún n-grama cruza campos del perfil.
    return this.extractor.extract(texts.join('\n')).keywords.map((keyword) => keyword.term);
  }
}
