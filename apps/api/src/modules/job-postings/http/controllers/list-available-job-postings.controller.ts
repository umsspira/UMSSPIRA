import { Controller, Get } from '@nestjs/common';
import { ListAvailableJobPostingsUseCase } from '../../application/use-cases/list-available-job-postings.use-case';
import { presentAvailableJobPosting } from '../presenters/available-job-posting.presenter';

@Controller('job-postings')
export class ListAvailableJobPostingsController {
  constructor(private readonly useCase: ListAvailableJobPostingsUseCase) {}

  @Get()
  async list() {
    const postings = await this.useCase.execute();
    return { data: postings.map(presentAvailableJobPosting) };
  }
}
