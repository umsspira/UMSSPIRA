import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('aplicación con Supabase deshabilitado (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    process.env.SUPABASE_ENABLED = 'false';
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    delete process.env.SUPABASE_ENABLED;
  });

  it('mantiene disponible HU5-S1-01 sin credenciales', async () => {
    await request(app.getHttpServer())
      .post('/vacantes/estructura/validar')
      .send({
        id: '11111111-1111-4111-8111-111111111111',
        titulo: 'Desarrollador Backend',
        idEmpresa: '22222222-2222-4222-8222-222222222222',
        estado: 'Publicada',
        requisitosTecnicos: {
          requerimientoLaboralIds: ['33333333-3333-4333-8333-333333333333'],
        },
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body.valida).toBe(true);
        expect(body.vacante.id).toBe('11111111-1111-4111-8111-111111111111');
      });
  });

  it('responde 503 en módulos que necesitan Supabase', async () => {
    await request(app.getHttpServer())
      .get('/carreras')
      .expect(503)
      .expect(({ body }) => {
        expect(body.message).toBe(
          'Supabase está deshabilitado en este entorno.',
        );
      });
  });
});
