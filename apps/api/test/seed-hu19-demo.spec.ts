// @ts-ignore
import { describe, it, expect, jest } from '@jest/globals';
import type { PrismaClient } from '../src/generated/prisma/client';
import {
  HU19_VACANCY_IDS,
  normalizarRequisito,
  postulacionesHu19,
  requisitosHu19,
  seedHu19,
  vacantesHu19,
} from '../scripts/seed/hu19-demo';

describe('Seed HU-19 (ambiente de demo)', () => {
  it('cada vacante nueva tiene requisitos técnicos, salvo la que prueba el caso sin requisitos', () => {
    const conRequisitos = new Set((requisitosHu19 as any[]).map((r) => r.id_vacante));
    
    for (const v of (vacantesHu19 as any[])) {
      if (v.id === HU19_VACANCY_IDS.sinRequisitos) {
        expect(conRequisitos.has(v.id)).toBe(false);
      } else {
        expect(conRequisitos.has(v.id)).toBe(true);
      }
    }
  });

  it('no repite requisitos normalizados dentro de una vacante ni ids', () => {
    const claves = (requisitosHu19 as any[]).map((r) => `${r.id_vacante}|${r.nombre_normalizado}`);
    expect(new Set(claves).size).toBe(claves.length);
    const ids = (requisitosHu19 as any[]).map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('normaliza tildes, mayúsculas y espacios', () => {
    expect(normalizarRequisito('  Visualización   de Datos ')).toBe('visualizacion de datos');
  });

  it('incluye postulaciones con y sin afinidad calculada', () => {
    expect(postulacionesHu19.some((p: any) => p.porcentaje_match === null)).toBe(true);
    expect(postulacionesHu19.some((p: any) => typeof p.porcentaje_match === 'number')).toBe(true);
    const ids = postulacionesHu19.map((p: any) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('es idempotente: todo se inserta con skipDuplicates', async () => {
    const createMany = jest.fn().mockResolvedValue({ count: 0 });
    const prisma = {
      vacante: { createMany },
      vacanteRequisitoTecnico: { createMany },
      usuario: { createMany },
      titulado: { createMany },
      perfilArea: { createMany },
      postulacion: { createMany },
    } as unknown as PrismaClient;
    
    await seedHu19(prisma);
    await seedHu19(prisma);
    
    expect(createMany).toHaveBeenCalledTimes(12);
    for (const [arg] of createMany.mock.calls) {
      expect(arg.skipDuplicates).toBe(true);
    }
  });
});
