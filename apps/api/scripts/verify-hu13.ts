import 'reflect-metadata';
import { config } from 'dotenv';
import { strict as assert } from 'node:assert';
import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../src/shared/infrastructure/database/prisma.service';
import { OcrResultsService } from '../src/modules/registrations/application/services/ocr-results.service';
import { OcrService } from '../src/modules/registrations/application/services/ocr.service';
import type { ActorContext } from '../src/shared/security/contexts/actor-context';
import type { OcrReading } from '@umsspira/shared-types';
config({ quiet: true });
const target = new URL(process.env.DATABASE_URL!);
if (!['localhost', '127.0.0.1'].includes(target.hostname) || target.pathname !== '/hu13_local') {
  throw new Error('This check requires the isolated local database hu13_local.');
}
const db = new PrismaService(new ConfigService(process.env) as never);
const service = new OcrService(db);
const results = new OcrResultsService(db, service);
const career = randomUUID(),
  user = randomUUID(),
  app = randomUUID(),
  detail = randomUUID(),
  document = randomUUID();
const actor: ActorContext = {
  id: user,
  email: 'ocr-test@example.com',
  name: 'OCR Test',
  role: 'administrador',
  permissions: ['solicitudes:read'],
  scopes: { careerIds: [career], companyIds: [], graduateId: null },
  credentialVersion: 1,
};
const text = [
  'Nombres: José Andrés',
  'Apellidos: Pérez Mamani',
  'CI: 5918234',
  'Carrera: Ingeniería de Sistemas',
  'Año de egreso: 2023',
  'Código SIS: 201704981',
];
const reading: OcrReading = {
  lines: text.map((text) => ({ text, confidence: 0.99, page: 1 })),
  pagesRead: 1,
  totalPages: 1,
  partial: false,
  engine: 'PaddleOCR.js@0.4.2/PP-OCRv6_small/es',
  loadMs: 100,
  readMs: 200,
};
async function main() {
  try {
    await db.carrera.create({ data: { id: career, nombre: 'Ingeniería de Sistemas' } });
    await db.usuario.create({
      data: { usuario_id: user, nombre: 'OCR Test', correo: `${user}@example.com` },
    });
    await db.detalleSolicitud.create({
      data: {
        id: detail,
        id_carrera: career,
        nombre: 'José Andrés',
        apellido: 'Pérez Mamani',
        ci: '5918234',
        anio_egreso: 2023,
        cod_sis: 201704981,
      },
    });
    await db.documentoRespaldo.create({ data: { id: document } });
    await db.solicitud.create({
      data: {
        id: app,
        id_detalle_solicitud: detail,
        id_documento_respaldo: document,
        estado: 'PENDIENTE',
      },
    });
    assert.equal((await results.analyses(actor, app))[0].status, 'PENDIENTE');
    assert.equal((await service.statuses(actor, [app]))[0].status, 'PENDIENTE');
    assert.deepEqual(await service.statuses({ ...actor, scopes: { ...actor.scopes, careerIds: [] } }, [app]), []);
    const two = await Promise.all([service.claim(actor), service.claim(actor)]);
    assert.equal(two.filter(Boolean).length, 1, 'Only one browser reserves a version');
    let job = two.find(Boolean)!;
    await assert.rejects(
      service.renew({ ...actor, scopes: { ...actor.scopes, careerIds: [] } }, job.id, job.token),
    );
    await assert.rejects(results.complete(actor, job.id, randomUUID(), reading));
    await assert.rejects(
      results.analyses({ ...actor, scopes: { ...actor.scopes, careerIds: [] } }, app),
    );
    await service.renew(actor, job.id, job.token);
    await db.$executeRaw`UPDATE ocr_trabajo SET reserva_hasta=now()-interval '1 second' WHERE id=${job.id}::uuid`;
    const recovered = (await service.claim(actor))!;
    assert.notEqual(recovered.token, job.token);
    await assert.rejects(results.complete(actor, job.id, job.token, reading));
    job = recovered;
    const result = await results.complete(actor, job.id, job.token, reading);
    assert.equal(result.suggestion, 'APROBAR');
    await assert.rejects(results.complete(actor, job.id, job.token, reading));
    assert.equal(await db.ocrResultado.count({ where: { id_trabajo: job.id } }), 1);
    assert.equal((await results.analyses(actor, app))[0].result?.suggestion, 'APROBAR');
    assert.equal(
      (await db.solicitud.findUniqueOrThrow({ where: { id: app } })).estado,
      'PENDIENTE',
    );
    assert.equal(await db.dictamen.count({ where: { id_solicitud: app } }), 0);
    assert.equal(await db.correoTramite.count({ where: { id_solicitud: app } }), 0);
    await db.solicitud.update({ where: { id: app }, data: { estado: 'OBSERVADA' } });
    await db.solicitud.update({ where: { id: app }, data: { estado: 'PENDIENTE', version_vigente: { increment: 1 } } });
    let history = await results.analyses(actor, app);
    assert.equal(history.length, 2);
    assert.equal(history[0].revision, 2);
    assert.equal(history[1].current, false);
    job = (await service.claim(actor))!;
    await db.solicitud.update({ where: { id: app }, data: { estado: 'OBSERVADA' } });
    await db.solicitud.update({ where: { id: app }, data: { estado: 'PENDIENTE', version_vigente: { increment: 1 } } });
    await assert.rejects(results.complete(actor, job.id, job.token, reading));
    history = await results.analyses(actor, app);
    assert.equal(history[1].status, 'DESCARTADO');
    for (let attempt = 0; attempt < 3; attempt++) {
      job = (await service.claim(actor))!;
      assert.ok(job);
      await service.fail(actor, job.id, job.token);
    }
    assert.equal(await service.claim(actor), null);
    assert.equal((await results.analyses(actor, app))[0].status, 'FALLIDO');
    console.log(
      'HU-13 PostgreSQL: queue, concurrent reservation, renewal, expiry/reassignment, scope, wrong token, exactly one result, version history, stale result, retry limit, unchanged state and no mail: PASS',
    );
  } finally {
    await db.$executeRaw`DELETE FROM ocr_resultado WHERE id_trabajo IN (SELECT id FROM ocr_trabajo WHERE id_solicitud=${app}::uuid)`;
    await db.$executeRaw`DELETE FROM ocr_trabajo WHERE id_solicitud=${app}::uuid`;
    await db.solicitud.deleteMany({ where: { id: app } });
    await db.documentoRespaldo.deleteMany({ where: { id: document } });
    await db.detalleSolicitud.deleteMany({ where: { id: detail } });
    await db.carrera.deleteMany({ where: { id: career } });
    await db.usuario.deleteMany({ where: { usuario_id: user } });
    await db.$disconnect();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
