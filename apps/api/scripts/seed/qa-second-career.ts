import type { Prisma, PrismaClient } from '../../src/generated/prisma/client';
import { radarLevel } from './radar-levels';
import { AFFINITY_AREAS } from '@umsspira/shared-types';
import { RADAR_AREA_IDS } from '../../src/modules/radar/domain/entities/radar-area';
import { calculateAreaAffinity } from '../../src/modules/radar/domain/policies/affinity-calculator';
import { RADAR_DICTIONARY } from '../../src/modules/radar/domain/affinity-catalog';
import {
  DEMO_INFORMATICS_CAREER_ID,
  DEMO_INFORMATICS_QA_ADMIN_ASSIGNMENT_ID,
  DEMO_INFORMATICS_QA_ADMIN_ID,
} from './demo-accounts';
import { seedInformaticsCareer } from './informatics-career';

const QA_SURVEY_ID = '99300000-0000-4000-8000-000000000001';
const RADAR_VERSION = 'qa-seed-v1';

const graduateNames = [
  ['Ariana', 'Molina'],
  ['Bruno', 'Cárdenas'],
  ['Carla', 'Torrico'],
  ['Daniel', 'Vargas'],
  ['Elisa', 'Rojas'],
  ['Fabián', 'Méndez'],
  ['Gabriela', 'Paz'],
  ['Hugo', 'Salinas'],
  ['Inés', 'Rivera'],
  ['Joaquín', 'Siles'],
  ['Karen', 'Vega'],
  ['Leonardo', 'Camacho'],
  ['Micaela', 'Flores'],
  ['Nicolás', 'Quiroga'],
  ['Olivia', 'Arias'],
  ['Pablo', 'Suárez'],
  ['Renata', 'Prado'],
  ['Samuel', 'Cruz'],
  ['Tatiana', 'Lima'],
  ['Víctor', 'Rocha'],
] as const;

const graduationYears = [
  2021, 2021, 2021, 2021, 2022, 2022, 2022, 2022, 2022, 2023, 2023, 2023, 2023, 2023, 2023, 2024,
  2024, 2024, 2024, 2024,
] as const;

function qaId(prefix: string, sequence: number): string {
  return `${prefix}-0000-4000-8000-${sequence.toString().padStart(12, '0')}`;
}

export const qaSecondCareerGraduates: Array<Prisma.TituladoCreateManyInput & { id: string }> =
  graduateNames.map(([nombre, apellido], index) => {
    const anioEgreso = graduationYears[index];
    if (anioEgreso === undefined) {
      throw new Error(`Falta la cohorte del titulado de QA ${index + 1}`);
    }

    return {
      id: qaId('99310000', index + 1),
      id_carrera: DEMO_INFORMATICS_CAREER_ID,
      nombre,
      apellido,
      anio_ingreso: anioEgreso - 5,
      anio_egreso: anioEgreso,
      grado: 'Licenciatura',
      expedido_en: 'CB',
    };
  });

export const qaSecondCareerSurvey: Prisma.EncuestaCreateManyInput[] = [
  {
    id: QA_SURVEY_ID,
    id_administrador: DEMO_INFORMATICS_QA_ADMIN_ASSIGNMENT_ID,
    id_carrera: DEMO_INFORMATICS_CAREER_ID,
    titulo: 'Seguimiento laboral - Ingeniería Informática QA',
    fecha_inicio: new Date('2026-01-01T00:00:00Z'),
    fecha_fin: new Date('2026-12-31T00:00:00Z'),
    fecha_creacion: new Date('2026-01-01T00:00:00Z'),
    estado: 'PUBLICADA',
    formato: 'WEB',
  },
];

type EmploymentResponse = Omit<
  Prisma.RespuestaEncuestaCreateManyInput,
  'id' | 'idEncuesta' | 'idTitulado' | 'fechaEnvio'
>;

const unemployedIndexes = new Set([1, 5, 10, 14, 18]);
const salaryRanges = ['0–2.999', '3.000–5.000', '5.001–8.000', '8.001–12.000', '12.001–21.000'];
const insertionMonths = [1, 3, 6, 9, 12, 18];
const jobTitles = [
  'Desarrolladora backend',
  'Analista de datos',
  'Especialista de calidad de software',
  'Administradora de infraestructura',
  'Consultor de ciberseguridad',
];
const companies = [
  'Andes Digital',
  'Quarksoft Bolivia',
  'Nube Andina',
  'DataSur',
  'Red Segura Bolivia',
];
const employmentAreas = [
  'Desarrollo de software',
  'Ciencia de datos',
  'Aseguramiento de calidad',
  'Infraestructura',
  'Ciberseguridad',
];

