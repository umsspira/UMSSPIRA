import { Controller, Post, Param, Req, Get } from '@nestjs/common';
import { GenerateEventPassService } from '../application/generate-event-pass.service';
import { ListUserPassesService } from '../application/list-user-passes.service';

interface RequestWithAuth {
  user?: { id?: string; sub?: string; userId?: string };
  headers?: { authorization?: string };
}

@Controller('registrations')
export class EventPassesController {
  constructor(
    private readonly generateEventPassService: GenerateEventPassService,
    private readonly listUserPassesService: ListUserPassesService,
  ) {}

  private extractUserId(req: RequestWithAuth): string {
    if (req.user?.id) {return req.user.id;}
    if (req.user?.sub) {return req.user.sub;}
    if (req.user?.userId) {return req.user.userId;}

    const authHeader = req.headers?.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.slice(7);
        const payload = JSON.parse(
          Buffer.from(token.split('.')[1], 'base64url').toString('utf8'),
        );
        if (payload.sub || payload.id || payload.userId) {
          return payload.sub || payload.id || payload.userId;
        }
      } catch {
        // Continúa al fallback si el token no se puede decodificar
      }
    }

    return '20000000-0000-4000-8000-000000000001';
  }

  // Ruta: POST /api/v1/registrations/:inscripcionId/pass
  @Post(':inscripcionId/pass')
  async generatePass(
    @Param('inscripcionId') inscripcionId: string,
    @Req() req: RequestWithAuth,
  ) {
    const usuarioTitularId = this.extractUserId(req);
    return this.generateEventPassService.execute(inscripcionId, usuarioTitularId);
  }

  // CA 5: Ruta para consultar los pases vigentes/vencidos
  @Get('my-passes')
  async listMyPasses(@Req() req: RequestWithAuth) {
    const usuarioTitularId = this.extractUserId(req);
    return this.listUserPassesService.execute(usuarioTitularId);
  }
}