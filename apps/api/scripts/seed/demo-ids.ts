import { RADAR_AREA_IDS } from '../../src/modules/radar/domain/entities/radar-area';

// Se reutilizan estos UUID en relaciones entre épicas; no cambian entre ejecuciones.
export const DEMO_IDS = {
  systemAdmin: '11000000-0000-4000-8000-000000000001',
  applications: {
    pending: '11000000-0000-4000-8000-000000000011',
    approved: '11000000-0000-4000-8000-000000000012',
    observed: '11000000-0000-4000-8000-000000000013',
    rejected: '11000000-0000-4000-8000-000000000014',
  },
  education: '22000000-0000-4000-8000-000000000001',
  certification: '22000000-0000-4000-8000-000000000003',
  keywords: {
    typescript: '33000000-0000-4000-8000-000000000001',
    postgres: '33000000-0000-4000-8000-000000000002',
    projects: '33000000-0000-4000-8000-000000000003',
  },
  radar: '33000000-0000-4000-8000-000000000020',
  requirement: '44000000-0000-4000-8000-000000000001',
  vacancy: '55000000-0000-4000-8000-000000000001',
  mentor: '66000000-0000-4000-8000-000000000001',
  publicEvent: '77000000-0000-4000-8000-000000000001',
  draftEvent: '77000000-0000-4000-8000-000000000002',
} as const;

export const AREA_IDS = {
  technology: '60000000-0000-4000-8000-000000000001',
  management: '60000000-0000-4000-8000-000000000002',
  software: RADAR_AREA_IDS['software-development'],
  data: '60000000-0000-4000-8000-000000000004',
  projects: '60000000-0000-4000-8000-000000000005',
  cloudDevops: RADAR_AREA_IDS['cloud-devops'],
  dataAi: RADAR_AREA_IDS['data-ai'],
  qualityAssurance: RADAR_AREA_IDS['quality-assurance'],
  cybersecurityNetworks: RADAR_AREA_IDS['cybersecurity-networks'],
  itManagement: RADAR_AREA_IDS['it-management'],
} as const;

// Intereses (áreas hijas) de las áreas raíz del mentor de demostración.
export const INTEREST_AREA_IDS = {
  networkSecurity: '60000000-0000-4000-8000-000000000101',
  pentesting: '60000000-0000-4000-8000-000000000102',
  incidentManagement: '60000000-0000-4000-8000-000000000103',
  machineLearning: '60000000-0000-4000-8000-000000000104',
  dataAnalytics: '60000000-0000-4000-8000-000000000105',
  deepLearning: '60000000-0000-4000-8000-000000000106',
  itil: '60000000-0000-4000-8000-000000000107',
  itServiceManagement: '60000000-0000-4000-8000-000000000108',
  itGovernance: '60000000-0000-4000-8000-000000000109',
  functionalTesting: '60000000-0000-4000-8000-00000000010a',
  testAutomation: '60000000-0000-4000-8000-00000000010b',
  performanceTesting: '60000000-0000-4000-8000-00000000010c',
  containers: '60000000-0000-4000-8000-00000000010d',
  kubernetes: '60000000-0000-4000-8000-00000000010e',
  cicd: '60000000-0000-4000-8000-00000000010f',
} as const;

export const CATALOG_IDS = {
  pdf: '01000000-0000-4000-8000-000000000001',
  jpg: '01000000-0000-4000-8000-000000000002',
  png: '01000000-0000-4000-8000-000000000003',
  onsite: '01000000-0000-4000-8000-000000000011',
  remote: '01000000-0000-4000-8000-000000000012',
  hybrid: '01000000-0000-4000-8000-000000000013',
  graduateReport: '01000000-0000-4000-8000-000000000021',
} as const;
