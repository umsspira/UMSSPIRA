import { buildProfileFileName, formatExportDate, slugifyName } from './profile-file-name';

describe('profile-file-name', () => {
  const date = new Date(2026, 9, 2); // 2 de octubre de 2026 (mes base 0)

  it('formatea la fecha como AAAA-MM-DD', () => {
    expect(formatExportDate(date)).toBe('2026-10-02');
  });

  it('normaliza el nombre sin tildes, en minúsculas y con guiones bajos', () => {
    expect(slugifyName('Carlos Mendoza Ríos')).toBe('carlos_mendoza_rios');
    expect(slugifyName('  María José  Peña ')).toBe('maria_jose_pena');
  });

  it('arma el nombre perfil_[nombre_egresado]_[fecha_exportacion].json', () => {
    expect(buildProfileFileName('Carlos Mendoza Ríos', date)).toBe(
      'perfil_carlos_mendoza_rios_2026-10-02.json',
    );
  });
});
