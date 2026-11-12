import { projectSchema } from './project.schemas';

describe('projectSchema (HU-19, T19.2)', () => {
  it('acepta nombre, enlace https y descripción opcional', () => {
    expect(
      projectSchema.parse({ nombre: ' Inventario ', url: 'https://github.com/ana/inventario' }),
    ).toEqual({ nombre: 'Inventario', url: 'https://github.com/ana/inventario' });
    expect(
      projectSchema.safeParse({
        nombre: 'Portafolio',
        url: 'https://ana.dev',
        descripcion: 'Mi sitio',
      }).success,
    ).toBe(true);
  });

  it('rechaza un enlace que no es https con el mensaje del formulario', () => {
    const result = projectSchema.safeParse({ nombre: 'Inventario', url: 'http://ana.dev' });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Ingresa una dirección https válida');
  });

  it('rechaza nombre vacío, descripción de más de 300 caracteres y campos extra', () => {
    expect(projectSchema.safeParse({ nombre: '  ', url: 'https://ana.dev' }).success).toBe(false);
    expect(
      projectSchema.safeParse({ nombre: 'A', url: 'https://ana.dev', descripcion: 'x'.repeat(301) })
        .success,
    ).toBe(false);
    expect(
      projectSchema.safeParse({ nombre: 'A', url: 'https://ana.dev', idTitulado: 'otro' }).success,
    ).toBe(false);
  });
});
