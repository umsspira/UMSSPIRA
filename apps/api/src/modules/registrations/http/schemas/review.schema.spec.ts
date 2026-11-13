import { reviewSchema } from './registrations.schemas';

describe('HU-16.1: validación de observaciones múltiples', () => {
  const validObservation = {
    decision: 'OBSERVADA',
    motivos: ['documento_ilegible', 'datos_no_coinciden'],
    note: 'Debe adjuntar un documento legible y corregir los datos.',
  };

  it('acepta varios motivos y una sola explicación', () => {
    const result = reviewSchema.safeParse(validObservation);

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.motivos).toHaveLength(2);
      expect(result.data.note).toBe(validObservation.note);
    }
  });

  it('acepta un único motivo', () => {
    const result = reviewSchema.safeParse({
      ...validObservation,
      motivos: ['documento_ilegible'],
    });

    expect(result.success).toBe(true);
  });

  it('rechaza motivos duplicados', () => {
    const result = reviewSchema.safeParse({
      ...validObservation,
      motivos: ['documento_ilegible', 'documento_ilegible'],
    });

    expect(result.success).toBe(false);
  });

  it('rechaza una observación sin motivos ni categoría', () => {
    const result = reviewSchema.safeParse({
      decision: 'OBSERVADA',
      note: 'Debe corregir el documento adjunto.',
    });

    expect(result.success).toBe(false);
  });

  it('rechaza una observación sin explicación', () => {
    const result = reviewSchema.safeParse({
      decision: 'OBSERVADA',
      motivos: ['documento_incompleto'],
    });

    expect(result.success).toBe(false);
  });

  it('mantiene compatibilidad con el formato anterior', () => {
    const result = reviewSchema.safeParse({
      decision: 'OBSERVADA',
      category: 'Documento ilegible',
      note: 'El documento anterior no se puede leer correctamente.',
    });

    expect(result.success).toBe(true);
  });

  it('mantiene el contrato anterior de rechazo', () => {
    const result = reviewSchema.safeParse({
      decision: 'RECHAZADA',
      category: 'Datos incorrectos',
      note: 'La información presentada no corresponde.',
    });

    expect(result.success).toBe(true);
  });

  it('rechaza motivos de observación en una aprobación', () => {
    const result = reviewSchema.safeParse({
      decision: 'APROBADA',
      motivos: ['documento_ilegible'],
    });

    expect(result.success).toBe(false);
  });

  it('rechaza motivos de observación en un rechazo', () => {
    const result = reviewSchema.safeParse({
      decision: 'RECHAZADA',
      category: 'Datos incorrectos',
      note: 'La información presentada no corresponde.',
      motivos: ['datos_no_coinciden'],
    });

    expect(result.success).toBe(false);
  });
});
