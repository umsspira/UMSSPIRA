import type { Prisma } from '../../../../generated/prisma/client';
import { BusinessRuleError } from '../../../../shared/errors/business-rule-error';

// CA-14.4: aprobar con una posible diferencia sin resolver exige una nota interna.
export async function assertInternalNoteForDifferences(
  tx: Prisma.TransactionClient,
  id: string,
  revision: number,
) {
  const rows = await tx.$queryRaw<{ resultado: { findings?: { status?: string }[] } | null }[]>`
    SELECT r.resultado
    FROM ocr_resultado r JOIN ocr_trabajo j ON j.id = r.id_trabajo
    WHERE j.id_solicitud = ${id}::uuid AND j.revision = ${revision}::int
    ORDER BY r.creado_en DESC LIMIT 1`;
  const findings = rows[0]?.resultado?.findings ?? [];
  if (findings.some((finding) => finding.status === 'POSIBLE_DIFERENCIA')) {
    throw new BusinessRuleError(
      'invalid',
      'INTERNAL_NOTE_REQUIRED',
      'Aprobar con una diferencia sin resolver exige una nota interna',
    );
  }
}