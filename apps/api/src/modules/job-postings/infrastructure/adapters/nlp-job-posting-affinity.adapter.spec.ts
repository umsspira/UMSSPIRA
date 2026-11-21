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

  it('una extracción devuelve canónicas, preserva compuestas y no mezcla Java/JavaScript', async () => {
    const extract = jest.spyOn(extractor, 'extract');
    await expect(adapter.extractSkills(['JS y Java', 'Machine Learning', 'JS'])).resolves.toEqual([
      'javascript',
      'java',
      'machine learning',
    ]);
    expect(extract).toHaveBeenCalledTimes(1);
    expect(extract).toHaveBeenCalledWith('JS y Java\nMachine Learning\nJS');
  });

  it('no forma machine learning entre dos campos separados', async () => {
    await expect(adapter.extractSkills(['machine', 'learning'])).resolves.toEqual([]);
  });

  it('reutiliza el diccionario ya cargado', async () => {
    await adapter.extractSkills(['JS']);
    await adapter.extractSkills(['Java']);
    expect(source.load).toHaveBeenCalledTimes(1);
  });

  it('traduce una caída a dependencia 503 y permite reintentar sin devolver habilidades vacías', async () => {
    source.load.mockRejectedValueOnce(new Error('Base no disponible'));
    const extract = jest.spyOn(extractor, 'extract');
    await expect(adapter.extractSkills(['JS'])).rejects.toMatchObject({
      code: 'NLP_DICTIONARY_UNAVAILABLE',
    });
    expect(extract).not.toHaveBeenCalled();
    await expect(adapter.extractSkills(['JS'])).resolves.toEqual(['javascript']);
    expect(source.load).toHaveBeenCalledTimes(2);
    expect(new AffinityDictionaryUnavailableError()).toBeInstanceOf(DependencyUnavailableError);
  });

  it('un diccionario vacío también es indisponibilidad, no un 0 % válido', async () => {
    source.load.mockResolvedValue([]);
    await expect(adapter.extractSkills(['Java'])).rejects.toBeInstanceOf(
      AffinityDictionaryUnavailableError,
    );
  });

  it('no oculta errores inesperados del extractor', async () => {
    const failure = new Error('Error del motor');
    jest.spyOn(extractor, 'extract').mockImplementation(() => {
      throw failure;
    });
    await expect(adapter.extractSkills(['Java'])).rejects.toBe(failure);
  });
});
