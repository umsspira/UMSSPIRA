import { z } from 'zod';

export const WORK_MODALITIES = ['Presencial', 'Remoto', 'Híbrido', 'Hibrido'] as const;

export const SALARY_RANGES = [
  '0–2.999',
  '3.000–5.000',
  '5.001–8.000',
  '8.001–12.000',
  '12.001–21.000',
] as const;

const normalizeDashes = (str: unknown) =>
  typeof str === 'string' ? str.replace(/-/g, '–') : str;

const meaningfulText = (maxChars: number, fieldName: string) =>
  z
    .string()
    .trim()
    .min(1, 'Este campo es obligatorio')
    .max(maxChars, `No puede exceder ${maxChars} caracteres`)
    .refine(
      (val) => (val.match(/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g) ?? []).length >= 2,
      `Ingresa un ${fieldName} válido`,
    );

export const submitSurveySchema = z
  .object({
    id_encuesta: z.string().uuid().optional(),
    condicion_laboral: z.boolean(),

    cargo: meaningfulText(150, 'cargo').optional(),
    empresa: meaningfulText(200, 'empresa').optional(),
    area: meaningfulText(150, 'área').optional(),

    modalidad: z
      .enum(WORK_MODALITIES, {
        message: 'Seleccione una modalidad válida',
      })
      .transform((val) => (val === 'Híbrido' ? 'Hibrido' : val))
      .optional(),

    salario_mensual: z
      .preprocess(
        normalizeDashes,
        z.enum(SALARY_RANGES, {
          message: 'Seleccione un rango de salario válido',
        }),
      )
      .optional(),

    tiempo_insercion: z
      .string()
      .trim()
      .regex(/^\d+$/, 'El tiempo de inserción debe ser un número entero de meses')
      .max(40)
      .optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.condicion_laboral) {
      const requiredFields = [
        'cargo',
        'empresa',
        'area',
        'modalidad',
        'salario_mensual',
        'tiempo_insercion',
      ] as const;

      for (const field of requiredFields) {
        if (!data[field]) {
          ctx.addIssue({
            code: 'custom',
            path: [field],
            message: 'Este campo es obligatorio',
          });
        }
      }
    } else {
      const jobFields = [
        'cargo',
        'empresa',
        'area',
        'modalidad',
        'salario_mensual',
        'tiempo_insercion',
      ] as const;

      for (const field of jobFields) {
        if (data[field] !== undefined) {
          ctx.addIssue({
            code: 'custom',
            path: [field],
            message: 'No corresponde si no trabaja',
          });
        }
      }
    }
  });

export type SubmitSurveyDto = z.infer<typeof submitSurveySchema>;
