import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureHttp } from '../src/shared/http/configuration/configure-http';
import { PrismaService } from '../src/shared/infrastructure/database/prisma.service';
import { AUTHENTICATOR } from '../src/shared/security/ports/authenticator.port';
import type { ActorContext } from '../src/shared/security/contexts/actor-context';
import { MENTOR_ONBOARDING_REPOSITORY } from '../src/modules/mentorship/application/ports/mentor-onboarding-repository.port';
import { RATE_LIMITER } from '../src/modules/auth/application/ports/rate-limiter.port';
import { BusinessRuleError } from '../src/shared/errors/business-rule-error';
import { UnprocessableEntityError } from '../src/shared/errors/unprocessable-entity-error';
import type { MentorOnboardingState } from '../src/modules/mentorship/domain/entities/mentor-onboarding';

const graduate: ActorContext = {
  id: randomUUID(),
  email: 'mentor@example.com',
  name: 'Mentora de prueba',
  role: 'titulado',
  credentialVersion: 1,
  permissions: ['mentores:self:write'],
  scopes: { graduateId: randomUUID(), companyIds: [], careerIds: [] },
};

const area = {
  id: randomUUID(),
  name: 'Desarrollo de software',
  description: 'Construcción de aplicaciones y servicios de software.',
  selected: true,
  locked: false,
};
const interest = {
  id: randomUUID(),
  name: 'Backend',
  area: { id: area.id, name: area.name },
};

const state: MentorOnboardingState = {
  hasAreas: true,
  hasInterests: true,
  hasAvailability: false,
  currentStep: 3,
  totalSteps: 3,
  completedSteps: [1, 2],
  isComplete: false,
  areas: { catalog: [area], selectedIds: [area.id], interests: [interest] },
  interests: [
    {
      area,
      interests: [{ ...interest, selected: true }],
    },
  ],
  selectedInterestIds: [interest.id],
  availability: {
    status: 'DISPONIBLE',
    schedules: [{ weekday: 2, start: '18:00', end: '20:00' }],
  },
};

