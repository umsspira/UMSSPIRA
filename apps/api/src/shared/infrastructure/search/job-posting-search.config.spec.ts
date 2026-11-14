import { ConfigService } from '@nestjs/config';
import {
  getJobPostingSearchConfig,
  resolveJobPostingsIndex,
} from './job-posting-search.config';

describe('Configuracion aislada de HU4/HU7', () => {
  it('utiliza un indice independiente por defecto', () => {
    expect(resolveJobPostingsIndex(undefined, undefined)).toBe(
      'job-postings-v1',
    );
  });

  it('normaliza un nombre literal y respeta un indice anterior personalizado', () => {
    expect(resolveJobPostingsIndex(' ofertas-v1 ', 'vacantes-legacy')).toBe(
      'ofertas-v1',
    );
  });

  it.each([
    '',
    ' ',
    '*',
    'ofertas*',
    'ofertas?',
    '[ofertas]',
    'uno,dos',
    'uno dos',
    'uno/dos',
    '<ofertas-{now}>',
    'OFERTAS',
    null,
    1,
  ])('rechaza nombres no literales: %s', (name) => {
    expect(() => resolveJobPostingsIndex(name, undefined)).toThrow();
  });

  it.each([
    ['vacantes', undefined],
    ['ofertas', 'ofertas'],
    [' ofertas ', ' ofertas '],
  ])('rechaza coincidencias con el indice anterior', (name, legacy) => {
    expect(() => resolveJobPostingsIndex(name, legacy)).toThrow('distinto');
  });

  it('comparte nodo, clave e indice sin utilizar ELASTICSEARCH_INDEX como alternativa', () => {
    const config = new ConfigService({
      ELASTICSEARCH_NODE: 'http://elasticsearch.invalid:9200/',
      ELASTICSEARCH_API_KEY: 'clave-simulada',
      ELASTICSEARCH_INDEX: 'indice-obsoleto',
      ELASTICSEARCH_INDEX_VACANTES: 'vacantes',
      ELASTICSEARCH_INDEX_JOB_POSTINGS: 'ofertas-v1',
    });
    expect(getJobPostingSearchConfig(config)).toEqual({
      node: 'http://elasticsearch.invalid:9200',
      index: 'ofertas-v1',
      apiKey: 'clave-simulada',
    });
    expect(config.get('ELASTICSEARCH_INDEX_VACANTES')).toBe('vacantes');
  });

  it('exige nodo configurado en lugar de elegir localhost implicitamente', () => {
    const config = new ConfigService({
      ELASTICSEARCH_NODE: '',
      ELASTICSEARCH_INDEX_JOB_POSTINGS: 'ofertas-v1',
    });
    expect(() => getJobPostingSearchConfig(config)).toThrow(
      'ELASTICSEARCH_NODE',
    );
  });
});
