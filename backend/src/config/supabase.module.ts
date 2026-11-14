import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from './supabase.constants';
import { SupabaseService } from './supabase.service';

export function createOptionalSupabaseClient(
  configService: ConfigService,
): SupabaseClient | null {
  const configuredValue = configService.get<string | boolean>(
    'SUPABASE_ENABLED',
  );
  const normalizedValue =
    typeof configuredValue === 'string'
      ? configuredValue.trim().toLowerCase()
      : configuredValue;

  if (
    normalizedValue === undefined ||
    normalizedValue === false ||
    normalizedValue === '' ||
    normalizedValue === 'false'
  ) {
    return null;
  }

  if (normalizedValue !== true && normalizedValue !== 'true') {
    throw new Error('SUPABASE_ENABLED debe ser true o false.');
  }

  return createClient(
    configService.getOrThrow<string>('SUPABASE_URL'),
    configService.getOrThrow<string>('SUPABASE_ANON_KEY'),
  );
}

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: SUPABASE_CLIENT,
      inject: [ConfigService],
      useFactory: createOptionalSupabaseClient,
    },
    SupabaseService,
  ],
  exports: [SupabaseService],
})
export class SupabaseModule {}
