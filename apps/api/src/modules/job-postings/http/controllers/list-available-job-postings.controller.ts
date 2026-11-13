import { Controller, Get } from '@nestjs/common';
import { CurrentActor } from '../../../../shared/http/auth/decorators/current-actor.decorator';
import { RequirePermissions } from '../../../../shared/http/auth/decorators/require-permissions.decorator';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import { ListAvailableJobPostingsUseCase } from '../../application/use-cases/list-available-job-postings.use-case';
import { presentAvailableJobPosting } from '../presenters/available-job-posting.presenter';

@Controller('job-postings')
export class ListAvailableJobPostingsController {
  constructor(private readonly useCase: ListAvailableJobPostingsUseCase) {}

  @Get()
  @RequirePermissions('vacantes:read')
  async list(@CurrentActor() actor: ActorContext) {
    const postings = await this.useCase.execute(actor);
    return { data: postings.map(presentAvailableJobPosting) };
  }
}
