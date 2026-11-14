import type { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { KeywordExtractorService } from '../../../nlp/application/services/keyword-extractor.service';
import { RADAR_AREA_IDS } from '../../domain/entities/radar-area';
import { calculateAreaAffinity } from '../../domain/policies/affinity-calculator';
import { calculateInputHash } from '../../domain/policies/input-hash';
import { mapKeywordsToRadarAreas } from '../../domain/policies/keyword-area-mapper';
import { PrismaProfileTextReaderAdapter } from './prisma-profile-text-reader.adapter';

function buildPrisma(params: {
  description?: { descripcion_profesional: string | null } | null;
  otherDescriptions?: Array<{ descripcion_profesional: string | null }>;
  projects?: Array<{ nombre: string; descripcion: string; tecnologias: string | null }>;
}) {
  const findFirst = jest.fn().mockResolvedValue(params.description ?? null);
  const findManyDescriptions = jest.fn().mockResolvedValue(params.otherDescriptions ?? []);
  const findManyProjects = jest.fn().mockResolvedValue(params.projects ?? []);
  const prisma = {
    formacionAcademica: { findMany: jest.fn().mockResolvedValue([]) },
    experienciaLaboral: { findMany: jest.fn().mockResolvedValue([]) },
    certificacion: { findMany: jest.fn().mockResolvedValue([]) },
    perfilArea: { findFirst, findMany: findManyDescriptions },
    proyecto: { findMany: findManyProjects },
  };

  return {
    adapter: new PrismaProfileTextReaderAdapter(prisma as unknown as PrismaService),
    findFirst,
    findManyDescriptions,
    findManyProjects,
  };
}

const SOFTWARE_AREA_ID = RADAR_AREA_IDS['software-development'];

/** Puntaje del área Software con el mismo pipeline del recálculo (NLP, mapeo y afinidad). */
function softwareScore(texts: readonly string[]): number {
  const extractor = new KeywordExtractorService();
  extractor.loadDictionary([
    { canonical: 'react', aliases: [] },
    { canonical: 'typescript', aliases: [] },
  ]);
  const { keywords } = extractor.extract(texts.join('\n'));
  const weights = {
    [SOFTWARE_AREA_ID]: [
      { term: 'react', peso: 5 },
      { term: 'typescript', peso: 5 },
    ],
  };
  const mapped = mapKeywordsToRadarAreas(keywords, weights)
    .filter(({ areaId }) => areaId === SOFTWARE_AREA_ID)
    .map(({ term, peso }) => ({ term, peso }));

  return calculateAreaAffinity(keywords, mapped).puntaje;
}

describe('PrismaProfileTextReaderAdapter', () => {
  it('lee solo la descripción vigente y no suma las demás filas de perfil_area', async () => {
    const { adapter, findFirst, findManyDescriptions } = buildPrisma({
      description: { descripcion_profesional: 'Descripción vigente' },
      otherDescriptions: [
        { descripcion_profesional: 'Descripción antigua' },
        { descripcion_profesional: 'Descripción duplicada' },
      ],
    });

    const result = await adapter.getProfileTexts('titulado-1');

    expect(findFirst).toHaveBeenCalledWith({
      where: { id_titulado: 'titulado-1' },
      orderBy: [{ fecha_creacion: 'asc' }, { id: 'asc' }],
      select: { descripcion_profesional: true },
    });
    expect(findManyDescriptions).not.toHaveBeenCalled();
    expect(result.texts).toEqual(['Descripción vigente']);
  });

  it('conserva el hash de una sola fila', async () => {
    const { adapter } = buildPrisma({
      description: { descripcion_profesional: 'Descripción vigente' },
    });

    const result = await adapter.getProfileTexts('titulado-1');

    expect(calculateInputHash(result.texts)).toBe(calculateInputHash(['Descripción vigente']));
  });

  it('devuelve textos vacíos cuando no hay fila en perfil_area', async () => {
    const { adapter, findFirst } = buildPrisma({ description: null });

    const result = await adapter.getProfileTexts('titulado-1');

    expect(findFirst).toHaveBeenCalledTimes(1);
    expect(result.texts).toEqual([]);
  });

  it('ignora una descripción vacía o con solo espacios', async () => {
    const { adapter } = buildPrisma({
      description: { descripcion_profesional: '   ' },
    });

    const result = await adapter.getProfileTexts('titulado-1');

    expect(result.texts).toEqual([]);
  });

  it('lee nombre, descripción y tecnologías de los proyectos del titulado', async () => {
    const { adapter, findManyProjects } = buildPrisma({
      projects: [
        { nombre: ' Portafolio ', descripcion: 'Sitio personal', tecnologias: 'React, TypeScript' },
      ],
    });

    const result = await adapter.getProfileTexts('titulado-1');

    expect(findManyProjects).toHaveBeenCalledWith({
      where: { id_titulado: 'titulado-1' },
      select: { nombre: true, descripcion: true, tecnologias: true },
    });
    expect(result.texts).toEqual(['Portafolio', 'Sitio personal', 'React, TypeScript']);
  });

  it('un proyecto con «React, TypeScript» sube el área Software y cambia el hash', async () => {
    const withoutProject = await buildPrisma({}).adapter.getProfileTexts('titulado-1');
    const withProject = await buildPrisma({
      projects: [
        { nombre: 'Tienda', descripcion: 'Catálogo web', tecnologias: 'React, TypeScript' },
      ],
    }).adapter.getProfileTexts('titulado-1');

    expect(softwareScore(withoutProject.texts)).toBe(0);
    expect(softwareScore(withProject.texts)).toBeGreaterThan(0);
    expect(calculateInputHash(withProject.texts)).not.toBe(
      calculateInputHash(withoutProject.texts),
    );
  });

  it('al eliminar el proyecto el área Software baja y el hash vuelve al anterior', async () => {
    const base = { description: { descripcion_profesional: 'Desarrollador con React' } };
    const withProject = await buildPrisma({
      ...base,
      projects: [
        { nombre: 'Tienda', descripcion: 'Catálogo web', tecnologias: 'React, TypeScript' },
      ],
    }).adapter.getProfileTexts('titulado-1');
    const afterDelete = await buildPrisma(base).adapter.getProfileTexts('titulado-1');

    expect(softwareScore(afterDelete.texts)).toBeLessThan(softwareScore(withProject.texts));
    expect(calculateInputHash(afterDelete.texts)).toBe(
      calculateInputHash(['Desarrollador con React']),
    );
  });

  it('un proyecto sin tecnologías no rompe y omite los textos vacíos', async () => {
    const { adapter } = buildPrisma({
      projects: [
        { nombre: 'Blog', descripcion: '   ', tecnologias: null },
        { nombre: 'Agenda', descripcion: 'Turnos', tecnologias: '' },
      ],
    });

    const result = await adapter.getProfileTexts('titulado-1');

    expect(result.texts).toEqual(['Blog', 'Agenda', 'Turnos']);
    expect(softwareScore(result.texts)).toBe(0);
  });
});
