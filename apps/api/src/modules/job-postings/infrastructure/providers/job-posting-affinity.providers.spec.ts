import { Test, type TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { KEYWORD_DICTIONARY_PORT } from '../../../nlp/application/ports/keyword-dictionary.port';
import { KeywordExtractorService } from '../../../nlp/application/services/keyword-extractor.service';
import { DependencyUnavailableError } from '../../../../shared/errors/dependency-unavailable-error';
import {
  JOB_POSTING_AFFINITY_DATA,
  type JobPostingAffinityDataPort,
} from '../../application/ports/job-posting-affinity-data.port';
import { CalculateJobPostingAffinity } from '../../application/use-cases/calculate-job-posting-affinity.use-case';
import { JobPostingsModule } from '../../job-postings.module';

describe('HU10: composición real de lectores, NLP y cálculo', () => {
  const database = {
    titulado: { findMany: jest.fn() },
    vacante: { findMany: jest.fn() },
  };
  const dictionary = { load: jest.fn() };
  let module: TestingModule;

  beforeEach(async () => {
    jest.resetAllMocks();
    database.titulado.findMany.mockResolvedValue([
      {
        id: 'graduate',
        id_usuario: 'user',
        formacion_academica_registros: [{ titulo: 'Ingeniería', institucion: 'UMSS' }],
        experiencia_laboral_registros: [{ cargo: 'Backend', empresa: 'Empresa' }],
        certificacion_registros: [{ nombre: 'JS', entidad_emisora: 'Certificador' }],
        proyecto_registros: [{ nombre: 'API', descripcion: 'Servicios', tecnologias: 'Java' }],
        perfil_area_registros: [{ descripcion_profesional: 'machine\nlearning' }],
      },
    ]);
    database.vacante.findMany.mockResolvedValue([
      { id: 'v1', requisito_tecnico_registros: [{ nombre: 'JavaScript' }, { nombre: 'SQL' }] },
      { id: 'v2', requisito_tecnico_registros: [{ nombre: 'Java' }] },
      { id: 'v3', requisito_tecnico_registros: [{ nombre: 'Machine Learning' }] },
      { id: 'v4', requisito_tecnico_registros: [] },
    ]);
    dictionary.load.mockResolvedValue([
      { canonical: 'javascript', aliases: ['js'] },
      { canonical: 'java', aliases: [] },
      { canonical: 'machine learning', aliases: [] },
    ]);
    module = await Test.createTestingModule({ imports: [JobPostingsModule] })
      .overrideProvider(PrismaService)
      .useValue(database)
      .overrideProvider(KEYWORD_DICTIONARY_PORT)
      .useValue(dictionary)
      .compile();
  });

  afterEach(async () => {
    await module.close();
  });

  async function calculate() {
    const data = module.get<JobPostingAffinityDataPort>(JOB_POSTING_AFFINITY_DATA);
    const [profiles, vacancies] = await Promise.all([
      data.readProfiles(['user']),
      data.readRequirements(['v1', 'v2', 'v3', 'v4']),
    ]);
    return module.get(CalculateJobPostingAffinity).execute({ profile: profiles[0], vacancies });
  }

  it('resuelve dependencias y calcula con perfil real y una sola extracción, sin BD', async () => {
    const extract = jest.spyOn(module.get(KeywordExtractorService), 'extract');
    const results = await calculate();
    expect(results.map((item) => item.result.percentage)).toEqual([50, 100, 0, null]);
    expect(results[3].result.status).toBe('no-requirements');
    expect(results[0].result.comparison[0]).toEqual({
      requirement: 'JavaScript',
      matchedSkill: 'javascript',
      result: 'exact',
    });
    expect(extract).toHaveBeenCalledTimes(1);
    expect(database.titulado.findMany).toHaveBeenCalledTimes(1);
    expect(database.vacante.findMany).toHaveBeenCalledTimes(1);
    expect(dictionary.load).toHaveBeenCalledTimes(1);
    const result = results[0].result;
    expect(result.calculatedAt && new Date(result.calculatedAt).toISOString()).toBe(
      result.calculatedAt,
    );
  });

  it('propaga la dependencia reconocida por el filtro global y permite reintentar', async () => {
    dictionary.load.mockRejectedValueOnce(new Error('Diccionario temporalmente caído'));
    await expect(calculate()).rejects.toBeInstanceOf(DependencyUnavailableError);
    await expect(calculate()).resolves.toHaveLength(4);
    expect(dictionary.load).toHaveBeenCalledTimes(2);
  });
});
