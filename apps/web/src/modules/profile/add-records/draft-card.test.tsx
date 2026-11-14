import { describeDraft } from './draft-card';

describe('describeDraft', () => {
  it('formación: título y «institución · año · grado»', () => {
    expect(
      describeDraft({
        id: 'b1',
        section: 'education',
        data: { institucion: 'UMSS', titulo: 'Ingeniería de Sistemas', anioEgreso: '2018', grado: 'Licenciatura' },
      }),
    ).toEqual({ title: 'Ingeniería de Sistemas', detail: 'UMSS · 2018 · Licenciatura' });
  });

  it('experiencia: cargo y meses de inicio y fin, o «Presente» si es actual', () => {
    const base = { empresa: 'Jalasoft', cargo: 'Desarrollador', fechaInicio: '2021-03-15' };
    expect(describeDraft({ id: 'b2', section: 'experience', data: base }).detail).toBe('Jalasoft · Mar 2021 – Presente');
    expect(
      describeDraft({ id: 'b3', section: 'experience', data: { ...base, fechaFin: '2023-12-01' } }).detail,
    ).toBe('Jalasoft · Mar 2021 – Dic 2023');
  });

  it('certificación: indica el tipo de respaldo si lo tiene', () => {
    const data = { nombre: 'AWS Solutions Architect', entidadEmisora: 'Amazon Web Services', anioEmision: '2022', grado: '', respaldo: null };
    expect(describeDraft({ id: 'b4', section: 'certification', data }).detail).toBe('Amazon Web Services · 2022');
    const respaldo = new File(['x'], 'respaldo.jpg', { type: 'image/jpeg' });
    expect(describeDraft({ id: 'b5', section: 'certification', data: { ...data, respaldo } }).detail).toBe(
      'Amazon Web Services · 2022 · Respaldo JPG',
    );
  });
});
