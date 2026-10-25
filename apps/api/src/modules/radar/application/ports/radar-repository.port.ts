import type { AffinityCalculation } from '../../domain/entities/affinity-calculation';

export const RADAR_REPOSITORY_PORT = Symbol('RADAR_REPOSITORY_PORT');

export interface RadarRepositoryPort {
  save(calculation: AffinityCalculation): Promise<void>;
}
