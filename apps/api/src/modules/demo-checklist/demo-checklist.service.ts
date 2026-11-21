import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../shared/infrastructure/database/prisma.service';

export type EstadoChequeo = 'listo' | 'revisar' | 'pendiente';

export interface ChequeoDemo {
  id: 'migraciones' | 'vacantes' | 'login-por-rol' | 'afinidad-postulacion';
  estado: EstadoChequeo;
  detalle: string;
}

export const MIGRACIONES_REQUERIDAS = [
  '20261104000000_unificar_carrera_sistemas_seed',
  '20261116190000_epic5_hu001_requisitos_tecnicos',
] as const;

const ROLES_DEMO = ['titulado', 'empresa', 'administrador'] as const;

/**
 * Épica 5 · HU-19: comprobaciones reales del ambiente para la lista pre-demo.
 * Solo lee datos; nunca modifica la base. Cada chequeo se aísla: si uno falla
 * (por ejemplo, una columna que no existe por una migración pendiente) queda como
 * «pendiente» con su motivo y los demás se siguen calculando.
 */
@Injectable()
export class DemoChecklistService {
  private readonly logger = new Logger(DemoChecklistService.name);

  constructor(private readonly prisma: PrismaService) {}

  async ejecutar(): Promise<{ generadoEn: string; chequeos: ChequeoDemo[] }> {
    const chequeos = [
      await this.proteger('migraciones', () => this.migraciones()),
      await this.proteger('vacantes', () => this.vacantes()),
      await this.proteger('login-por-rol', () => this.loginPorRol()),
      await this.proteger('afinidad-postulacion', () => this.afinidad()),
    ];
    return { generadoEn: new Date().toISOString(), chequeos };
  }

  private async proteger(id: ChequeoDemo['id'], fn: () => Promise<ChequeoDemo>): Promise<ChequeoDemo> {
    try {
      return await fn();
    } catch (error) {
      this.logger.warn(`El chequeo ${id} falló: ${error instanceof Error ? error.message : 'error desconocido'}`);
      return { id, estado: 'pendiente', detalle: 'No se pudo comprobar: la consulta falló (¿faltan migraciones?).' };
    }
  }

  private async migraciones(): Promise<ChequeoDemo> {
    const filas = await this.prisma.$queryRaw<Array<{ migration_name: string }>>`
      SELECT migration_name FROM _prisma_migrations
      WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
        AND migration_name IN (${MIGRACIONES_REQUERIDAS[0]}, ${MIGRACIONES_REQUERIDAS[1]})`;
    const aplicadas = new Set(filas.map((f) => f.migration_name));
    const faltan = MIGRACIONES_REQUERIDAS.filter((m) => !aplicadas.has(m));
    return faltan.length === 0
      ? { id: 'migraciones', estado: 'listo', detalle: 'Las dos migraciones están aplicadas.' }
      : {
          id: 'migraciones',
          estado: 'pendiente',
          detalle: `Faltan: ${faltan.join(', ')}. Ejecutar pnpm --filter api db:deploy con la DIRECT_URL de producción.`,
        };
  }

  private async vacantes(): Promise<ChequeoDemo> {
    // Misma lectura que usa /job-postings: incluye la tabla de requisitos técnicos.
    await this.prisma.vacante.findMany({ take: 1, include: { requisito_tecnico_registros: true } });
    const publicadas = await this.prisma.vacante.count({ where: { estado: { in: ['PUBLICADO', 'PUBLICADA', 'ACTIVA'] } } });
    const conRequisitos = await this.prisma.vacante.count({
      where: { estado: { in: ['PUBLICADO', 'PUBLICADA', 'ACTIVA'] }, requisito_tecnico_registros: { some: {} } },
    });
    if (publicadas === 0) {
      return { id: 'vacantes', estado: 'revisar', detalle: 'La consulta responde, pero no hay vacantes publicadas.' };
    }
    return {
      id: 'vacantes',
      estado: 'listo',
      detalle: `La consulta responde: ${publicadas} vacantes publicadas, ${conRequisitos} con requisitos técnicos.`,
    };
  }

  private async loginPorRol(): Promise<ChequeoDemo> {
    const faltan: string[] = [];
    for (const rol of ROLES_DEMO) {
      const total = await this.prisma.usuario.count({
        where: { rol, estado: 'ACTIVO', cuenta_acceso: { isNot: null } },
      });
      if (total === 0) {
        faltan.push(rol);
      }
    }
    return faltan.length === 0
      ? { id: 'login-por-rol', estado: 'listo', detalle: 'Hay cuentas activas con acceso para titulado, empresa y administrador.' }
      : { id: 'login-por-rol', estado: 'revisar', detalle: `Sin cuenta activa con contraseña para: ${faltan.join(', ')}.` };
  }

  private async afinidad(): Promise<ChequeoDemo> {
    const con = await this.prisma.postulacion.count({ where: { porcentaje_match: { not: null } } });
    const sin = await this.prisma.postulacion.count({ where: { porcentaje_match: null } });
    if (con > 0 && sin > 0) {
      return { id: 'afinidad-postulacion', estado: 'listo', detalle: `${con} postulaciones con porcentaje y ${sin} sin calcular.` };
    }
    if (con + sin === 0) {
      return { id: 'afinidad-postulacion', estado: 'pendiente', detalle: 'No hay postulaciones. Ejecutar db:seed:demo.' };
    }
    return {
      id: 'afinidad-postulacion',
      estado: 'revisar',
      detalle: con === 0 ? 'Ninguna postulación tiene porcentaje calculado.' : 'Todas tienen porcentaje: falta un caso sin calcular.',
    };
  }
}
