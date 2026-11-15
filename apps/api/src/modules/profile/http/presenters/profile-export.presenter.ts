import type { ProfileSnapshot } from '../../domain/entities/profile-record';

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function toDay(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

// "2021-01-04" -> "Ene 2021"; sin fecha -> "Presente" (igual que la descarga del frontend)
function formatMonthYear(date: string | null): string {
  if (!date) {
    return 'Presente';
  }
  const [year, month] = date.split('-');
  return MONTHS[Number(month) - 1] + ' ' + year;
}

// Documento de exportación único (HU5-05): mismos campos, con mayúscula inicial y sin tildes, que el
// botón «Descargar» del frontend, que es el formato pedido por QA. La API no guarda respaldo de
// formación académica, por eso su Respaldo siempre es null
export function presentProfileExport(profile: ProfileSnapshot, exportedAt: Date) {
  const name =
    (profile.graduate.name ?? 'titulado')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'titulado';
  const date = exportedAt.toISOString().slice(0, 10);
  const document = {
    IdEgresado: profile.graduate.id,
    FechaDescarga: date,
    Nombre: profile.graduate.name ?? '',
    Carrera: profile.graduate.career ?? '',
    Promocion: profile.graduate.cohort,
    'Formación académica': profile.education.map((record) => ({
      Institucion: record.institution,
      Titulo: record.title,
      Grado: record.degree ?? '',
      Anio: record.graduationYear,
      Respaldo: null,
    })),
    'Experiencia laboral': profile.experience.map((record) => {
      const start = toDay(record.startDate);
      const end = toDay(record.endDate);
      return {
        Empresa: record.company,
        Cargo: record.position,
        Periodo: formatMonthYear(start) + ' – ' + formatMonthYear(end),
        FechaInicio: start,
        FechaFin: end,
      };
    }),
    Certificaciones: profile.certifications.map((record) => ({
      Nombre: record.name,
      Entidad: record.issuer,
      Anio: record.issuedYear,
      Grado: record.degree,
    })),
  };
  return {
    name: 'perfil_' + name + '_' + date + '.json',
    content: JSON.stringify(document, null, 2),
  };
}
