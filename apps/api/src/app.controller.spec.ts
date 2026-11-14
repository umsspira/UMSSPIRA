import { AppController } from './app.controller';
import { SupabaseService } from './config/supabase.service';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('AppController', () => {
  let appController: AppController;
  let fakeSupabaseService: Partial<SupabaseService>;

  beforeEach(() => {
    const fakeSupabaseClient = {
      from: () => ({
        select: () => ({
          limit: () =>
            Promise.resolve({ data: [{ usuario_id: '1' }], error: null }),
        }),
      }),
    } as unknown as SupabaseClient;

    fakeSupabaseService = {
      getClient: () => fakeSupabaseClient,
    };
    appController = new AppController(fakeSupabaseService as SupabaseService);
  });

  describe('getHello', () => {
    it('should return backend running message', () => {
      expect(appController.getHello()).toBe('UMSSPIRA API funcionando');
    });
  });

  describe('testSupabase', () => {
    it('should report successful supabase connection', async () => {
      const result = await appController.testSupabase();
      expect(result.conectado).toBe(true);
      expect(result.mensaje).toBe('Conexión con Supabase exitosa');
    });
  });
});