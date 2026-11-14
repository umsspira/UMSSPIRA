import 'reflect-metadata';
import type { FactoryProvider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@elastic/elasticsearch';
import { IndexacionVacantesModule } from './indexacion-vacantes.module';
import {
  ELASTICSEARCH_CLIENT,
  ELASTICSEARCH_INDEX,
} from './indexacion-vacantes.constants';

jest.mock('@elastic/elasticsearch', () => ({ Client: jest.fn() }));

function factory(token: string): FactoryProvider {
  const providers = Reflect.getMetadata(
    'providers',
    IndexacionVacantesModule,
  ) as unknown[];
  const provider = providers.find(
    (value) =>
      typeof value === 'object' &&
      value !== null &&
      'provide' in value &&
      value.provide === token,
  );
  if (!provider) {
    throw new Error('Fabrica no encontrada');
  }
  return provider as FactoryProvider;
}

describe('Fabricas HU4, sin registrar ni iniciar modulos NestJS', () => {
  const config = new ConfigService({
    ELASTICSEARCH_NODE: 'http://elasticsearch.invalid:9200',
    ELASTICSEARCH_INDEX_VACANTES: 'vacantes',
    ELASTICSEARCH_INDEX_JOB_POSTINGS: 'ofertas-v1',
    ELASTICSEARCH_API_KEY: 'clave-simulada',
  });

  it('resuelve el nuevo indice sin crear un cliente', () => {
    expect(factory(ELASTICSEARCH_INDEX).inject).toEqual([ConfigService]);
    expect(factory(ELASTICSEARCH_INDEX).useFactory(config)).toBe('ofertas-v1');
    expect(Client).not.toHaveBeenCalled();
  });

  it('configura solamente un cliente simulado con el nodo y autenticacion compartidos', () => {
    factory(ELASTICSEARCH_CLIENT).useFactory(config);
    expect(Client).toHaveBeenCalledWith({
      node: 'http://elasticsearch.invalid:9200',
      auth: { apiKey: 'clave-simulada' },
      maxRetries: 2,
      requestTimeout: 5000,
    });
  });
});
