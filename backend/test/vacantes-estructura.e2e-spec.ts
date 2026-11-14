import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { VacantesModule } from '../src/modules/vacantes/vacantes.module';

describe('HU5-S1-01 estructura de vacantes (e2e)', () => {
  let app: INestApplication<App>;

  const vacanteValida = {
    id: '11111111-1111-4111-8111-111111111111',
    titulo: '  Desarrollador Backend  ',
    idEmpresa: '22222222-2222-4222-8222-222222222222',
    estado: '  Publicada  ',
    requisitosTecnicos: {
      requerimientoLaboralIds: ['33333333-3333-4333-8333-333333333333'],
    },
  };

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [VacantesModule],
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
  });

  it('CA1 y CA3: representa una vacante válida con los datos mínimos', async () => {
    const response = await request(app.getHttpServer())
      .post('/vacantes/estructura/validar')
      .send(vacanteValida)
      .expect(200);

    expect(response.body).toEqual({
      valida: true,
      vacante: {
        ...vacanteValida,
        titulo: 'Desarrollador Backend',
        estado: 'Publicada',
      },
    });
  });

  it('CA2: conserva identificadores distintos', async () => {
    const segundoId = '44444444-4444-4444-8444-444444444444';
    const primera = await request(app.getHttpServer())
      .post('/vacantes/estructura/validar')
      .send(vacanteValida)
      .expect(200);
    const segunda = await request(app.getHttpServer())
      .post('/vacantes/estructura/validar')
      .send({ ...vacanteValida, id: segundoId })
      .expect(200);

    expect(primera.body.vacante.id).toBe(vacanteValida.id);
    expect(segunda.body.vacante.id).toBe(segundoId);
    expect(primera.body.vacante.id).not.toBe(segunda.body.vacante.id);
  });

  it('CA4: rechaza tipos, UUID y longitudes incompatibles', async () => {
    const response = await request(app.getHttpServer())
      .post('/vacantes/estructura/validar')
      .send({
        ...vacanteValida,
        id: 'no-es-uuid',
        idEmpresa: 42,
        estado: 'x'.repeat(31),
        requisitosTecnicos: {
          requerimientoLaboralIds: ['referencia-invalida'],
        },
      })
      .expect(400);

    expect(response.body.message).toEqual(
      expect.arrayContaining([
        'id debe ser un UUID válido.',
        'idEmpresa debe ser un UUID válido.',
        'estado no puede superar los 30 caracteres.',
        'requisitosTecnicos.Cada elemento de requisitosTecnicos.requerimientoLaboralIds debe ser un UUID válido.',
      ]),
    );
  });

  it('CA5: identifica la ausencia del título obligatorio', async () => {
    const sinTitulo = { ...vacanteValida } as Record<string, unknown>;
    delete sinTitulo.titulo;
    const response = await request(app.getHttpServer())
      .post('/vacantes/estructura/validar')
      .send(sinTitulo)
      .expect(400);

    expect(response.body.message).toContain('titulo es obligatorio.');
  });

  it('CA5: identifica una referencia de empresa inválida', async () => {
    const response = await request(app.getHttpServer())
      .post('/vacantes/estructura/validar')
      .send({ ...vacanteValida, idEmpresa: 'empresa-invalida' })
      .expect(400);

    expect(response.body.message).toContain(
      'idEmpresa debe ser un UUID válido.',
    );
  });

  it('rechaza campos ajenos al contrato', async () => {
    const response = await request(app.getHttpServer())
      .post('/vacantes/estructura/validar')
      .send({ ...vacanteValida, persistir: true })
      .expect(400);

    expect(response.body.message).toContain(
      'property persistir should not exist',
    );
  });
});
