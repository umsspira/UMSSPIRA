import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { SupabaseService } from '../src/config/supabase.service';
import { ExperienciaLaboralController } from '../src/modules/experiencia-laboral/experiencia-laboral.controller';
import { ExperienciaLaboralService } from '../src/modules/experiencia-laboral/experiencia-laboral.service';
import { ExperienceWriteGuard } from '../src/modules/experiencia-laboral/experience-write.guard';
import { SupabaseAuthGuard } from '../src/modules/experiencia-laboral/supabase-auth.guard';

const AUTH_USER_ID = '11111111-1111-4111-8111-111111111111';
const READER_AUTH_USER_ID = '22222222-2222-4222-8222-222222222222';
const OWNER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OTHER_OWNER_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const EXPERIENCE_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const OTHER_EXPERIENCE_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

interface DbRow {
  id: string;
  id_egresado?: string;
  usuario_id?: string;
  auth_user_id?: string;
  id_usuario?: string;
  rol?: string;
  empresa?: string;
  cargo?: string;
  descripcion?: string | null;
  tipo_empleo?: string;
  fecha_inicio?: string;
  fecha_fin?: string | null;
  es_actual?: boolean;
  fecha_creacion?: string;
  fecha_actualizacion?: string;
}

interface QueryResult {
  data: DbRow | DbRow[] | null;
  error: { message: string } | null;
}

class FakeSupabaseDatabase {
  rows: Record<string, DbRow[]> = {};
  failExperienceQueries = false;
  private nextId = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

  from(table: string) {
    return new FakeQueryBuilder(this, table);
  }

  newExperienceId() {
    return this.nextId;
  }
}

class FakeQueryBuilder {
  private operation: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private filters: Record<string, unknown> = {};
  private values: Partial<DbRow> = {};

  constructor(
    private readonly database: FakeSupabaseDatabase,
    private readonly table: string,
  ) {}

  select() {
    return this;
  }

  insert(values: Partial<DbRow>) {
    this.operation = 'insert';
    this.values = values;
    return this;
  }

  update(values: Partial<DbRow>) {
    this.operation = 'update';
    this.values = values;
    return this;
  }

  delete() {
    this.operation = 'delete';
    return this;
  }

  eq(field: string, value: unknown) {
    this.filters[field] = value;
    return this;
  }

  order() {
    return Promise.resolve(this.execute(false));
  }

  single() {
    return Promise.resolve(this.execute(true));
  }

  maybeSingle() {
    return Promise.resolve(this.execute(true));
  }

  private execute(single: boolean): QueryResult {
    if (this.table === 'experiencia_laboral' && this.database.failExperienceQueries) {
      return { data: null, error: { message: 'database unavailable' } };
    }

    const tableRows = (this.database.rows[this.table] ??= []);

    if (this.operation === 'insert') {
      const row: DbRow = {
        id: this.database.newExperienceId(),
        fecha_creacion: '2025-01-01T00:00:00.000Z',
        fecha_actualizacion: '2025-01-01T00:00:00.000Z',
        ...this.values,
      };
      tableRows.push(row);
      return { data: row, error: null };
    }

    const matchingRows = tableRows.filter((row) =>
      Object.entries(this.filters).every(([field, value]) => row[field as keyof DbRow] === value),
    );

    if (this.operation === 'update') {
      const row = matchingRows[0];
      if (!row) {
        return { data: null, error: null };
      }
      Object.assign(row, this.values);
      return { data: row, error: null };
    }

    if (this.operation === 'delete') {
      const row = matchingRows[0];
      if (!row) {
        return { data: null, error: null };
      }
      tableRows.splice(tableRows.indexOf(row), 1);
      return { data: { id: row.id }, error: null };
    }

    return {
      data: single ? matchingRows[0] ?? null : matchingRows,
      error: null,
    };
  }
}

