import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AuthenticatedRequest } from './authenticated-user';

@Injectable()
export class ExperienceWriteGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const role = request.user.role?.toLowerCase();

    if (role === 'lector') {
      throw new ForbiddenException(
        'El rol lector solo puede consultar experiencias laborales.',
      );
    }

    if (role !== 'admin' && role !== 'egresado') {
      throw new ForbiddenException(
        'El rol de la cuenta no tiene permisos para modificar experiencias laborales.',
      );
    }

    return true;
  }
}
