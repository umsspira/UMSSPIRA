import { Controller, Get } from '@nestjs/common';
import { RequirePermissions } from '../../../../shared/http/auth/decorators/require-permissions.decorator';
import { GetUnmappedKeywordsSummaryUseCase } from '../../application/use-cases/get-unmapped-keywords-summary.use-case';

@Controller('radar/unmapped-keywords')
export class GetUnmappedKeywordsSummaryController {
  constructor(
    private readonly getUnmappedKeywordsSummaryUseCase: GetUnmappedKeywordsSummaryUseCase,
  ) {}

  @Get()
  @RequirePermissions('reportes:read')
  async getUnmappedKeywordsSummary() {
    const summary = await this.getUnmappedKeywordsSummaryUseCase.execute();

    return {
      data: {
        dictionaryVersion: summary.dictionaryVersion,
        totalTerms: summary.totalTerms,
        items: summary.items.map((item) => ({
          term: item.term,
          totalFrequency: item.totalFrequency,
          graduatesCount: item.graduatesCount,
          lastDetectedAt: item.lastDetectedAt ? item.lastDetectedAt.toISOString() : null,
        })),
      },
    };
  }
}