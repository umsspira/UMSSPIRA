import { GetAreaCertificationsUseCase } from './get-area-certifications.use-case';
import { InMemoryRadarRepository } from '../../../../../test/adapters/in-memory-radar.repository';
import { KeywordExtractorService } from '../../../nlp/application/services/keyword-extractor.service';
import { RADAR_AREA_IDS } from '../../domain/entities/radar-area';
import type { RadarCertificationSource } from '../ports/certification-reader.port';
import { KeywordDictionaryUnavailableError } from '../../domain/errors/keyword-dictionary-unavailable-error';

describe('Certificaciones relacionadas con un área', () => {
  const reader = { getCertifications: jest.fn<Promise<RadarCertificationSource[]>, [string]>() };
  const engine = new KeywordExtractorService();
  const extractor = { extractFromTexts: jest.fn(async (texts: string[]) => engine.extract(texts.join('\n'))) };
  let repository: InMemoryRadarRepository;
  let useCase: GetAreaCertificationsUseCase;
  const aws = { id: 'aws', title: 'Certificación profesional', issuer: 'Amazon Web Services', issuedYear: 2026, hasBackup: true };
  const google = { id: 'google', title: 'Google Cloud Engineer', issuer: 'Google', issuedYear: 2023, hasBackup: false };

  beforeEach(() => {
    jest.clearAllMocks();
    engine.loadDictionary([{ canonical: 'aws', aliases: ['amazon web services'] }, { canonical: 'google cloud', aliases: [] }, { canonical: 'scrum', aliases: [] }]);
    repository = new InMemoryRadarRepository();
    repository.areaWeights = {
      [RADAR_AREA_IDS['cloud-devops']]: [{ term: 'aws', peso: 5 }, { term: 'google cloud', peso: 5 }],
      [RADAR_AREA_IDS['it-management']]: [{ term: 'scrum', peso: 4 }],
    };
    reader.getCertifications.mockResolvedValue([aws, google, { id: 'scrum', title: 'Scrum Master', issuer: 'Scrum.org', issuedYear: null, hasBackup: false }]);
    useCase = new GetAreaCertificationsUseCase(reader, extractor, repository);
  });

  it('usa alias y entidad emisora, e incluye certificados sin archivo', async () => {
    const result = await useCase.execute('titulado-autenticado', 'cloud-devops');
    expect(reader.getCertifications).toHaveBeenCalledWith('titulado-autenticado');
    expect(result.certifications).toEqual([
      { ...aws, matchedKeywords: ['aws'] }, { ...google, matchedKeywords: ['google cloud'] },
    ]);
    expect(extractor.extractFromTexts).toHaveBeenCalledWith([aws.title, aws.issuer]);
  });

  it('no confunde otra área con Cloud y devuelve vacío tras consultar todas las certificaciones', async () => {
    expect((await useCase.execute('own', 'quality-assurance')).certifications).toEqual([]);
    expect((await useCase.execute('own', 'it-management')).certifications.map(c => c.id)).toEqual(['scrum']);
  });

  it('no calcula ni persiste un radar al consultar las certificaciones', async () => {
    const save = jest.spyOn(repository, 'saveCalculation');
    const latest = jest.spyOn(repository, 'getLatestCalculation');
    await useCase.execute('own', 'cloud-devops');
    expect(save).not.toHaveBeenCalled();
    expect(latest).not.toHaveBeenCalled();
  });

  it('sin registros no carga innecesariamente el diccionario', async () => {
    reader.getCertifications.mockResolvedValue([]);
    expect((await useCase.execute('own', 'cloud-devops')).certifications).toEqual([]);
    expect(extractor.extractFromTexts).not.toHaveBeenCalled();
  });

  it('un diccionario no disponible es un error, no una falsa lista vacía', async () => {
    extractor.extractFromTexts.mockRejectedValueOnce(new KeywordDictionaryUnavailableError());
    await expect(useCase.execute('own', 'cloud-devops')).rejects.toBeInstanceOf(KeywordDictionaryUnavailableError);
  });
});
