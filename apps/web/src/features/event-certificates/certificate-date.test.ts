import { formatCertificateDate } from './certificate-date';

describe('HU19 - Formato de fechas', () => {
  it('convierte la fecha ISO al horario de Bolivia', () => {
    expect(
      formatCertificateDate('2026-11-14T23:51:00.000Z'),
    ).toBe('14 de noviembre de 2026 a las 19:51');
  });

  it('convierte correctamente el cambio de dia', () => {
    expect(
      formatCertificateDate('2026-11-20T01:08:00.000Z'),
    ).toBe('19 de noviembre de 2026 a las 21:08');
  });

  it('conserva fechas anteriores que no son ISO', () => {
    expect(formatCertificateDate('13/11/2026')).toBe('13/11/2026');
  });

  it('conserva valores invalidos sin producir errores', () => {
    expect(formatCertificateDate('fecha-invalida')).toBe('fecha-invalida');
  });
});
