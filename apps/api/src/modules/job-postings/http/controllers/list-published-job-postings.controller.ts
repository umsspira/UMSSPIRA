import { Controller, Get, Query } from '@nestjs/common';
import { ZodValidationPipe } from '../../../../shared/http/pipes/zod-validation.pipe';
import { CurrentActor } from '../../../../shared/http/auth/decorators/current-actor.decorator';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import { ListPublishedJobPostingsUseCase } from '../../application/use-cases/list-published-job-postings.use-case';
import { presentPublishedJobPostingDetail } from '../presenters/published-job-posting.presenter';
import {
  listPublishedJobPostingsSchema,
  type ListPublishedJobPostingsQuery,
} from '../schemas/list-published-job-postings.schemas';

@Controller('job-postings')
export class ListPublishedJobPostingsController {
  constructor(private readonly useCase: ListPublishedJobPostingsUseCase) {}

  @Get()
  async list(
    @CurrentActor() actor: ActorContext,
    @Query(new ZodValidationPipe(listPublishedJobPostingsSchema))
    query: ListPublishedJobPostingsQuery,
  ) {
    return {
      data: (await this.useCase.execute(actor, query)).map(
        presentPublishedJobPostingDetail,
      ),
    };
  }
}
