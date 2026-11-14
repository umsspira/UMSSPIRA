export const RADAR_CERTIFICATION_READER_PORT = Symbol('RadarCertificationReaderPort');

export interface RadarCertificationSource {
  id: string;
  title: string;
  issuer: string;
  issuedYear: number | null;
  hasBackup: boolean;
}

export interface RadarCertificationReaderPort {
  getCertifications(graduateId: string): Promise<RadarCertificationSource[]>;
}
