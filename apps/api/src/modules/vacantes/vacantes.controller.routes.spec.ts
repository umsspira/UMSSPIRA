import { CanActivate, ExecutionContext, INestApplication, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { REQUIRED_ROLES } from '../../shared/http/auth/decorators/roles.decorator';
import { REQUIRED_PERMISSIONS } from '../../shared/http/auth/decorators/require-permissions.decorator';
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

  it('expone PATCH /vacantes/:id y actualiza con los datos validados (HU-13)', async () => {
    const body = {
      titulo: 'Nueva',
      modalidad: 'HIBRIDO',
      nivel_experiencia: 'Junior',
      descripcion_tecnica: 'x'.repeat(60),
    };

    await request(app.getHttpServer())
      .patch(`/api/v1/vacantes/${ID_VACANTE}`)
      .send(body)
      .expect(200);

    expect(service.actualizarVacante).toHaveBeenCalledWith(ID_VACANTE, actor.id, body);
  });

  it('rechaza con 400 VALIDATION_ERROR un body fuera del schema (HU-13)', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/vacantes/${ID_VACANTE}`)
      .send({ titulo: '', modalidad: 'Híbrido' })
      .expect(400);

    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(service.actualizarVacante).not.toHaveBeenCalled();
  });

  it('rechaza campos adicionales en la edición (HU-13)', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/vacantes/${ID_VACANTE}`)
      .send({ titulo: 'Nueva', id_empresa: 'otra' })
      .expect(400);

    expect(service.actualizarVacante).not.toHaveBeenCalled();
  });

  it('propaga el 404 del scoping de empresa como error de la API (HU-13)', async () => {
    service.actualizarVacante.mockRejectedValueOnce(new NotFoundException('Vacante no encontrada'));

    const res = await request(app.getHttpServer())
      .patch(`/api/v1/vacantes/${ID_VACANTE}`)
      .send({ estado: 'PAUSADA' })
      .expect(404);

    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('exige permiso empresas:self:write para editar la vacante (HU-13)', () => {
    expect(
      Reflect.getMetadata(REQUIRED_PERMISSIONS, VacantesController.prototype.actualizar),
    ).toEqual(['empresas:self:write']);
  });

  it('entrega el estado canónico al servicio cuando el PATCH recibe un alias (HU-14)', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/vacantes/${ID_VACANTE}`)
      .send({ estado: 'PAUSADA' })
      .expect(200);

    expect(service.actualizarVacante).toHaveBeenCalledWith(ID_VACANTE, actor.id, {
      estado: 'PAUSADO',
    });
  });

  it('rechaza con 400 un estado inventado en el PATCH (HU-14)', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/vacantes/${ID_VACANTE}`)
      .send({ estado: 'INVENTADO' })
      .expect(400);

    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(service.actualizarVacante).not.toHaveBeenCalled();
  });

  it('exige permiso empresas:self:write para cerrar la vacante (HU-14)', () => {
    expect(
      Reflect.getMetadata(REQUIRED_PERMISSIONS, VacantesController.prototype.cerrar),
    ).toEqual(['empresas:self:write']);
  });

  it('exige permiso empresas:self:write para eliminar la vacante (HU-14)', () => {
    expect(
      Reflect.getMetadata(REQUIRED_PERMISSIONS, VacantesController.prototype.eliminar),
    ).toEqual(['empresas:self:write']);
  });

  it('PATCH /vacantes/:id/cerrar cierra usando el actor autenticado (HU-14)', async () => {
    service.cerrarVacante.mockResolvedValueOnce({ id: ID_VACANTE, estado: 'CERRADO' });

    await request(app.getHttpServer())
      .patch(`/api/v1/vacantes/${ID_VACANTE}/cerrar`)
      .expect(200, { id: ID_VACANTE, estado: 'CERRADO' });

    expect(service.cerrarVacante).toHaveBeenCalledWith(ID_VACANTE, actor.id);
  });

  it('PATCH /vacantes/:id/cerrar responde 404 si la vacante es de otra empresa (HU-14)', async () => {
    service.cerrarVacante.mockRejectedValueOnce(new NotFoundException('Vacante no encontrada'));

    const res = await request(app.getHttpServer())
      .patch(`/api/v1/vacantes/${ID_VACANTE}/cerrar`)
      .expect(404);

    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('PATCH /vacantes/:id/cerrar responde 400 si el id no es un UUID (HU-14)', async () => {
    await request(app.getHttpServer()).patch('/api/v1/vacantes/no-es-uuid/cerrar').expect(400);

    expect(service.cerrarVacante).not.toHaveBeenCalled();
  });
});