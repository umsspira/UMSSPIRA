import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { VacantesModule } from '../src/modules/vacantes/vacantes.module';

describe('HU5-S1-02 Requisitos Técnicos y Matching Index (e2e)', () => {
  let app: INestApplication<App>;

  const VACANTE_ID_A = '11111111-1111-4111-8111-111111111111';
  const VACANTE_ID_B = '22222222-2222-4222-8222-222222222222';

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

  it('Verificar la asociación de requisitos técnicos al identificador correcto', async () => {
    const response = await request(app.getHttpServer())
      .post(`/vacantes/${VACANTE_ID_A}/requisitos`)
      .send({
        requisitos: [
          {
            competencia: 'SQL',
            nivel: 'Avanzado',
            tipo: 'Obligatorio',
            descripcion: 'Dominio de consultas y modelado relacional.',
          },
        ],
      })
      .expect(201);

    expect(response.body).toHaveLength(1);
    expect(response.body[0].idVacante).toBe(VACANTE_ID_A);
    expect(response.body[0].competencia).toBe('SQL');
    expect(response.body[0].nivel).toBe('Avanzado');
    expect(response.body[0].tipo).toBe('Obligatorio');
    expect(response.body[0].descripcion).toBe(
      'Dominio de consultas y modelado relacional.',
    );
  });

  it('Verificar múltiples requisitos técnicos asociados a la misma vacante', async () => {
    const response = await request(app.getHttpServer())
      .post(`/vacantes/${VACANTE_ID_A}/requisitos`)
      .send({
        requisitos: [
          { competencia: 'Python', nivel: 'Intermedio', tipo: 'Obligatorio' },
          { competencia: 'Power BI', nivel: 'Intermedio', tipo: 'Obligatorio' },
          { competencia: 'Excel', nivel: 'Avanzado', tipo: 'Deseable' },
        ],
      })
      .expect(201);

    expect(response.body).toHaveLength(3);
    const nombres = response.body.map((r: { competencia: string }) => r.competencia);
    expect(nombres).toEqual(['Python', 'Power BI', 'Excel']);
  });

  it('Verificar la recuperación de requisitos asociados a la vacante', async () => {
    const response = await request(app.getHttpServer())
      .get(`/vacantes/${VACANTE_ID_A}/requisitos`)
      .expect(200);

    expect(response.body).toHaveLength(4);
    const nombres = response.body.map((r: { competencia: string }) => r.competencia);
    expect(nombres).toEqual(['SQL', 'Python', 'Power BI', 'Excel']);
  });

  it('Verificar el aislamiento entre vacantes', async () => {
    // Asociar requisitos a vacante B
    await request(app.getHttpServer())
      .post(`/vacantes/${VACANTE_ID_B}/requisitos`)
      .send({
        requisitos: [
          { competencia: 'Angular', nivel: 'Avanzado', tipo: 'Obligatorio' },
          { competencia: 'Node.js', nivel: 'Intermedio', tipo: 'Deseable' },
        ],
      })
      .expect(201);

    // Consultar vacante A
    const resA = await request(app.getHttpServer())
      .get(`/vacantes/${VACANTE_ID_A}/requisitos`)
      .expect(200);

    // Consultar vacante B
    const resB = await request(app.getHttpServer())
      .get(`/vacantes/${VACANTE_ID_B}/requisitos`)
      .expect(200);

    // Validar aislamiento
    const nombresA = resA.body.map((r: { competencia: string }) => r.competencia);
    const nombresB = resB.body.map((r: { competencia: string }) => r.competencia);

    expect(nombresA).not.toContain('Angular');
    expect(nombresA).not.toContain('Node.js');
    expect(nombresB).not.toContain('SQL');
    expect(nombresB).not.toContain('Python');
  });

  it('Verificar requisitos duplicados (evita duplicación dentro de la estructura)', async () => {
    // SQL ya fue agregado a VACANTE_ID_A previamente
    const response = await request(app.getHttpServer())
      .post(`/vacantes/${VACANTE_ID_A}/requisitos`)
      .send({
        requisitos: [
          { competencia: '  sql  ', nivel: 'Intermedio', tipo: 'Deseable' },
        ],
      })
      .expect(400);

    expect(response.body.message).toContain(
      "El requisito técnico 'sql' ya está asociado a esta vacante.",
    );

    // Verificar que el conteo en VACANTE_ID_A se mantiene inalterado
    const check = await request(app.getHttpServer())
      .get(`/vacantes/${VACANTE_ID_A}/requisitos`)
      .expect(200);

    expect(check.body).toHaveLength(4);
  });

  it('Prepara la información técnica para el motor de matching', async () => {
    const response = await request(app.getHttpServer())
      .get(`/vacantes/${VACANTE_ID_A}/requisitos/matching`)
      .expect(200);

    expect(response.body.idVacante).toBe(VACANTE_ID_A);
    expect(response.body.totalRequisitos).toBe(4);
    expect(response.body.obligatorios).toHaveLength(3);
    expect(response.body.deseables).toHaveLength(1);
    expect(response.body.competenciasIndex['sql']).toBeDefined();
    expect(response.body.competenciasIndex['sql'].pesoNivel).toBe(3);
    expect(response.body.competenciasIndex['sql'].esObligatorio).toBe(true);
    expect(response.body.metadatosMatching.versionMotor).toBe('1.0.0-sprint1');
  });

  it('Permite editar y eliminar requisitos para la interfaz de gestión', async () => {
    const listRes = await request(app.getHttpServer())
      .get(`/vacantes/${VACANTE_ID_A}/requisitos`)
      .expect(200);

    const sqlReq = listRes.body.find(
      (r: { competencia: string }) => r.competencia === 'SQL',
    );

    // Actualizar nivel a Experto
    const patchRes = await request(app.getHttpServer())
      .patch(`/vacantes/${VACANTE_ID_A}/requisitos/${sqlReq.id}`)
      .send({ nivel: 'Experto' })
      .expect(200);

    expect(patchRes.body.nivel).toBe('Experto');

    // Eliminar Power BI
    const powerBiReq = listRes.body.find(
      (r: { competencia: string }) => r.competencia === 'Power BI',
    );
    await request(app.getHttpServer())
      .delete(`/vacantes/${VACANTE_ID_A}/requisitos/${powerBiReq.id}`)
      .expect(200);

    const afterDelete = await request(app.getHttpServer())
      .get(`/vacantes/${VACANTE_ID_A}/requisitos`)
      .expect(200);

    expect(afterDelete.body).toHaveLength(3);
    expect(
      afterDelete.body.some(
        (r: { competencia: string }) => r.competencia === 'Power BI',
      ),
    ).toBe(false);
  });
});
