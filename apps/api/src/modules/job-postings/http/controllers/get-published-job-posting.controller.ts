import { Controller, Get, Param } from '@nestjs/common';
import { CurrentActor } from '../../../../shared/http/auth/decorators/current-actor.decorator';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import { GetPublishedJobPostingUseCase } from '../../application/use-cases/get-published-job-posting.use-case';
import { presentPublishedJobPostingDetail } from '../presenters/published-job-posting.presenter';

@Controller('job-postings')
export class GetPublishedJobPostingController {
  constructor(private readonly useCase: GetPublishedJobPostingUseCase) {}

  @Get(':id')
  async get(
    @Param('id') id: string,
    @CurrentActor() actor: ActorContext,
  ) {
    return {
      data: presentPublishedJobPostingDetail(
        await this.useCase.execute(id, actor),
      ),
    };
  }
}
