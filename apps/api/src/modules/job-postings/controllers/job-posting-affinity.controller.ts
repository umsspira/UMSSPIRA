import {
  Controller,
  Get,
  Param,
  Query,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import type { VacancyAffinityResponse } from '@umsspira/shared-types';
import { JobPostingAffinityService } from '../services/job-posting-affinity.service';

@Controller('job-postings')
export class JobPostingAffinityController {
  constructor(private readonly affinityService: JobPostingAffinityService) {}

  @Get(':id/afinidad')
  async getAffinity(
    @Param('id') id: string,
    @Query('egresadoId') egresadoIdQuery?: string,
    @Headers('x-egresado-id') egresadoIdHeader?: string,
    @Query('simulateNlpFailure') simulateNlpFailure?: string,
  ): Promise<VacancyAffinityResponse> {
    const egresadoId = (egresadoIdQuery || egresadoIdHeader || '').trim();

    if (!egresadoId) {
      throw new BadRequestException(
        'Se requiere el identificador del egresado (egresadoId como parámetro de consulta o encabezado x-egresado-id)',
      );
    }

    const forceNlpFailure = simulateNlpFailure === 'true';

    return this.affinityService.calculateAffinity(id, egresadoId, {
      forceNlpFailure,
    });
  }
}