describe('ExperienciaLaboralController (e2e)', () => {
  let app: INestApplication;
  let database: FakeSupabaseDatabase;
  let authService: { getUser: jest.Mock };

  const validExperience = {
    company: 'Empresa UMSS',
    position: 'Desarrollador',
    description: 'Desarrollo de aplicaciones.',
    employmentType: 'Tiempo completo',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    currentlyWorking: false,
  };

  beforeEach(async () => {
    database = new FakeSupabaseDatabase();
    database.rows.usuario = [
      {
        id: OWNER_ID,
        usuario_id: OWNER_ID,
        auth_user_id: AUTH_USER_ID,
        rol: 'egresado',
      },
      {
        id: OTHER_OWNER_ID,
        usuario_id: OTHER_OWNER_ID,
        auth_user_id: READER_AUTH_USER_ID,
        rol: 'lector',
      },
    ];
    database.rows.egresado = [
      { id: OWNER_ID, id_usuario: OWNER_ID },
      { id: OTHER_OWNER_ID, id_usuario: OTHER_OWNER_ID },
    ];
    database.rows.experiencia_laboral = [
      {
        id: EXPERIENCE_ID,
        id_egresado: OWNER_ID,
        empresa: 'Empresa UMSS',
        cargo: 'Desarrollador',
        descripcion: 'Desarrollo de aplicaciones.',
        tipo_empleo: 'Tiempo completo',
        fecha_inicio: '2024-01-01',
        fecha_fin: '2024-12-31',
        es_actual: false,
        fecha_creacion: '2024-01-01T00:00:00.000Z',
        fecha_actualizacion: '2024-01-01T00:00:00.000Z',
      },
      {
        id: OTHER_EXPERIENCE_ID,
        id_egresado: OTHER_OWNER_ID,
        empresa: 'Otra empresa',
        cargo: 'Analista',
        descripcion: 'Análisis funcional.',
        tipo_empleo: 'Consultoría',
        fecha_inicio: '2023-01-01',
        fecha_fin: '2023-12-31',
        es_actual: false,
        fecha_creacion: '2023-01-01T00:00:00.000Z',
        fecha_actualizacion: '2023-01-01T00:00:00.000Z',
      },
    ];

    authService = {
      getUser: jest.fn(async (token: string) => {
        if (token === 'valid-token') {
          return { data: { user: { id: AUTH_USER_ID } }, error: null };
        }
        if (token === 'reader-token') {
          return { data: { user: { id: READER_AUTH_USER_ID } }, error: null };
        }
        return { data: { user: null }, error: { message: 'invalid token' } };
      }),
    };

    const supabaseServiceMock = {
      getClient: () => ({ auth: authService }),
      getAdminClient: () => database,
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [ExperienciaLaboralController],
      providers: [
        ExperienciaLaboralService,
        SupabaseAuthGuard,
        ExperienceWriteGuard,
        { provide: SupabaseService, useValue: supabaseServiceMock },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('rechaza solicitudes sin token y tokens inválidos', async () => {
    await request(app.getHttpServer())
      .get('/experiencias-laborales')
      .expect(401);

    await request(app.getHttpServer())
      .get('/experiencias-laborales')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);
  });

  it('lista únicamente las experiencias del egresado autenticado', async () => {
    const response = await request(app.getHttpServer())
      .get('/experiencias-laborales')
      .set('Authorization', 'Bearer valid-token')
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0].id).toBe(EXPERIENCE_ID);
  });

  it('crea una experiencia asociada al egresado autenticado', async () => {
    const response = await request(app.getHttpServer())
      .post('/experiencias-laborales')
      .set('Authorization', 'Bearer valid-token')
      .send(validExperience)
      .expect(201);

    expect(response.body.company).toBe(validExperience.company);
    expect(database.rows.experiencia_laboral.at(-1)?.id_egresado).toBe(OWNER_ID);
  });

  it('rechaza datos inválidos y evita fechas inconsistentes', async () => {
    await request(app.getHttpServer())
      .post('/experiencias-laborales')
      .set('Authorization', 'Bearer valid-token')
      .send({ ...validExperience, company: '' })
      .expect(400);

    await request(app.getHttpServer())
      .post('/experiencias-laborales')
      .set('Authorization', 'Bearer valid-token')
      .send({ ...validExperience, id_egresado: OTHER_OWNER_ID })
      .expect(400);

    await request(app.getHttpServer())
      .post('/experiencias-laborales')
      .set('Authorization', 'Bearer valid-token')
      .send({ ...validExperience, endDate: '2023-12-31' })
      .expect(400);

    await request(app.getHttpServer())
      .post('/experiencias-laborales')
      .set('Authorization', 'Bearer valid-token')
      .send({ ...validExperience, currentlyWorking: true })
      .expect(400);
  });

  it('permite consultar, actualizar y eliminar solo registros propios', async () => {
    await request(app.getHttpServer())
      .get(`/experiencias-laborales/${EXPERIENCE_ID}`)
      .set('Authorization', 'Bearer valid-token')
      .expect(200);

    await request(app.getHttpServer())
      .get(`/experiencias-laborales/${OTHER_EXPERIENCE_ID}`)
      .set('Authorization', 'Bearer valid-token')
      .expect(404);

    await request(app.getHttpServer())
      .patch(`/experiencias-laborales/${EXPERIENCE_ID}`)
      .set('Authorization', 'Bearer valid-token')
      .send({ position: 'Desarrollador senior' })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/experiencias-laborales/${OTHER_EXPERIENCE_ID}`)
      .set('Authorization', 'Bearer valid-token')
      .send({ position: 'No autorizado' })
      .expect(404);

    await request(app.getHttpServer())
      .delete(`/experiencias-laborales/${OTHER_EXPERIENCE_ID}`)
      .set('Authorization', 'Bearer valid-token')
      .expect(404);

    await request(app.getHttpServer())
      .delete(`/experiencias-laborales/${EXPERIENCE_ID}`)
      .set('Authorization', 'Bearer valid-token')
      .expect(200);
  });

  it('mantiene el rol lector en modo de solo lectura', async () => {
    await request(app.getHttpServer())
      .get('/experiencias-laborales')
      .set('Authorization', 'Bearer reader-token')
      .expect(200);

    await request(app.getHttpServer())
      .post('/experiencias-laborales')
      .set('Authorization', 'Bearer reader-token')
      .send(validExperience)
      .expect(403);

    await request(app.getHttpServer())
      .patch(`/experiencias-laborales/${OTHER_EXPERIENCE_ID}`)
      .set('Authorization', 'Bearer reader-token')
      .send({ position: 'Sin permisos' })
      .expect(403);
  });

  it('devuelve un error controlado si falla la base de datos', async () => {
    database.failExperienceQueries = true;

    const response = await request(app.getHttpServer())
      .get('/experiencias-laborales')
      .set('Authorization', 'Bearer valid-token')
      .expect(500);

    expect(response.body.message).not.toContain('database unavailable');
  });

  it('mantiene la ruta y el método usados por el cliente frontend actual', async () => {
    const response = await request(app.getHttpServer())
      .put(`/api/profile/experiences/${EXPERIENCE_ID}`)
      .set('Authorization', 'Bearer valid-token')
      .send({ ...validExperience, position: 'Actualizado' })
      .expect(200);

    expect(response.body.position).toBe('Actualizado');
  });
});
