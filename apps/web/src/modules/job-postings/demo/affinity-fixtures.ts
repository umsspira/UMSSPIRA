import type { VacancyAffinityResponse, MatchedSkill } from '@umsspira/shared-types';

export interface OpportunityItem {
  id: string;
  titulo: string;
  empresa: string;
  ubicacion: string;
  modalidad: string;
  nivel: string;
  area: string;
  tags: string[];
  porcentaje: number;
  resumenAfinidad: string;
  fechaActualizacion: string;
  notaExtra?: string;
}

export const DEMO_GRADUATE_PROFILE = {
  nombre: 'María Fernández',
  carrera: 'Ingeniería de Sistemas · UMSS',
  estadoDatos: 'Datos suficientes',
  habilidades: [
    'React',
    'TypeScript',
    'Git',
    'API REST',
    'SQL',
    'Colaboración en equipos ágiles',
  ],
  habilidadesDetalle: [
    'React',
    'TypeScript',
    'Git',
    'Diseño web adaptable',
    'Integración de servicios web',
    'CSS',
    'SQL',
  ],
  fechaActualizacion: '19 oct 2026 a las 09:40',
};

export const DEMO_OPPORTUNITIES: OpportunityItem[] = [
  {
    id: '80000000-0000-4000-8000-000000000001',
    titulo: 'Desarrollador Frontend',
    empresa: 'TechSolutions S.A.',
    ubicacion: 'Cochabamba',
    modalidad: 'Remoto',
    nivel: 'Junior',
    area: 'Tecnología',
    tags: ['React', 'TypeScript', 'Git', 'API REST'],
    porcentaje: 80,
    resumenAfinidad: '4 habilidades coincidentes y 1 similitud relevante',
    fechaActualizacion: '19 oct 2026 · 09:42',
  },
  {
    id: '80000000-0000-4000-8000-000000000002',
    titulo: 'Desarrollador Backend',
    empresa: 'TechSolutions S.A.',
    ubicacion: 'Cochabamba',
    modalidad: 'Remoto',
    nivel: 'Junior',
    area: 'Tecnología',
    tags: ['Python', 'Docker', 'API REST'],
    porcentaje: 64,
    resumenAfinidad: 'Coincides en API REST, Git y trabajo en equipo',
    fechaActualizacion: '19 oct 2026 · 09:42',
  },
  {
    id: '80000000-0000-4000-8000-000000000003',
    titulo: 'Analista de Datos',
    empresa: 'Andina Digital',
    ubicacion: 'Cochabamba',
    modalidad: 'Híbrido',
    nivel: 'Junior',
    area: 'Análisis de datos',
    tags: ['SQL', 'Power BI', 'ETL'],
    porcentaje: 32,
    resumenAfinidad: 'Tu experiencia con SQL aporta a esta vacante',
    fechaActualizacion: '19 oct 2026 · 09:42',
  },
  {
    id: '80000000-0000-4000-8000-000000000004',
    titulo: 'Ingeniero Agrónomo',
    empresa: 'Agrovalle S.R.L.',
    ubicacion: 'Cochabamba',
    modalidad: 'Presencial',
    nivel: 'Junior',
    area: 'Agronomía',
    tags: ['Riego', 'Suelos', 'Manejo de cultivos'],
    porcentaje: 0,
    resumenAfinidad: 'Datos suficientes; no se identificaron coincidencias',
    fechaActualizacion: '19 oct 2026 · 09:42',
    notaExtra: '0 % no significa cálculo pendiente.',
  },
];

export interface ComparisonRow {
  requisito: string;
  esDeseable?: boolean;
  habilidadPerfil: string;
  detallePerfil: string;
  resultado: 'Exacta' | 'Similar - NLP' | 'No encontrada';
}

