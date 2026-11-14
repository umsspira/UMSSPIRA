import { normalizeInterestText } from './custom-interest.policy';

/**
 * HU 6.21: la descripción de un área se resuelve en código porque el esquema
 * actual no tiene columna `descripcion`. Si el DBA decide persistirla, este
 * mapa puede reemplazarse por el valor de la base sin cambiar el contrato.
 */
const AREA_DESCRIPTIONS: Record<string, string> = {
  tecnologia: 'Desarrollo de software, APIs, bases de datos y arquitectura de aplicaciones.',
  gestion: 'Planificación, metodologías ágiles y liderazgo de equipos técnicos.',
  'cloud/devops': 'Infraestructura en la nube, contenedores, automatización y despliegues.',
  'ciencia de datos/ia': 'Análisis de datos, aprendizaje automático y modelos de inteligencia artificial.',
  qa: 'Aseguramiento de calidad con pruebas manuales, automatizadas y de rendimiento.',
  ciberseguridad: 'Protección de aplicaciones, redes y gestión de vulnerabilidades.',
  'gestion ti': 'Gobierno de TI, servicios, incidentes y arquitectura empresarial.',
  'desarrollo de software': 'Construcción de aplicaciones y servicios de software.',
  'analisis de datos': 'Exploración y análisis de datos para la toma de decisiones.',
  backend: 'Servicios, APIs y lógica del lado del servidor.',
  frontend: 'Interfaces web, accesibilidad y experiencia de usuario.',
  'bases de datos': 'Diseño, modelado y optimización de bases de datos.',
  'apis rest': 'Diseño y consumo de servicios HTTP.',
  'node.js': 'Aplicaciones y servicios con el ecosistema de Node.js.',
  react: 'Interfaces de usuario con React.',
  postgresql: 'Modelado y consultas sobre PostgreSQL.',
  'arquitectura de software': 'Diseño de sistemas, patrones y decisiones técnicas.',
  'metodologias agiles': 'Scrum, Kanban y entrega iterativa de valor.',
  'liderazgo tecnico': 'Conducción de equipos y decisiones técnicas.',
  'gestion de equipos': 'Coordinación, feedback y desarrollo del equipo.',
  'planificacion de proyectos': 'Alcance, cronograma y seguimiento de proyectos.',
  aws: 'Servicios y buenas prácticas en Amazon Web Services.',
  azure: 'Servicios y buenas prácticas en Microsoft Azure.',
  docker: 'Empaquetado y ejecución de aplicaciones en contenedores.',
  kubernetes: 'Orquestación de contenedores en producción.',
  'ci/cd': 'Integración y entrega continuas.',
  terraform: 'Infraestructura como código.',
  'python para datos': 'Análisis y procesamiento de datos con Python.',
  'aprendizaje automatico': 'Modelos predictivos y aprendizaje supervisado.',
  'analisis exploratorio': 'Exploración y limpieza de datos.',
  'visualizacion de datos': 'Tableros y gráficos para comunicar hallazgos.',
  'procesamiento de lenguaje natural': 'Modelos y técnicas sobre texto.',
  mlops: 'Operación y despliegue de modelos de aprendizaje automático.',
  'pruebas manuales': 'Verificación funcional guiada por casos de prueba.',
  'automatizacion de pruebas': 'Suites automatizadas y mantenimiento de pruebas.',
  'pruebas de api': 'Validación de contratos y respuestas de servicios.',
  'pruebas de rendimiento': 'Carga, estrés y tiempos de respuesta.',
  'testing exploratorio': 'Diseño de pruebas basado en riesgo y experiencia.',
  'seguridad de aplicaciones': 'Revisiones de seguridad y buenas prácticas.',
  pentesting: 'Pruebas de intrusión controladas.',
  'gestion de vulnerabilidades': 'Identificación, priorización y remediación.',
  'criptografia aplicada': 'Protección de datos y comunicaciones.',
  'respuesta a incidentes': 'Detección, contención y recuperación.',
  itil: 'Buenas prácticas de gestión de servicios TI.',
  'gestion de servicios ti': 'Catálogo, niveles de servicio y mejora continua.',
  'gobierno de ti': 'Alineación de TI con los objetivos del negocio.',
  'gestion de incidentes': 'Registro, atención y cierre de incidentes.',
  'arquitectura empresarial': 'Estrategia y evolución de los sistemas de la organización.',
};

/** Devuelve una descripción corta para el área o cadena vacía si no está mapeada. */
export function describeArea(name?: string | null): string {
  if (!name) {
    return '';
  }
  return AREA_DESCRIPTIONS[normalizeInterestText(name)] ?? '';
}
