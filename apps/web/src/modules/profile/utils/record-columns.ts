import type { ProfileRecord, RecordSection } from '@/modules/profile/types/profile-record';

export type RecordColumn = {
  label: string;
  getValue: (record: ProfileRecord) => string;
};

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function formatMonthYear(date: string): string {
  if (!date) return 'Actualidad';
  const [year, month] = date.split('-');
  return `${MONTHS[Number(month) - 1]} ${year}`;
}

function readField(key: string) {
  return (record: ProfileRecord) => String((record as Record<string, string>)[key] ?? '');
}

// Columnas visibles por sección; las dos primeras identifican al registro
export function getRecordColumns(section: RecordSection): RecordColumn[] {
  if (section === 'education') {
    return [
      { label: 'Institución', getValue: readField('institution') },
      { label: 'Título', getValue: readField('title') },
      { label: 'Año de egreso', getValue: readField('graduationYear') },
      { label: 'Grado', getValue: readField('degree') },
    ];
  }
  if (section === 'experience') {
    return [
      { label: 'Empresa', getValue: readField('company') },
      { label: 'Cargo', getValue: readField('position') },
      { label: 'Fecha de inicio', getValue: (record) => formatMonthYear(readField('startDate')(record)) },
      { label: 'Fecha de fin', getValue: (record) => formatMonthYear(readField('endDate')(record)) },
    ];
  }
  return [
    { label: 'Certificación', getValue: readField('name') },
    { label: 'Entidad emisora', getValue: readField('issuer') },
    { label: 'Año', getValue: readField('issueYear') },
    { label: 'Grado', getValue: readField('degree') },
  ];
}
