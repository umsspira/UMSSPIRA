export type Skill = {
  id: string;
  name: string;
  category: string;
  level: string;
  years: number | null;
};

export const initialSkills: Skill[] = [
  {
    id: 'javascript',
    name: 'JavaScript',
    category: 'Lenguajes de Programación',
    level: 'Avanzado',
    years: 3,
  },
  {
    id: 'python',
    name: 'Python',
    category: 'Lenguajes de Programación',
    level: 'Intermedio',
    years: 2,
  },
  {
    id: 'react',
    name: 'React',
    category: 'Frameworks',
    level: 'Avanzado',
    years: 3,
  },
  {
    id: 'sql',
    name: 'SQL',
    category: 'Base de Datos',
    level: 'Experto',
    years: 4,
  },
  {
    id: 'git',
    name: 'Git',
    category: 'Herramientas',
    level: 'Intermedio',
    years: 2,
  },
];

export const categories = [
  'Lenguajes de Programación',
  'Frameworks',
  'Base de Datos',
  'Herramientas',
  'DevOps',
  'Cloud',
  'Otros',
];

export const levels = [
  'Básico',
  'Intermedio',
  'Avanzado',
  'Experto',
];

export const suggestedSkills = [
  'Docker',
  'Kubernetes',
  'TypeScript',
  'Node.js',
  'Angular',
  'MongoDB',
  'AWS',
  'Scrum',
];