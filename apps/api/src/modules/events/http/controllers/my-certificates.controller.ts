import { Controller, Get, Header, Req } from '@nestjs/common';

import type { AuthRequest } from '../../../../shared/http/auth/contracts/auth-request';
import { Roles } from '../../../../shared/http/auth/decorators/roles.decorator';
import { AccessError } from '../../../../shared/security/errors/access-error';
import { ListMyCertificatesService } from '../../application/list-my-certificates.service';

@Controller('certificates')
export class MyCertificatesController {
  constructor(
    private readonly listMyCertificatesService: ListMyCertificatesService,
  ) {}

  @Get('me')
  @Roles('titulado')
  @Header('Cache-Control', 'no-store')
  async listMyCertificates(@Req() request: AuthRequest) {
    const userId = request.auth?.actor.id;

    if (!userId) {
      throw new AccessError('UNAUTHENTICATED');
    }

    return this.listMyCertificatesService.execute(userId);
  }
}