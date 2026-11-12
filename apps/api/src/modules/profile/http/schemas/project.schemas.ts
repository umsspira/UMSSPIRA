import { z } from 'zod';
import {
  PROJECT_DESCRIPTION_MAX_LENGTH,
  PROJECT_NAME_MAX_LENGTH,
  PROJECT_URL_MAX_LENGTH,
} from '../../domain/entities/project';
import { isValidProjectUrl } from '../../domain/policies/project-url.policy';

// Mismo texto que muestra el formulario junto al campo (T19.3)
export const PROJECT_URL_MESSAGE = 'Ingresa una dirección https válida';

// Cuerpo de POST y PUT /perfil/proyectos (HU-19): nombre, enlace https y descripción corta opcional
export const projectSchema = z.strictObject({
  nombre: z.string().trim().min(1).max(PROJECT_NAME_MAX_LENGTH),
  url: z.string().trim().max(PROJECT_URL_MAX_LENGTH).refine(isValidProjectUrl, PROJECT_URL_MESSAGE),
  descripcion: z.string().trim().max(PROJECT_DESCRIPTION_MAX_LENGTH).nullable().optional(),
});

export type ProjectBody = z.infer<typeof projectSchema>;
