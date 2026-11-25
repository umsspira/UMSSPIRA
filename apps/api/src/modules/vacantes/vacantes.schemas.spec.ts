import { updateVacanteSchema } from './vacantes.schemas';

describe('updateVacanteSchema (HU-13)', () => {
  it('acepta el payload exacto del formulario de edición', () => {
    const result = updateVacanteSchema.safeParse({
      titulo: 'Desarrollador web junior',
      modalidad: 'HIBRIDO',
      nivel_experiencia: 'Junior',
      descripcion_tecnica: 'Requisitos técnicos de la vacante con al menos cincuenta caracteres.',
    });
    expect(result.success).toBe(true);
  });

  it('acepta una actualización parcial con un solo campo', () => {
    expect(updateVacanteSchema.safeParse({ estado: 'PAUSADA' }).success).toBe(true);
  });

  it('rechaza un body sin ningún campo', () => {
    const result = updateVacanteSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rechaza campos adicionales', () => {
    const result = updateVacanteSchema.safeParse({ titulo: 'Nueva', id_empresa: 'otra' });
    expect(result.success).toBe(false);
  });

  it('rechaza una modalidad fuera del vocabulario del alta', () => {
    const result = updateVacanteSchema.safeParse({ modalidad: 'Híbrido' });
    expect(result.success).toBe(false);
  });

  it('rechaza títulos vacíos o mayores a 150 caracteres', () => {
    expect(updateVacanteSchema.safeParse({ titulo: '   ' }).success).toBe(false);
    expect(updateVacanteSchema.safeParse({ titulo: 'x'.repeat(151) }).success).toBe(false);
  });

  it('rechaza descripciones fuera de los límites del alta (50-20000)', () => {
    expect(updateVacanteSchema.safeParse({ descripcion_tecnica: 'corta' }).success).toBe(false);
    expect(updateVacanteSchema.safeParse({ descripcion_tecnica: 'x'.repeat(20001) }).success).toBe(false);
  });

  it('recorta los espacios de los valores de texto', () => {
    const result = updateVacanteSchema.safeParse({ titulo: '  Vacante  ' });
    expect(result.success).toBe(true);
    if (result.success) {expect(result.data.titulo).toBe('Vacante');}
  });

  it('normaliza los alias de estado al vocabulario único (HU-14)', () => {
    const result = updateVacanteSchema.safeParse({ estado: 'pausada' });
    expect(result.success).toBe(true);
    if (result.success) {expect(result.data.estado).toBe('PAUSADO');}
  });

  it('acepta los tres estados canónicos (HU-14)', () => {
    for (const estado of ['PUBLICADO', 'PAUSADO', 'CERRADO']) {
      const result = updateVacanteSchema.safeParse({ estado });
      expect(result.success).toBe(true);
      if (result.success) {expect(result.data.estado).toBe(estado);}
    }
  });

  it('rechaza un estado fuera del vocabulario (HU-14)', () => {
    expect(updateVacanteSchema.safeParse({ estado: 'INVENTADO' }).success).toBe(false);
    expect(updateVacanteSchema.safeParse({ estado: 'BORRADOR' }).success).toBe(false);
  });
});