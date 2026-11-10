import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createOptionalSupabaseClient } from './supabase.module';
import { SupabaseService } from './supabase.service';

describe('configuración opcional de Supabase', () => {
  it.each([undefined, '', 'false', ' FALSE ', false])(
    'no crea un cliente cuando SUPABASE_ENABLED es %p',
    (enabled) => {
      const config = new ConfigService({ SUPABASE_ENABLED: enabled });

      expect(createOptionalSupabaseClient(config)).toBeNull();
    },
  );

  it('exige la URL cuando Supabase está habilitado', () => {
    const config = new ConfigService({ SUPABASE_ENABLED: 'true' });

    expect(() => createOptionalSupabaseClient(config)).toThrow(
      'Configuration key "SUPABASE_URL" does not exist',
    );
  });

  it('exige la clave anónima cuando Supabase está habilitado', () => {
    const config = new ConfigService({
      SUPABASE_ENABLED: 'true',
      SUPABASE_URL: 'https://example.supabase.co',
    });

    expect(() => createOptionalSupabaseClient(config)).toThrow(
      'Configuration key "SUPABASE_ANON_KEY" does not exist',
    );
  });

  it('rechaza valores ambiguos para SUPABASE_ENABLED', () => {
    const config = new ConfigService({ SUPABASE_ENABLED: 'yes' });

    expect(() => createOptionalSupabaseClient(config)).toThrow(
      'SUPABASE_ENABLED debe ser true o false.',
    );
  });

  it('falla de forma controlada al solicitar clientes deshabilitados', () => {
    const service = new SupabaseService(null, new ConfigService());

    expect(() => service.getClient()).toThrow(ServiceUnavailableException);
    expect(() => service.getAdminClient()).toThrow(ServiceUnavailableException);
  });
});