export const qaSecondCareerResponses: Prisma.RespuestaEncuestaCreateManyInput[] =
  qaSecondCareerGraduates.map((graduate, index) => {
    const isUnemployed = unemployedIndexes.has(index);
    const employedSequence =
      index - [...unemployedIndexes].filter((unemployedIndex) => unemployedIndex < index).length;
    const scenario: EmploymentResponse = isUnemployed
      ? { condicionLaboral: 'false' }
      : {
          condicionLaboral: 'true',
          cargo: jobTitles[employedSequence % jobTitles.length],
          empresa: companies[employedSequence % companies.length],
          area: employmentAreas[employedSequence % employmentAreas.length],
          modalidad: ['Presencial', 'Remoto', 'Hibrido'][employedSequence % 3],
          salarioMensual: salaryRanges[employedSequence % salaryRanges.length],
          tiempoInsercion: String(insertionMonths[employedSequence % insertionMonths.length]),
        };

    return {
      ...scenario,
      id: qaId('99320000', index + 1),
      idEncuesta: QA_SURVEY_ID,
      idTitulado: graduate.id,
      fechaEnvio: new Date(Date.UTC(2026, 0, 15 + index * 8)),
    };
  });

const radarSeed = qaSecondCareerGraduates.map((graduate, graduateIndex) => {
  const calculationId = qaId('99330000', graduateIndex + 1);
  const areaResults = AFFINITY_AREAS.map((area, areaIndex) => {
    const definitions = RADAR_DICTIONARY[area];
    const weights = definitions.map(({ term, weight }) => ({ term, peso: weight }));
    const start = (graduateIndex * 3 + areaIndex) % definitions.length;
    // Nivel por cohorte y área: el mapa usa los 5 tramos de color (HU-002 CA-02).
    const [keywordCount, frequency] = radarLevel(graduate.anio_egreso, areaIndex);
    const keywords = Array.from({ length: keywordCount }, (_, offset) => {
      const definition = definitions[(start + offset) % definitions.length];
      if (!definition) {
        throw new Error(`Falta una keyword del área de radar ${area}`);
      }
      return { term: definition.term, count: frequency };
    });

    return calculateAreaAffinity(keywords, weights);
  });

  return {
    calculation: {
      id: calculationId,
      id_titulado: graduate.id,
      version_algoritmo: RADAR_VERSION,
      estado: 'COMPLETADO',
      fecha_calculo: new Date(Date.UTC(2026, 1, 1 + graduateIndex)),
    } satisfies Prisma.CalculoRadarCreateManyInput,
    affinities: areaResults.map((result, areaIndex) => {
      const area = AFFINITY_AREAS[areaIndex];
      if (!area) {
        throw new Error(`Falta el área de radar de QA ${areaIndex + 1}`);
      }

      const topKeywords: Prisma.InputJsonValue = result.palabrasClaveTop.map((keyword) => ({
        keyword: keyword.keyword,
        weight: keyword.weight,
        frequency: keyword.frequency,
        points: keyword.points,
        percentage: keyword.percentage,
      }));

      return {
        id: qaId('99340000', graduateIndex * AFFINITY_AREAS.length + areaIndex + 1),
        id_calculo_radar: calculationId,
        id_area: RADAR_AREA_IDS[area],
        puntaje: result.puntaje,
        porcentaje: result.porcentaje,
        palabras_clave_top: topKeywords,
      } satisfies Prisma.AfinidadRadarCreateManyInput;
    }),
  };
});

export const qaSecondCareerRadarCalculations = radarSeed.map(({ calculation }) => calculation);
export const qaSecondCareerRadarAffinities = radarSeed.flatMap(({ affinities }) => affinities);

export async function seedQaSecondCareer(prisma: PrismaClient): Promise<void> {
  const careerId = await seedInformaticsCareer(prisma);
  const [career, admin, assignments] = await Promise.all([
    prisma.carrera.findUnique({
      where: { id: careerId },
      select: { id: true },
    }),
    prisma.usuario.findUnique({
      where: { usuario_id: DEMO_INFORMATICS_QA_ADMIN_ID },
      select: { rol: true },
    }),
    prisma.administradorDeCarrera.findMany({
      where: { id_usuario: DEMO_INFORMATICS_QA_ADMIN_ID },
      select: { id: true, id_carrera: true },
    }),
  ]);

  if (!career) {
    throw new Error('Debe existir Ingeniería Informática antes de cargar los datos de QA');
  }
  if (admin?.rol !== 'administrador') {
    throw new Error('Debe existir el administrador exclusivo de Ingeniería Informática');
  }
  if (
    assignments.length !== 1 ||
    assignments[0]?.id !== DEMO_INFORMATICS_QA_ADMIN_ASSIGNMENT_ID ||
    assignments[0]?.id_carrera !== careerId
  ) {
    throw new Error(
      'El administrador de QA debe estar asociado únicamente a Ingeniería Informática',
    );
  }

  const graduates = qaSecondCareerGraduates.map((graduate) => ({
    ...graduate,
    id_carrera: careerId,
  }));
  const surveys = qaSecondCareerSurvey.map((survey) => ({ ...survey, id_carrera: careerId }));

  await prisma.titulado.createMany({ data: graduates, skipDuplicates: true });
  await prisma.encuesta.createMany({ data: surveys, skipDuplicates: true });
  await prisma.respuestaEncuesta.createMany({
    data: qaSecondCareerResponses,
    skipDuplicates: true,
  });
  await prisma.calculoRadar.createMany({
    data: qaSecondCareerRadarCalculations,
    skipDuplicates: true,
  });
  await prisma.afinidadRadar.createMany({
    data: qaSecondCareerRadarAffinities,
    skipDuplicates: true,
  });
}
