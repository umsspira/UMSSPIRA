import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { GetPublishedJobPostingTechnicalRequirementsUseCase } from '../../application/use-cases/get-published-job-posting-technical-requirements.use-case';

// Uses the same global AuthenticationGuard and PermissionsGuard as HU12 reads.
@Controller('job-postings')
export class TechnicalRequirementsController {
  constructor(private readonly useCase: GetPublishedJobPostingTechnicalRequirementsUseCase) {}

  @Get(':id/requisitos')
  getRequirements(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.useCase.execute(id);
  }
}
