import { Controller, Get } from '@nestjs/common';
import { CurrentActor } from '../../../../shared/http/auth/decorators/current-actor.decorator';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import { ListPublishedJobPostingsUseCase } from '../../application/use-cases/list-published-job-postings.use-case';
import { presentPublishedJobPostingDetail } from '../presenters/published-job-posting.presenter';

@Controller('job-postings')
export class ListPublishedJobPostingsController {
  constructor(private readonly useCase: ListPublishedJobPostingsUseCase) {}

  @Get()
  async list(@CurrentActor() actor: ActorContext) {
    return {
      data: (await this.useCase.execute(actor)).map(
        presentPublishedJobPostingDetail,
      ),
    };
  }
}
