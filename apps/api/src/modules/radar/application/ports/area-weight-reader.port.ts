export interface AreaKeywordWeight {
  term: string;
  peso: number;
}

export type AreaWeightsById = Record<string, AreaKeywordWeight[]>;

export const RADAR_AREA_WEIGHT_READER_PORT = Symbol('RADAR_AREA_WEIGHT_READER_PORT');

/** Reads the current keyword weights used by the Radar module. */
export interface AreaWeightReaderPort {
  getAreaWeights(): Promise<AreaWeightsById>;
}
