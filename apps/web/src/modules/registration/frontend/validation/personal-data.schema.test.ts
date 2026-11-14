import { EMAIL_MAX_LENGTH } from '@umsspira/shared-types';
import { personalDataSchema } from './personal-data.schema';

const correoSchema = personalDataSchema.shape.correo;

// Local de 64 caracteres y dominio con etiquetas válidas.
function correoLargo(terceraEtiqueta: number): string {
  return (
    `${'a'.repeat(64)}@` +
    `${'b'.repeat(63)}.` +
    `${'c'.repeat(63)}.` +
    `${'d'.repeat(terceraEtiqueta)}.com`
  );
}

describe('BUG-02: validación de correos largos', () => {
  it('acepta un correo válido de 31 caracteres', () => {
    const correo = `${'a'.repeat(19)}@ejemplo.com`;

    expect(correo).toHaveLength(31);
    expect(correoSchema.safeParse(correo).success).toBe(true);
  });

  it('acepta un correo válido de 254 caracteres', () => {
    const correo = correoLargo(57);

    expect(correo).toHaveLength(EMAIL_MAX_LENGTH);
    expect(correoSchema.safeParse(correo).success).toBe(true);
  });

  it('rechaza un correo de 255 caracteres con mensaje claro', () => {
    const correo = correoLargo(58);
    const resultado = correoSchema.safeParse(correo);

    expect(correo).toHaveLength(EMAIL_MAX_LENGTH + 1);
    expect(resultado.success).toBe(false);

    if (!resultado.success) {
      expect(
        resultado.error.issues.some((issue) =>
          issue.message.includes('254 caracteres'),
        ),
      ).toBe(true);
    }
  });

  it('rechaza un correo sin formato válido', () => {
    expect(correoSchema.safeParse('correo-invalido').success).toBe(false);
  });

  it('normaliza mayúsculas y espacios sin truncar el correo', () => {
    const correo = '  NOMBRE.LARGO@EJEMPLO.COM  ';
    const resultado = correoSchema.safeParse(correo);

    expect(resultado.success).toBe(true);

    if (resultado.success) {
      expect(resultado.data).toBe('nombre.largo@ejemplo.com');
    }
  });
});
