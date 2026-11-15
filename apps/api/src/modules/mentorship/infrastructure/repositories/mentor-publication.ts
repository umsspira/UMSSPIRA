import { Prisma } from '../../../../generated/prisma/client';
import type { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';

/** Shared database rule for whether a mentor may be published to the directory. */
export const PUBLISHED_MENTORS_FROM_WHERE = Prisma.sql`
  FROM mentor AS m
  JOIN titulado AS t ON t.id = m.id_titulado
  JOIN usuario AS u ON u.usuario_id = t.id_usuario
  JOIN LATERAL (
    SELECT d.estado
    FROM disponibilidad_mentor AS d
    WHERE d.id_mentor = m.id
    ORDER BY d.fecha_actualizacion DESC NULLS LAST,
             d.fecha_creacion DESC NULLS LAST,
             d.id DESC
    LIMIT 1
  ) AS latest_availability ON TRUE
  WHERE m.esta_activo IS TRUE
    AND u.estado = 'ACTIVO'
    AND u.rol = 'titulado'
    AND latest_availability.estado = 'DISPONIBLE'
    AND EXISTS (
      SELECT 1
      FROM mentor_area AS selected_area
      JOIN area AS technical_area ON technical_area.id = selected_area.id_area
      WHERE selected_area.id_mentor = m.id
        AND technical_area.padre_id IS NULL
        AND technical_area.esta_activo IS TRUE
    )
    AND EXISTS (
      SELECT 1
      FROM mentor_area AS selected_interest
      JOIN area AS interest ON interest.id = selected_interest.id_area
      JOIN area AS technical_area ON technical_area.id = interest.padre_id
      WHERE selected_interest.id_mentor = m.id
        AND interest.padre_id IS NOT NULL
        AND interest.esta_activo IS TRUE
        AND technical_area.padre_id IS NULL
        AND technical_area.esta_activo IS TRUE
        AND EXISTS (
          SELECT 1
          FROM mentor_area AS selected_area
          WHERE selected_area.id_mentor = m.id
            AND selected_area.id_area = technical_area.id
        )
    )
`;

export async function isMentorPublished(
  db: PrismaService | Prisma.TransactionClient,
  mentorId: string,
): Promise<boolean> {
  const rows = await db.$queryRaw<Array<{ published: boolean }>>(Prisma.sql`
    SELECT EXISTS (
      SELECT 1
      ${PUBLISHED_MENTORS_FROM_WHERE}
        AND m.id = ${mentorId}::uuid
    ) AS published
  `);
  return rows[0]?.published === true;
}
