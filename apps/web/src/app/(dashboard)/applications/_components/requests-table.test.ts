import { isOverdue } from './requests-table';
import type { BoardItem } from '@/modules/applications/frontend/services/applications-board.service';

describe('urgencia de la tabla', () => {
  const now = Date.parse('2026-10-24T20:00:00Z');
  const item = (age: number, status: BoardItem['status'] = 'PENDIENTE') => ({
    submittedAt: new Date(now - age).toISOString(), status,
  }) as BoardItem;
  it('coincide con el corte estricto del backend sin redondear horas', () => {
    expect(isOverdue(item(48 * 3600000), now)).toBe(false);
    expect(isOverdue(item(48 * 3600000 + 1), now)).toBe(true);
    expect(isOverdue(item(47 * 3600000), now)).toBe(false);
  });
  it.each(['APROBADA', 'OBSERVADA', 'RECHAZADA'] as const)('no marca una solicitud %s como urgente', (status) => {
    expect(isOverdue(item(72 * 3600000, status), now)).toBe(false);
  });
});
