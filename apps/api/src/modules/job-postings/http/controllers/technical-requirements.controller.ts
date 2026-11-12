import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { GetTechnicalRequirementsUseCase } from '../../application/use-cases/get-technical-requirements.use-case';

// Uses the same global AuthenticationGuard and PermissionsGuard as HU12 reads.
@Controller('job-postings')
export class TechnicalRequirementsController {
  constructor(private readonly useCase: GetTechnicalRequirementsUseCase) {}

  @Get(':id/requisitos')
  getRequirements(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.useCase.execute(id);
  }
}
