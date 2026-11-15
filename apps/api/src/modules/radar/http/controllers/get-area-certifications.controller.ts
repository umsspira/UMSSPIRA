import { Controller, Get, Param, UseFilters } from '@nestjs/common';
import { z } from 'zod';
import { AFFINITY_AREAS } from '@umsspira/shared-types';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import { CurrentActor } from '../../../../shared/http/auth/decorators/current-actor.decorator';
import { RequirePermissions } from '../../../../shared/http/auth/decorators/require-permissions.decorator';
import { requireGraduateScope } from '../../application/services/graduate-scope';
import { GetAreaCertificationsUseCase } from '../../application/use-cases/get-area-certifications.use-case';
import { KeywordDictionaryUnavailableFilter } from '../filters/keyword-dictionary-unavailable.filter';

const areaSchema = z.enum(AFFINITY_AREAS);

@Controller('radar')
@UseFilters(KeywordDictionaryUnavailableFilter)
export class GetAreaCertificationsController {
  constructor(private readonly useCase: GetAreaCertificationsUseCase) {}

  @Get('certifications/:area')
  @RequirePermissions('radar:self:read')
  async get(@CurrentActor() actor: ActorContext, @Param('area') area: string) {
    const graduateId = requireGraduateScope(actor);
    return { data: await this.useCase.execute(graduateId, areaSchema.parse(area)) };
  }
}
