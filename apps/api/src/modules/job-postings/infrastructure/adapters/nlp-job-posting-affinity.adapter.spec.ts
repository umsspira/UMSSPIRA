import { KeywordDictionaryLoader } from '../../../nlp/application/services/keyword-dictionary-loader';
import { KeywordExtractorService } from '../../../nlp/application/services/keyword-extractor.service';
import { DependencyUnavailableError } from '../../../../shared/errors/dependency-unavailable-error';
import { AffinityDictionaryUnavailableError } from '../../domain/errors/affinity-dictionary-unavailable.error';
import { NlpJobPostingAffinityAdapter } from './nlp-job-posting-affinity.adapter';

describe('HU10: adaptador al NLP real sin base de datos', () => {
  const entries = [
    { canonical: 'javascript', aliases: ['js'] },
    { canonical: 'java', aliases: [] },
    { canonical: 'machine learning', aliases: ['ml'] },
  ];
  const source = { load: jest.fn() };
  let extractor: KeywordExtractorService;
  let dictionary: KeywordDictionaryLoader;
  let adapter: NlpJobPostingAffinityAdapter;

  beforeEach(() => {
    source.load.mockReset().mockResolvedValue(entries);
    extractor = new KeywordExtractorService();
    dictionary = new KeywordDictionaryLoader(source, extractor);
    adapter = new NlpJobPostingAffinityAdapter(dictionary, extractor);
  });

  it('entrega el extractor ya cargado: canónicas, compuestas y sin mezclar Java/JavaScript', async () => {
    const loaded = await adapter.loadExtractor();
    expect(loaded.extract('JS y Java\nMachine Learning\nJS').keywords.map(({ term }) => term)).toEqual([
      'javascript',
      'java',
      'machine learning',
    ]);
  });

  it('no forma machine learning entre dos campos separados', async () => {
    const loaded = await adapter.loadExtractor();
    expect(loaded.extract('machine\nlearning').keywords).toEqual([]);
  });

  it('reutiliza el diccionario ya cargado', async () => {
    await adapter.loadExtractor();
    await adapter.loadExtractor();
    expect(source.load).toHaveBeenCalledTimes(1);
  });

  it('traduce una caída a dependencia 503 y permite reintentar sin devolver habilidades vacías', async () => {
    source.load.mockRejectedValueOnce(new Error('Base no disponible'));
    await expect(adapter.loadExtractor()).rejects.toMatchObject({
      code: 'NLP_DICTIONARY_UNAVAILABLE',
    });
    const loaded = await adapter.loadExtractor();
    expect(loaded.extract('JS').keywords.map(({ term }) => term)).toEqual(['javascript']);
    expect(source.load).toHaveBeenCalledTimes(2);
    expect(new AffinityDictionaryUnavailableError()).toBeInstanceOf(DependencyUnavailableError);
  });

  it('un diccionario vacío también es indisponibilidad, no un 0 % válido', async () => {
    source.load.mockResolvedValue([]);
    await expect(adapter.loadExtractor()).rejects.toBeInstanceOf(
      AffinityDictionaryUnavailableError,
    );
  });

  it('no oculta errores inesperados del diccionario', async () => {
    const failure = new Error('Error del motor');
    jest.spyOn(dictionary, 'ensureLoaded').mockRejectedValue(failure);
    await expect(adapter.loadExtractor()).rejects.toBe(failure);
  });
});
