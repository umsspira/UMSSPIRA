import { Body, Controller, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { ZodValidationPipe } from '../../../../shared/http/pipes/zod-validation.pipe';
import { StatusQueryService } from '../../application/services/status-query.service';
import { PublicRegistration } from '../decorators/public-registration.decorator';
import { RegistrationTrafficGuard } from '../guards/registration-traffic.guard';
import { statusQuerySchema, type StatusQueryBody } from '../schemas/status-query.schema';

@Controller('registrations')
export class StatusQueryController {
  constructor(private readonly service: StatusQueryService) {}

  // Siempre 202 con el mismo mensaje, exista o no una solicitud (CA-18.2).
  @Post('status-query')
  @PublicRegistration()
  @UseGuards(RegistrationTrafficGuard)
  @HttpCode(HttpStatus.ACCEPTED)
  async handle(
    @Body(new ZodValidationPipe(statusQuerySchema)) body: StatusQueryBody,
    @Req() request: { ip?: string },
  ) {
    return {
      data: await this.service.execute({ email: body.email, origin: request.ip ?? 'desconocido' }),
    };
  }
}