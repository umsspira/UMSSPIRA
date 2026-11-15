import { Logger } from '@nestjs/common';
import type { DictionaryEntry } from '../../domain/entities/dictionary-entry';
import type { KeywordDictionaryPort } from '../ports/keyword-dictionary.port';
import { KeywordDictionaryLoader } from './keyword-dictionary-loader';
import { NLP_DICTIONARY_UNAVAILABLE } from '../../domain/errors/nlp-dictionary-unavailable-error';
import { KeywordExtractorService } from './keyword-extractor.service';

const ENTRIES: DictionaryEntry[] = [
  { canonical: 'node.js', aliases: ['nodejs'] },
  { canonical: 'javascript', aliases: ['js'] },
  { canonical: 'machine learning', aliases: ['ml'] },
  { canonical: 'gobierno de ti', aliases: [] },
];

class FakeDictionarySource implements KeywordDictionaryPort {
  calls = 0;
  fail = false;

  constructor(public entries: DictionaryEntry[] = ENTRIES) {}

  async load(): Promise<DictionaryEntry[]> {
    this.calls += 1;

    if (this.fail) {
      throw new Error('base de datos no disponible');
    }

    return this.entries;
  }
}

function createLoader(source: FakeDictionarySource) {
  return new KeywordDictionaryLoader(source, new KeywordExtractorService());
}

describe('KeywordDictionaryLoader', () => {
  it('carga una sola vez y conserva el diccionario en memoria', async () => {
    const source = new FakeDictionarySource();
    const loader = createLoader(source);

    await loader.ensureLoaded();
    await loader.ensureLoaded();

    expect(source.calls).toBe(1);
  });

  it('comparte una única carga entre peticiones concurrentes', async () => {
    const source = new FakeDictionarySource();
    const loader = createLoader(source);

    await Promise.all(Array.from({ length: 5 }, () => loader.ensureLoaded()));

    expect(source.calls).toBe(1);
  });

  it('falla con 503 y reintenta en la siguiente petición', async () => {
    const source = new FakeDictionarySource();
    source.fail = true;
    const loader = createLoader(source);

    await expect(loader.ensureLoaded()).rejects.toMatchObject({
      code: NLP_DICTIONARY_UNAVAILABLE,
      name: 'NlpDictionaryUnavailableError',
    });
    expect(source.calls).toBe(1);

    source.fail = false;
    await expect(loader.ensureLoaded()).resolves.toBeUndefined();
    expect(source.calls).toBe(2);
  });

  it('rechaza un diccionario vacío y permite reintentar', async () => {
    const source = new FakeDictionarySource([]);
    const loader = createLoader(source);

    await expect(loader.ensureLoaded()).rejects.toMatchObject({
      code: NLP_DICTIONARY_UNAVAILABLE,
    });

    source.entries = ENTRIES;
    await expect(loader.ensureLoaded()).resolves.toBeUndefined();
    expect(source.calls).toBe(2);
  });

  it('rechaza un diccionario cuyas claves son todas inválidas', async () => {
    const source = new FakeDictionarySource([{ canonical: 'Node.JS', aliases: [] }]);
    const loader = createLoader(source);

    await expect(loader.ensureLoaded()).rejects.toMatchObject({
      code: NLP_DICTIONARY_UNAVAILABLE,
    });
  });

  it('el calentamiento no propaga errores', async () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    const source = new FakeDictionarySource();
    source.fail = true;
    const loader = createLoader(source);

    try {
      await expect(loader.warmUp()).resolves.toBeUndefined();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('se reintentará'));
    } finally {
      warn.mockRestore();
    }
  });

  it('advierte las claves ignoradas sin volcar el diccionario completo', async () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    const source = new FakeDictionarySource([
      { canonical: 'node.js', aliases: [] },
      { canonical: 'Node.JS', aliases: [] },
      { canonical: 'una frase con demasiadas palabras', aliases: [] },
    ]);
    const loader = createLoader(source);

    try {
      await loader.ensureLoaded();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('2 claves ignoradas'));
    } finally {
      warn.mockRestore();
    }
  });

  it('carga términos y alias para extraer keywords canónicas sin mapear áreas', async () => {
    const source = new FakeDictionarySource();
    const extractor = new KeywordExtractorService();
    const loader = new KeywordDictionaryLoader(source, extractor);

    await loader.ensureLoaded();

    expect(extractor.extract('nodejs JS ML').keywords).toEqual([
      { term: 'javascript', count: 1 },
      { term: 'machine learning', count: 1 },
      { term: 'node.js', count: 1 },
    ]);
  });
});
