import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import type { Environment } from '../../../../config/environment';
import type { AccreditationCachePort } from '../../application/ports/accreditation-cache.port';
import type { AccreditationFilters } from '../../application/contracts/accreditation-filters';

const ACCREDITATION_CACHE_TTL_SECONDS = 300;

@Injectable()
export class AccreditationCache implements AccreditationCachePort, OnModuleDestroy {
  private readonly logger = new Logger(AccreditationCache.name);
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

  buildAccreditationDashboardCacheKey(
    careerIds: readonly string[],
    filters?: AccreditationFilters,
  ): string {
    const normalizedCareerIds = [...new Set(careerIds)].sort();
    const normalizedFilters = this.normalizeFilters(filters);
    const careerText = normalizedCareerIds.length ? normalizedCareerIds.join(',') : 'all';
    const filterText = normalizedFilters ? JSON.stringify(normalizedFilters) : 'general';
    return `acreditacion:indicadores:carrera:${careerText}:filtros:${filterText}`;
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

  async set<T>(key: string, value: T): Promise<void> {
    try {
      await this.ensureConnected();
      await this.client.set(key, JSON.stringify(value), 'EX', ACCREDITATION_CACHE_TTL_SECONDS);
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
      let cursor = '0';
      let deleted = 0;

      do {
        const [nextCursor, keys] = await this.client.scan(
          cursor,
          'MATCH',
          `${prefix}*`,
          'COUNT',
          100,
        );
        cursor = nextCursor;
        if (keys.length > 0) {
          deleted += await this.client.del(...keys);
        }
      } while (cursor !== '0');

      return deleted;
    } catch {
      this.logger.warn(`No se pudo invalidar la caché de Redis con prefijo ${prefix}`);
      return 0;
    }
  }

  async invalidateAccreditationDashboardCache(careerId: string): Promise<void> {
    await this.deleteByPrefix(`acreditacion:indicadores:carrera:${careerId}:`);
  }

  onModuleDestroy(): void {
    this.client.disconnect();
  }

  private async ensureConnected(): Promise<void> {
    if (this.client.status !== 'ready') {
      this.connecting ??= this.client.connect().finally(() => {
        this.connecting = undefined;
      });
      await this.connecting;
    }
  }

  private normalizeFilters(filters?: AccreditationFilters): AccreditationFilters | undefined {
    if (!filters) {
      return undefined;
    }
    const normalized: AccreditationFilters = {};
    if (filters.cohort !== undefined) {
      normalized.cohort = Number(filters.cohort);
    }
    if (filters.semester !== undefined) {
      normalized.semester = String(filters.semester).trim();
    }
    return Object.keys(normalized).length ? normalized : undefined;
  }
}
