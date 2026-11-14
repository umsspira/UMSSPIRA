import { Controller, Get } from '@nestjs/common';
import { SupabaseService } from './config/supabase.service';

@Controller()
export class AppController {
  constructor(private readonly supabaseService: SupabaseService) {}

  @Get()
  getHello(): string {
    return 'UMSSINSPIRA2 Backend funcionando';
  }

  @Get('supabase-test')
  async testSupabase() {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('usuario')
      .select('*')
      .limit(1);

    if (error) {
      return {
        conectado: false,
        error: error.message,
      };
    }

    return {
      conectado: true,
      mensaje: 'Conexión con Supabase exitosa',
      data,
    };
  }
}