export const DEMO_COMPARISON_ROWS: ComparisonRow[] = [
  {
    requisito: 'React',
    habilidadPerfil: 'React',
    detallePerfil: 'Mismo término en tu perfil.',
    resultado: 'Exacta',
  },
  {
    requisito: 'TypeScript',
    habilidadPerfil: 'TypeScript',
    detallePerfil: 'Mismo término en tu perfil.',
    resultado: 'Exacta',
  },
  {
    requisito: 'Git',
    habilidadPerfil: 'Git',
    detallePerfil: 'Mismo término en tu perfil.',
    resultado: 'Exacta',
  },
  {
    requisito: 'Diseño responsive',
    habilidadPerfil: 'Diseño web adaptable',
    detallePerfil: 'NLP detecta cercanía de significado.',
    resultado: 'Similar - NLP',
  },
  {
    requisito: 'Consumo de API REST',
    habilidadPerfil: 'Integración de servicios web',
    detallePerfil: 'Relación semántica: no acredita dominio equivalente.',
    resultado: 'Similar - NLP',
  },
  {
    requisito: 'Tailwind CSS',
    habilidadPerfil: 'Sin evidencia en el perfil',
    detallePerfil: 'CSS no acredita el uso de Tailwind CSS.',
    resultado: 'No encontrada',
  },
  {
    requisito: 'Jest - deseable',
    esDeseable: true,
    habilidadPerfil: 'Sin evidencia en el perfil',
    detallePerfil: 'No se encontró esta competencia.',
    resultado: 'No encontrada',
  },
];

export function getDemoAffinityResponse(
  vacancyId: string,
  scenario?: string,
): VacancyAffinityResponse {
  const timestamp = '2026-10-19T10:42:00.000Z';

  if (scenario === 'perfil-incompleto') {
    return {
      idVacante: vacancyId,
      idEgresado: 'egresado-demo',
      porcentaje: null,
      estado: 'INCOMPLETE_PROFILE',
      mensaje: 'El perfil profesional del egresado está incompleto para evaluar la afinidad.',
      calculadoEn: timestamp,
    };
  }

  if (scenario === 'sin-requisitos') {
    return {
      idVacante: vacancyId,
      idEgresado: 'egresado-demo',
      porcentaje: null,
      estado: 'INSUFFICIENT_REQUIREMENTS',
      mensaje: 'La vacante no cuenta con requisitos técnicos suficientes para calcular la afinidad.',
      calculadoEn: timestamp,
    };
  }

  if (scenario === 'error-nlp') {
    return {
      idVacante: vacancyId,
      idEgresado: 'egresado-demo',
      porcentaje: null,
      estado: 'NLP_ERROR',
      mensaje: 'El servicio de análisis de afinidad no se encuentra disponible temporalmente.',
      calculadoEn: timestamp,
    };
  }

  // Porcentaje específico según vacante demo
  const opp = DEMO_OPPORTUNITIES.find((item) => item.id === vacancyId);
  const porcentaje = opp ? (opp.porcentaje === 80 ? 86 : opp.porcentaje) : 86;

  const matchedSkills: MatchedSkill[] = DEMO_COMPARISON_ROWS.map((row) => ({
    competencia: row.requisito,
    nivelRequerido: 'Intermedio',
    tipo: row.esDeseable ? 'Deseable' : 'Obligatorio',
    coincide: row.resultado !== 'No encontrada',
    tipoResultado: row.resultado,
    habilidadPerfil: row.habilidadPerfil !== 'Sin evidencia en el perfil' ? row.habilidadPerfil : undefined,
    score: row.resultado === 'Exacta' ? 1.0 : row.resultado === 'Similar - NLP' ? 0.85 : 0,
  }));

  return {
    idVacante: vacancyId,
    idEgresado: 'egresado-demo',
    porcentaje,
    estado: 'SUCCESS',
    mensaje: 'Afinidad calculada exitosamente.',
    detalles: {
      totalRequisitos: 7,
      obligatoriosCumplidos: 4,
      deseablesCumplidos: 0,
      habilidades: matchedSkills,
    },
    calculadoEn: timestamp,
  };
}
