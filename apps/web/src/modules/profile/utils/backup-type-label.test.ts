import type { CertificationRecord } from '@/modules/profile/types/profile-record';
import { backupTypeLabel } from './backup-type-label';
import { getRecordColumns } from './record-columns';

const base: CertificationRecord = {
  id: 'c-1',
  ownerId: 't-1',
  name: 'AWS',
  issuer: 'Amazon',
  degree: 'Profesional',
  issueYear: '2023',
};

function respaldo(record: CertificationRecord) {
  const column = getRecordColumns('certification').find((col) => col.label === 'Respaldo');
  return column?.getValue(record);
}

describe('tipo de respaldo en Mis registros (HU-18, T18.5)', () => {
  it('nombra PDF o Foto; sin tipo es una foto de antes de HU-18', () => {
    expect(backupTypeLabel('pdf')).toBe('PDF');
    expect(backupTypeLabel('image')).toBe('Foto');
    expect(backupTypeLabel(undefined)).toBe('Foto');
  });

  it('la columna Respaldo dice PDF, Foto o Sin respaldo', () => {
    expect(respaldo({ ...base, backupFile: 'titulo.pdf', backupType: 'pdf' })).toBe('PDF');
    expect(respaldo({ ...base, backupFile: 'foto.jpg', backupType: 'image' })).toBe('Foto');
    expect(respaldo(base)).toBe('Sin respaldo');
  });

  it('formación y experiencia no muestran la columna', () => {
    expect(getRecordColumns('education').some((col) => col.label === 'Respaldo')).toBe(false);
    expect(getRecordColumns('experience').some((col) => col.label === 'Respaldo')).toBe(false);
  });
});
