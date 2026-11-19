import { Controller, Get, Param } from '@nestjs/common';
import { ZodValidationPipe } from '../../../../shared/http/pipes/zod-validation.pipe';
import { GetAvailableJobPostingUseCase } from '../../application/use-cases/get-available-job-posting.use-case';
import { jobPostingIdSchema } from '../schemas/job-postings.schemas';
import { presentAvailableJobPostingDetail } from '../presenters/available-job-posting.presenter';

@Controller('job-postings')
export class GetAvailableJobPostingController {
  constructor(private readonly useCase: GetAvailableJobPostingUseCase) {}

  @Get(':id')
  async get(
    @Param('id', new ZodValidationPipe(jobPostingIdSchema)) id: string,
  ) {
    const posting = await this.useCase.execute(id);
    return { data: presentAvailableJobPostingDetail(posting) };
  }
}