describe('Onboarding de mentor: contratos HTTP', () => {
  let app: INestApplication;
  const onboarding = {
    read: jest.fn(),
    saveAreas: jest.fn(),
    saveInterests: jest.fn(),
    saveAvailability: jest.fn(),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(MENTOR_ONBOARDING_REPOSITORY)
      .useValue(onboarding)
      .overrideProvider(RATE_LIMITER)
      .useValue({ consume: jest.fn().mockResolvedValue({ allowed: true, retryAfterSeconds: 0 }) })
      .overrideProvider(AUTHENTICATOR)
      .useValue({
        execute: async () => ({ actor: graduate, sessionId: randomUUID() }),
      })
      .compile();
    app = module.createNestApplication();
    app.useLogger(false);
    configureHttp(app);
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    onboarding.read.mockResolvedValue(state);
    onboarding.saveAreas.mockResolvedValue(state);
    onboarding.saveInterests.mockResolvedValue(state);
    onboarding.saveAvailability.mockResolvedValue({
      ...state,
      hasAvailability: true,
      completedSteps: [1, 2, 3],
      currentStep: 3,
      isComplete: true,
    });
  });
  afterAll(async () => app?.close());

  it('CANF-01: sin token responde 401 y no consulta ni modifica nada', async () => {
    await request(app.getHttpServer()).get('/api/v1/mentorship/onboarding').expect(401);
    await request(app.getHttpServer())
      .put('/api/v1/mentorship/onboarding/areas')
      .send({ areaIds: [area.id] })
      .expect(401);
    expect(onboarding.read).not.toHaveBeenCalled();
    expect(onboarding.saveAreas).not.toHaveBeenCalled();
  });

  it('devuelve el estado persistente con pasos y progreso', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/mentorship/onboarding')
      .set('Authorization', 'Bearer token')
      .expect(200);

    expect(response.body.data).toMatchObject({
      currentStep: 3,
      totalSteps: 3,
      completedSteps: [1, 2],
      isComplete: false,
    });
    expect(response.body.data.steps).toEqual([
      { step: 1, key: 'areas', label: 'Áreas técnicas', completed: true },
      { step: 2, key: 'interests', label: 'Intereses', completed: true },
      { step: 3, key: 'availability', label: 'Disponibilidad', completed: false },
    ]);
    expect(response.body.data.areas.selectedIds).toEqual([area.id]);
    expect(response.body.data.areas.catalog).toEqual([
      { id: area.id, nombre: area.name, descripcion: area.description },
    ]);
    expect(response.body.data.areas.intereses).toEqual([
      { id_area: area.id, nombre: interest.name },
    ]);
    expect(response.body.data.interests.catalog).toEqual([
      {
        area: { id: area.id, nombre: area.name },
        intereses: [
          {
            id: interest.id,
            nombre: interest.name,
            area: { id: area.id, nombre: area.name },
            seleccionado: true,
          },
        ],
      },
    ]);
    expect(response.body.data.availability).toEqual({
      availabilityStatus: 'DISPONIBLE',
      schedules: [{ weekday: 2, start: '18:00', end: '20:00' }],
    });
    expect(onboarding.read).toHaveBeenCalledWith(graduate.id);
  });

  it('CANF-02: sin participación activa responde 403 MENTOR_NO_HABILITADO', async () => {
    onboarding.read.mockRejectedValueOnce(
      new BusinessRuleError('forbidden', 'MENTOR_NO_HABILITADO', 'Sin participación activa'),
    );
    const response = await request(app.getHttpServer())
      .get('/api/v1/mentorship/onboarding')
      .set('Authorization', 'Bearer token')
      .expect(403);
    expect(response.body.error.code).toBe('MENTOR_NO_HABILITADO');
  });

  it('CANF-03: ignora un usuario_id ajeno y usa la identidad del token', async () => {
    await request(app.getHttpServer())
      .put('/api/v1/mentorship/onboarding/areas')
      .set('Authorization', 'Bearer token')
      .send({ areaIds: [area.id], usuario_id: randomUUID() })
      .expect(200);
    expect(onboarding.saveAreas).toHaveBeenCalledWith(graduate.id, { areaIds: [area.id] });
    expect(onboarding.saveAreas).toHaveBeenCalledTimes(1);
  });

  it('CANF-04/CAF-05: guarda el paso y responde 200 con el avance', async () => {
    const response = await request(app.getHttpServer())
      .put('/api/v1/mentorship/onboarding/interests')
      .set('Authorization', 'Bearer token')
      .send({ interestIds: [interest.id] })
      .expect(200);
    expect(response.body.data.currentStep).toBe(3);
    expect(response.body.data.completedSteps).toEqual([1, 2]);
    expect(onboarding.saveInterests).toHaveBeenCalledWith(graduate.id, {
      interestIds: [interest.id],
    });
  });

  it('CANF-05: un paso posterior sin el anterior responde 409 PASO_PREVIO_INCOMPLETO', async () => {
    onboarding.saveInterests.mockRejectedValueOnce(
      new BusinessRuleError('conflict', 'PASO_PREVIO_INCOMPLETO', 'Completa el paso anterior'),
    );
    const response = await request(app.getHttpServer())
      .put('/api/v1/mentorship/onboarding/interests')
      .set('Authorization', 'Bearer token')
      .send({ interestIds: [interest.id] })
      .expect(409);
    expect(response.body.error.code).toBe('PASO_PREVIO_INCOMPLETO');
  });

  it('CANF-06: datos inválidos responden 422 con el detalle de campos', async () => {
    onboarding.saveAreas.mockRejectedValueOnce(
      new UnprocessableEntityError('DATOS_PASO_INVALIDOS', 'Revisa el paso', {
        areaIds: ['Selecciona al menos un área técnica'],
      }),
    );
    const response = await request(app.getHttpServer())
      .put('/api/v1/mentorship/onboarding/areas')
      .set('Authorization', 'Bearer token')
      .send({ areaIds: [] })
      .expect(422);
    expect(response.body.error).toMatchObject({
      code: 'DATOS_PASO_INVALIDOS',
      fields: { areaIds: ['Selecciona al menos un área técnica'] },
    });
  });

  it('CANF-07: repetir el mismo paso devuelve una configuración única', async () => {
    await request(app.getHttpServer())
      .put('/api/v1/mentorship/onboarding/areas')
      .set('Authorization', 'Bearer token')
      .send({ areaIds: [area.id] })
      .expect(200);
    await request(app.getHttpServer())
      .put('/api/v1/mentorship/onboarding/areas')
      .set('Authorization', 'Bearer token')
      .send({ areaIds: [area.id] })
      .expect(200);
    expect(onboarding.saveAreas).toHaveBeenCalledTimes(2);
  });

  it('CANF-10: el último paso marca la configuración como finalizada', async () => {
    const response = await request(app.getHttpServer())
      .put('/api/v1/mentorship/onboarding/availability')
      .set('Authorization', 'Bearer token')
      .send({
        availabilityStatus: 'DISPONIBLE',
        schedules: [{ weekday: 2, start: '18:00', end: '20:00' }],
      })
      .expect(200);
    expect(response.body.data.isComplete).toBe(true);
    expect(response.body.data.completedSteps).toEqual([1, 2, 3]);
  });
});
