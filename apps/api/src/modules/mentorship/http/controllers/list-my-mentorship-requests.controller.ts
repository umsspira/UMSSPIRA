import { Controller, Get, Query } from '@nestjs/common';
import { CurrentActor } from '../../../../shared/http/auth/decorators/current-actor.decorator';
import { RequirePermissions } from '../../../../shared/http/auth/decorators/require-permissions.decorator';
import { ZodValidationPipe } from '../../../../shared/http/pipes/zod-validation.pipe';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import { ListMyMentorshipRequestsUseCase } from '../../application/use-cases/list-my-mentorship-requests.use-case';
import {
  myMentorshipRequestQuerySchema,
  type MyMentorshipRequestQueryParams,
} from '../schemas/my-mentorship-request-query.schema';
import { presentMyMentorshipRequest } from '../presenters/mentorship-request.presenter';

@Controller('mentorship/my-requests')
export class ListMyMentorshipRequestsController {
  constructor(private readonly useCase: ListMyMentorshipRequestsUseCase) {}

  @Get()
  @RequirePermissions('mentores:self:write')
  async list(
    @CurrentActor() actor: ActorContext,
    @Query(new ZodValidationPipe(myMentorshipRequestQuerySchema))
    query: MyMentorshipRequestQueryParams,
  ) {
    const result = await this.useCase.execute(actor, {
      status: query.estado,
      page: query.page,
      pageSize: query.pageSize,
    });
    return {
      data: result.items.map(presentMyMentorshipRequest),
      pagination: {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: result.totalPages,
      },
      counts: result.counts,
    };
  }
}
