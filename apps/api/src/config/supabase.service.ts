import {
  Inject,
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  SUPABASE_CLIENT,
  SUPABASE_DISABLED_MESSAGE,
} from './supabase.constants';

@Injectable()
export class SupabaseService {
  private adminClient?: SupabaseClient;

  constructor(
    @Inject(SUPABASE_CLIENT)
    private readonly supabase: SupabaseClient | null,
    private readonly configService: ConfigService,
  ) {}

  getClient(): SupabaseClient {
    if (!this.supabase) {
      throw new ServiceUnavailableException(SUPABASE_DISABLED_MESSAGE);
    }

    return this.supabase;
  }

  getAdminClient(): SupabaseClient {
    if (!this.supabase) {
      throw new ServiceUnavailableException(SUPABASE_DISABLED_MESSAGE);
    }

    if (this.adminClient) {
      return this.adminClient;
    }

    const url = this.configService.get<string>('SUPABASE_URL');
    const serviceRoleKey = this.configService.get<string>(
      'SUPABASE_SERVICE_ROLE_KEY',
    );

    if (!url || !serviceRoleKey) {
      throw new InternalServerErrorException(
        'El acceso seguro a la base de datos no está configurado.',
      );
    }

    this.adminClient = createClient(url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    return this.adminClient;
  }
}
