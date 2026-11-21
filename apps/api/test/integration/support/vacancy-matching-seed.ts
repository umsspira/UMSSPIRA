import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';

/**
 * Siembra datos sintéticos para la integración de afinidad de HU-10 (CA-07).
 * Usa SQL directo, como el resto de pruebas de integración, para no depender del cliente Prisma.
 */

/** Diccionario mínimo que el motor NLP necesita para reconocer las habilidades de los casos. */
export async function seedKeywordDictionary(pool: Pool, terms: readonly string[]): Promise<void> {
  for (const term of terms) {
    await pool.query(
      'INSERT INTO palabra_clave (nombre, termino_normalizado) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [term, term.trim().toLowerCase()],
    );
  }
}

export interface SeededGraduate {
  userId: string;
  graduateId: string;
}

/**
 * Titulado con perfil completo (formación, experiencia, certificación, proyecto y descripción).
 * Las habilidades técnicas solo aparecen en la descripción profesional.
 */
export async function seedGraduate(pool: Pool, description: string): Promise<SeededGraduate> {
  const userId = randomUUID();
  const graduateId = randomUUID();
  await pool.query(
    `INSERT INTO usuario (usuario_id, nombre, rol, correo, estado)
     VALUES ($1, 'Titulado de prueba', 'titulado', $2, 'ACTIVO')`,
    [userId, `titulado-${userId}@example.com`],
  );
  await pool.query('INSERT INTO titulado (id, id_usuario, nombre) VALUES ($1, $2, $3)', [
    graduateId,
    userId,
    'Titulado de prueba',
  ]);
  await pool.query(
    'INSERT INTO formacion_academica (id_titulado, titulo, institucion, anio_egreso) VALUES ($1, $2, $3, $4)',
    [graduateId, 'Licenciatura', 'UMSS', 2024],
  );
  await pool.query(
    'INSERT INTO experiencia_laboral (id_titulado, cargo, empresa, fecha_inicio) VALUES ($1, $2, $3, $4)',
    [graduateId, 'Analista', 'Empresa de prueba', '2024-01-01'],
  );
  await pool.query(
    'INSERT INTO certificacion (id_titulado, nombre, entidad_emisora, grado) VALUES ($1, $2, $3, $4)',
    [graduateId, 'Certificado general', 'Instituto de prueba', 'Básico'],
  );
  await pool.query(
    'INSERT INTO proyecto (id_titulado, nombre, descripcion, tecnologias, enlace) VALUES ($1, $2, $3, $4, $5)',
    [graduateId, 'Proyecto de prueba', 'Proyecto académico', 'Figma', 'https://example.com/proyecto'],
  );
  await pool.query('INSERT INTO perfil_area (id_titulado, descripcion_profesional) VALUES ($1, $2)', [
    graduateId,
    description,
  ]);
  return { userId, graduateId };
}

export interface SeededVacancy {
  companyUserId: string;
  companyId: string;
  vacancyId: string;
}

/** Empresa con una vacante publicada y sus requisitos técnicos estructurados. */
export async function seedCompanyVacancy(
  pool: Pool,
  requirements: readonly string[],
): Promise<SeededVacancy> {
  const companyUserId = randomUUID();
  const companyId = randomUUID();
  const vacancyId = randomUUID();
  await pool.query(
    `INSERT INTO usuario (usuario_id, nombre, rol, correo, estado)
     VALUES ($1, 'Empresa de prueba', 'empresa', $2, 'ACTIVO')`,
    [companyUserId, `empresa-${companyUserId}@example.com`],
  );
  await pool.query('INSERT INTO empresa (id, id_usuario, razon_social, nit) VALUES ($1, $2, $3, $4)', [
    companyId,
    companyUserId,
    'Empresa de prueba SRL',
    `NIT-${companyId.slice(0, 8)}`,
  ]);
  await pool.query(
    `INSERT INTO vacante (id, id_empresa, titulo, estado, fecha_publicacion)
     VALUES ($1, $2, 'Vacante de prueba', 'PUBLICADO', now())`,
    [vacancyId, companyId],
  );
  for (const requirement of requirements) {
    await pool.query(
      'INSERT INTO vacante_requisito_tecnico (id_vacante, nombre, nombre_normalizado) VALUES ($1, $2, $3)',
      [vacancyId, requirement, requirement.trim().toLowerCase()],
    );
  }
  return { companyUserId, companyId, vacancyId };
}

/** Postulación sin afinidad calculada: porcentaje y fecha nulos a la vez (CHECK de la migración). */
export async function seedApplication(pool: Pool, userId: string, vacancyId: string): Promise<string> {
  const applicationId = randomUUID();
  await pool.query(
    "INSERT INTO postulacion (id, id_usuario, id_vacante, estado) VALUES ($1, $2, $3, 'postulado')",
    [applicationId, userId, vacancyId],
  );
  return applicationId;
}
