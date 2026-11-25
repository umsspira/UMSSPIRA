import { crearCertificacion, subirRespaldo } from '@/modules/profile/services/perfil-api';
import type { DraftRecord } from '@/modules/profile/state/drafts-store';

import { persistDraft } from './save-draft';

jest.mock('@/modules/profile/services/perfil-api', () => ({
  crearCertificacion: jest.fn(),
  subirRespaldo: jest.fn(),
}));
jest.mock('@/modules/profile/utils/backup-url', () => ({ urlDeArchivo: () => 'blob:respaldo' }));

function certificacion(respaldo: File | null): DraftRecord {
  return {
    id: 'borrador-1',
    section: 'certification',
    data: { nombre: 'AWS Cloud Practitioner', entidadEmisora: 'AWS', anioEmision: '2023', grado: '', respaldo },
  };
}

describe('persistDraft · certificación con respaldo (HU-18)', () => {
  beforeEach(() => {
    (crearCertificacion as jest.Mock).mockResolvedValue({ id: 'c1', name: 'AWS Cloud Practitioner' });
    (subirRespaldo as jest.Mock).mockResolvedValue(undefined);
  });

  it.each([
    ['respaldo.pdf', 'application/pdf', 'pdf'],
    ['respaldo.jpg', 'image/jpeg', 'image'],
  ])('un respaldo %s queda marcado como %s sin recargar', async (name, type, backupType) => {
    const saved = await persistDraft(certificacion(new File(['x'], name, { type })), new Map());
    expect(saved.record).toMatchObject({ backupFile: name, backupType });
  });

  it('sin respaldo no inventa el tipo', async () => {
    const saved = await persistDraft(certificacion(null), new Map());
    expect(saved.record).toMatchObject({ backupType: undefined });
  });
});
