export interface ObservationContent {
  reasons: string[];
  explanation: string;
}

export interface ObservationContentInput {
  reasons?: readonly string[] | null;
  category?: string | null;
  explanation?: string | null;
  note?: string | null;
}

// Fuente única del contenido de una observación para la vista previa, el correo y la pantalla de corrección.
// Conserva el orden elegido, no repite motivos y acepta observaciones antiguas de una sola categoría.
export function toObservationContent(input: ObservationContentInput): ObservationContent {
  const chosen = (input.reasons ?? []).map((reason) => reason.trim()).filter(Boolean);
  const legacy = input.category?.trim();
  const reasons = [...new Set(chosen.length > 0 ? chosen : legacy ? [legacy] : [])];
  return { reasons, explanation: input.explanation ?? input.note ?? '' };
}