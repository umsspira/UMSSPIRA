import { DemoChecklistService, MIGRACIONES_REQUERIDAS } from './demo-checklist.service';
import { DemoChecklistController } from './demo-checklist.controller';
import { REQUIRED_ROLES } from '../../shared/http/auth/decorators/roles.decorator';

function crearPrisma(over: Record<string, unknown> = {}) {
  return {
    $queryRaw: jest.fn().mockResolvedValue(MIGRACIONES_REQUERIDAS.map((m) => ({ migration_name: m }))),
    vacante: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(3) },
    usuario: { count: jest.fn().mockResolvedValue(1) },
    postulacion: { count: jest.fn().mockImplementation(async ({ where }: { where: Record<string, unknown> }) => (where.porcentaje_match === null ? 2 : 9)) },
    ...over,
  };
}
const crear = (over?: Record<string, unknown>) => new DemoChecklistService(crearPrisma(over) as never);
const porId = (r: Awaited<ReturnType<DemoChecklistService['ejecutar']>>, id: string) =>
  r.chequeos.find((c) => c.id === id)!;

describe('DemoChecklistService', () => {
  it('con todo en orden devuelve los cuatro chequeos en «listo»', async () => {
    const r = await crear().ejecutar();
    expect(r.chequeos.map((c) => c.estado)).toEqual(['listo', 'listo', 'listo', 'listo']);
  });

  it('migraciones faltantes → pendiente y nombra cuáles faltan', async () => {
    const r = await crear({ $queryRaw: jest.fn().mockResolvedValue([{ migration_name: MIGRACIONES_REQUERIDAS[0] }]) }).ejecutar();
    const m = porId(r, 'migraciones');
    expect(m.estado).toBe('pendiente');
    expect(m.detalle).toContain(MIGRACIONES_REQUERIDAS[1]);
    expect(m.detalle).not.toContain(`Faltan: ${MIGRACIONES_REQUERIDAS[0]}`);
  });

  it('si la consulta de vacantes falla queda «pendiente» y los demás chequeos siguen', async () => {
    const r = await crear({
      vacante: { findMany: jest.fn().mockRejectedValue(new Error('column does not exist')), count: jest.fn() },
    }).ejecutar();
    expect(porId(r, 'vacantes').estado).toBe('pendiente');
    expect(porId(r, 'migraciones').estado).toBe('listo');
    expect(porId(r, 'afinidad-postulacion').estado).toBe('listo');
  });

  it('sin vacantes publicadas pide revisar', async () => {
    const r = await crear({ vacante: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) } }).ejecutar();
    expect(porId(r, 'vacantes').estado).toBe('revisar');
  });

  it('falta una cuenta por rol → revisar', async () => {
    const count = jest.fn().mockImplementation(async ({ where }: { where: Record<string, unknown> }) => (where.rol === 'empresa' ? 0 : 1));
    const r = await crear({ usuario: { count } }).ejecutar();
    const l = porId(r, 'login-por-rol');
    expect(l.estado).toBe('revisar');
    expect(l.detalle).toContain('empresa');
  });

  it('afinidad: sin postulaciones → pendiente; todas con porcentaje → revisar', async () => {
    const vacio = await crear({ postulacion: { count: jest.fn().mockResolvedValue(0) } }).ejecutar();
    expect(porId(vacio, 'afinidad-postulacion').estado).toBe('pendiente');
    const soloCon = await crear({
      postulacion: { count: jest.fn().mockImplementation(async ({ where }: { where: Record<string, unknown> }) => (where.porcentaje_match === null ? 0 : 5)) },
    }).ejecutar();
    expect(porId(soloCon, 'afinidad-postulacion').estado).toBe('revisar');
  });
});

describe('DemoChecklistController', () => {
  it('solo permite administrador y empresa', () => {
    const roles = Reflect.getMetadata(REQUIRED_ROLES, DemoChecklistController.prototype.checklist);
    expect(roles).toEqual(['administrador', 'empresa']);
  });
});
