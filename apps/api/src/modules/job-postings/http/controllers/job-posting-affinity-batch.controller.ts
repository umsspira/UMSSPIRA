import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { CurrentActor } from '../../../../shared/http/auth/decorators/current-actor.decorator';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import { ZodValidationPipe } from '../../../../shared/http/pipes/zod-validation.pipe';
import { CalculateJobPostingAffinityBatch } from '../../application/use-cases/calculate-job-posting-affinity-batch.use-case';
import {
  jobPostingAffinityBatchSchema,
  type JobPostingAffinityBatchInput,
} from '../schemas/job-posting-affinity-batch.schema';


@Controller('affinity')
export class JobPostingAffinityBatchController {
  constructor(private readonly batch: CalculateJobPostingAffinityBatch) {}


  @Post('batch')
  @HttpCode(200)
  async calculate(
    @CurrentActor() actor: ActorContext,
    @Body(new ZodValidationPipe(jobPostingAffinityBatchSchema)) body: JobPostingAffinityBatchInput,
  ) {
    return this.batch.execute(actor, body);
  }
}
