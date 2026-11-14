import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import type { Environment } from '../../../config/environment';
import { DependencyUnavailableError } from '../../errors/dependency-unavailable-error';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;
  private connecting: Promise<void> | undefined;

  constructor(config: ConfigService<Environment, true>) {
    this.client = new Redis(config.get('REDIS_URL', { infer: true }), {
      lazyConnect: true,
      connectTimeout: 1500,
      commandTimeout: 2000,
      maxRetriesPerRequest: 0,
      enableOfflineQueue: false,
      retryStrategy: () => null,
    });
    this.client.on('error', () => this.logger.warn('Redis no está disponible'));
  }

  private async ensureConnected(): Promise<void> {
    if (this.client.status !== 'ready') {
      this.connecting ??= this.client.connect().finally(() => {
        this.connecting = undefined;
      });
      await this.connecting;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      await this.ensureConnected();
      const value = await this.client.get(key);
      if (value === null) {
        return null;
      }
      return JSON.parse(value) as T;
    } catch {
      this.logger.warn(`No se pudo leer la caché de Redis para la clave ${key}`);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    try {
      await this.ensureConnected();
      const payload = JSON.stringify(value);
      if (ttlSeconds === undefined) {
        await this.client.set(key, payload);
        return;
      }
      await this.client.set(key, payload, 'EX', ttlSeconds);
    } catch {
      this.logger.warn(`No se pudo guardar la caché de Redis para la clave ${key}`);
    }
  }

  async del(key: string): Promise<number> {
    try {
      await this.ensureConnected();
      return await this.client.del(key);
    } catch {
      this.logger.warn(`No se pudo eliminar la caché de Redis para la clave ${key}`);
      return 0;
    }
  }

  async deleteByPrefix(prefix: string): Promise<number> {
    try {
      await this.ensureConnected();
      const keys = await this.client.keys(`${prefix}*`);
      if (!keys.length) {
        return 0;
      }
      return await this.client.del(...keys);
    } catch {
      this.logger.warn(`No se pudo invalidar la caché de Redis con prefijo ${prefix}`);
      return 0;
    }
  }

  async invalidateAccreditationDashboardCache(careerId: string): Promise<void> {
    await this.deleteByPrefix(`acreditacion:indicadores:carrera:${careerId}:`);
  }

  async evaluate(script: string, key: string, args: number[]): Promise<unknown> {
    try {
      await this.ensureConnected();
      return await this.client.eval(script, 1, key, ...args);
    } catch {
      throw new DependencyUnavailableError();
    }
  }

  onModuleDestroy(): void {
    this.client.disconnect();
  }
}
