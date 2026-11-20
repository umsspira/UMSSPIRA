import { CanActivate, ExecutionContext, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { REQUIRED_ROLES } from '../../shared/http/auth/decorators/roles.decorator';
import { ErrorHandlerFilter } from '../../shared/http/filters/error-handler.filter';
import type { ActorContext } from '../../shared/security/contexts/actor-context';
import { VacantesController } from './vacantes.controller';
import { VacantesService } from './vacantes.service';

// Regresión HU-006/HU-003: estas rutas se borraron del controller durante un merge
// sin que ningún test lo notara. Este spec pasa por el ruteo HTTP real para que
// volver a eliminarlas rompa el CI.
describe('VacantesController · rutas de postulación (HU-03/HU-06)', () => {
  const ID_VACANTE = '44500000-0000-4000-8000-000000000001';

  const actor: ActorContext = {
    id: '20000000-0000-4000-8000-000000000003',
    email: 'titulado@umsspira.test',
    name: 'Titulado',
    role: 'titulado',
    permissions: [],
    scopes: { companyIds: [], graduateId: 'grad-1', careerIds: [] },
    credentialVersion: 1,
  };

  const service = {
    obtenerMisVacantes: jest.fn().mockResolvedValue([]),
    listarMisPostulaciones: jest.fn().mockResolvedValue([{ id: 'post-1' }]),
    obtenerOfertaParaTitulado: jest.fn().mockResolvedValue({ id: ID_VACANTE }),
    estadoPostulacion: jest.fn().mockResolvedValue({ postulada: true }),
    postular: jest.fn().mockResolvedValue({ postulada: true, yaExistia: false }),
    listarPostulantes: jest.fn().mockResolvedValue([]),
    obtenerPostulante: jest.fn(),
    cambiarEtapaPostulante: jest.fn().mockResolvedValue({ id: '44800000-0000-4000-8000-000000000001', estado: 'entrevista' }),
    actualizarVacante: jest.fn(),
    cerrarVacante: jest.fn(),
    eliminarVacante: jest.fn(),
  };

  const authStub: CanActivate = {
    canActivate(context: ExecutionContext): boolean {
      context.switchToHttp().getRequest().auth = { actor };
      return true;
    },
  };

  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [VacantesController],
      providers: [{ provide: VacantesService, useValue: service }],
    }).compile();

    app = module.createNestApplication();
    app.useLogger(false);
    app.setGlobalPrefix('api/v1', { exclude: ['/', 'health'] });
    app.useGlobalFilters(new ErrorHandlerFilter());
    app.useGlobalGuards(authStub);
    await app.init();
  });

  beforeEach(() => jest.clearAllMocks());
  afterAll(async () => app?.close());

  it('expone POST /vacantes/:id/postulaciones y postula al actor autenticado', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/vacantes/${ID_VACANTE}/postulaciones`)
      .expect(201, { data: { postulada: true, yaExistia: false } });

    expect(service.postular).toHaveBeenCalledWith(ID_VACANTE, actor.id);
  });

  it('expone GET /vacantes/:id/postulaciones/mia con el estado del actor', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/vacantes/${ID_VACANTE}/postulaciones/mia`)
      .expect(200, { data: { postulada: true } });

    expect(service.estadoPostulacion).toHaveBeenCalledWith(ID_VACANTE, actor.id);
  });

  it('valida el UUID de la vacante antes de consultar la postulación', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/vacantes/no-es-uuid/postulaciones/mia')
      .expect(400);

    expect(service.estadoPostulacion).not.toHaveBeenCalled();
  });

  it('expone GET /vacantes/mis-postulaciones del actor autenticado', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/vacantes/mis-postulaciones')
      .expect(200, { data: [{ id: 'post-1' }] });

    expect(service.listarMisPostulaciones).toHaveBeenCalledWith(actor.id);
  });

  it('expone GET /vacantes/:id/oferta para el titulado', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/vacantes/${ID_VACANTE}/oferta`)
      .expect(200, { data: { id: ID_VACANTE } });

    expect(service.obtenerOfertaParaTitulado).toHaveBeenCalledWith(ID_VACANTE, actor.id);
  });

  it('exige rol titulado en las rutas de HU-006', () => {
    expect(
      Reflect.getMetadata(REQUIRED_ROLES, VacantesController.prototype.listarMisPostulaciones),
    ).toEqual(['titulado']);
    expect(
      Reflect.getMetadata(REQUIRED_ROLES, VacantesController.prototype.obtenerOferta),
    ).toEqual(['titulado']);
  });

  it('expone PATCH para cambiar la etapa de un postulante (HU-04)', async () => {
    const ID_POSTULACION = '44800000-0000-4000-8000-000000000001';

    await request(app.getHttpServer())
      .patch(`/api/v1/vacantes/${ID_VACANTE}/postulantes/${ID_POSTULACION}/etapa`)
      .send({ etapa: 'entrevista' })
      .expect(200, {
        id: ID_POSTULACION,
        estado: 'entrevista',
      });

    expect(service.cambiarEtapaPostulante).toHaveBeenCalledWith(
      ID_VACANTE,
      ID_POSTULACION,
      actor.id,
      'entrevista',
    );
  });

  it('rechaza un UUID inválido al cambiar la etapa (HU-04)', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/vacantes/no-es-uuid/postulantes/44800000-0000-4000-8000-000000000001/etapa')
      .send({ etapa: 'entrevista' })
      .expect(400);

    expect(service.cambiarEtapaPostulante).not.toHaveBeenCalled();
  });

  it('rechaza un UUID de postulación inválido (HU-04)', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/vacantes/${ID_VACANTE}/postulantes/no-es-uuid/etapa`)
      .send({ etapa: 'entrevista' })
      .expect(400);

    expect(service.cambiarEtapaPostulante).not.toHaveBeenCalled();
  });
});
