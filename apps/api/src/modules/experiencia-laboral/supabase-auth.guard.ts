import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { SupabaseService } from '../../config/supabase.service';
import { AuthenticatedRequest } from './authenticated-user';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(private readonly supabaseService: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    const token = authorization?.match(/^Bearer\s+(\S+)$/i)?.[1];

    if (!token) {
      throw new UnauthorizedException('Debes iniciar sesión para continuar.');
    }

    const { data, error } = await this.supabaseService
      .getClient()
      .auth.getUser(token);

    if (error || !data.user) {
      throw new UnauthorizedException('La sesión no es válida o ha expirado.');
    }

    const db = this.supabaseService.getAdminClient();
    const { data: usuario, error: usuarioError } = await db
      .from('usuario')
      .select('usuario_id, rol')
      .eq('auth_user_id', data.user.id)
      .maybeSingle();

    if (usuarioError) {
      throw new InternalServerErrorException(
        'No se pudo verificar la cuenta del usuario.',
      );
    }

    if (!usuario) {
      throw new ForbiddenException(
        'La cuenta autenticada no está vinculada a un usuario del portal.',
      );
    }

    const { data: egresado, error: egresadoError } = await db
      .from('egresado')
      .select('id')
      .eq('id_usuario', usuario.usuario_id)
      .maybeSingle();

    if (egresadoError) {
      throw new InternalServerErrorException(
        'No se pudo verificar el perfil del egresado.',
      );
    }

    if (!egresado) {
      throw new ForbiddenException(
        'La cuenta autenticada no tiene un perfil de egresado vinculado.',
      );
    }

    request.user = {
      authUserId: data.user.id,
      usuarioId: usuario.usuario_id,
      egresadoId: egresado.id,
      role: usuario.rol,
    };

    return true;
  }
}
