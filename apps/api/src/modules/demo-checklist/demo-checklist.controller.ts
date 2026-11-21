import { Controller, Get } from '@nestjs/common';
import { Roles } from '../../shared/http/auth/decorators/roles.decorator';
import { DemoChecklistService } from './demo-checklist.service';

@Controller('demo')
export class DemoChecklistController {
  constructor(private readonly service: DemoChecklistService) {}

  /** HU-19: estado real del ambiente. Solo lectura; solo empresa y administrador. */
  @Get('checklist')
  @Roles('administrador', 'empresa')
  async checklist() {
    return { data: await this.service.ejecutar() };
  }
}
