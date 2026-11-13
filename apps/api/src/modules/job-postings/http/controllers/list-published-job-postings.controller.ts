import { Controller, Get } from '@nestjs/common';
import { ListPublishedJobPostingsUseCase } from '../../application/use-cases/list-published-job-postings.use-case';
import { presentPublishedJobPosting } from '../presenters/published-job-posting.presenter';

@Controller('job-postings')
export class ListPublishedJobPostingsController {
  constructor(private readonly useCase: ListPublishedJobPostingsUseCase) {}

  @Get()
  async list() {
    return {
      data: (await this.useCase.execute()).map(presentPublishedJobPosting),
    };
  }
}
