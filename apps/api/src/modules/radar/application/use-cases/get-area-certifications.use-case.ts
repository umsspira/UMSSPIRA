import { Inject, Injectable } from '@nestjs/common';
import type { AffinityArea, RadarCertificationEvidenceResponse } from '@umsspira/shared-types';
import { RADAR_AREA_IDS } from '../../domain/entities/radar-area';
import { calculateAreaAffinity } from '../../domain/policies/affinity-calculator';
import {
  RADAR_CERTIFICATION_READER_PORT,
  type RadarCertificationReaderPort,
} from '../ports/certification-reader.port';
import { KEYWORD_EXTRACTOR_PORT, type KeywordExtractorPort } from '../ports/keyword-extractor.port';
import {
  RADAR_AREA_WEIGHT_READER_PORT,
  type AreaWeightReaderPort,
} from '../ports/area-weight-reader.port';

@Injectable()
export class GetAreaCertificationsUseCase {
  constructor(
    @Inject(RADAR_CERTIFICATION_READER_PORT) private readonly reader: RadarCertificationReaderPort,
    @Inject(KEYWORD_EXTRACTOR_PORT) private readonly extractor: KeywordExtractorPort,
    @Inject(RADAR_AREA_WEIGHT_READER_PORT) private readonly areaWeightReader: AreaWeightReaderPort,
  ) {}

  async execute(
    graduateId: string,
    area: AffinityArea,
  ): Promise<RadarCertificationEvidenceResponse> {
    const sources = await this.reader.getCertifications(graduateId);
    if (sources.length === 0) {
      return { area, source: 'current-profile', certifications: [] };
    }
    const weights = (await this.areaWeightReader.getAreaWeights())[RADAR_AREA_IDS[area]] ?? [];
    const related = await Promise.all(
      sources.map(async (certification) => {
        const { keywords } = await this.extractor.extractFromTexts([
          certification.title,
          certification.issuer,
        ]);
        // Se evalúan todas las keywords, no solo el top 5 del radar global.
        const result = calculateAreaAffinity(keywords, weights);
        return result.puntaje > 0
          ? {
              ...certification,
              matchedKeywords: result.palabrasClaveTop.map((keyword) => keyword.keyword),
            }
          : null;
      }),
    );
    return {
      area,
      source: 'current-profile',
      certifications: related.filter((item): item is NonNullable<typeof item> => item !== null),
    };
  }
}
