import { FilePlus2, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';

import { completarSeccionHref } from '@/modules/profile/utils/profile-completeness';
import type { ProfileRecord, RecordSection } from '@/modules/profile/types/profile-record';
import { getRecordColumns } from '@/modules/profile/utils/record-columns';

type ProfileRecordsTableProps = {
  section: RecordSection;
  records: ProfileRecord[];
  onDelete: (record: ProfileRecord) => void;
};

type RecordActionsProps = {
  section: RecordSection;
  record: ProfileRecord;
  onDelete: ProfileRecordsTableProps['onDelete'];
};

// Pantalla de edición de cada sección
const EDIT_ROUTES: Record<RecordSection, string> = {
  education: '/profile/education',
  experience: '/profile/experience',
  certification: '/profile/certifications',
};

// Íconos sin borde, como en la v3 del Figma
const actionClassName =
  'flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-palladian';

function RecordActions({ section, record, onDelete }: RecordActionsProps) {
  return (
    <div className="flex items-center gap-2">
      <Link
        href={`${EDIT_ROUTES[section]}/${record.id}/edit`}
        aria-label="Editar registro"
        title="Editar registro"
        className={`${actionClassName} text-blue-fantastic`}
      >
        <Pencil className="h-4 w-4" aria-hidden="true" />
      </Link>
      <button
        type="button"
        aria-label="Eliminar registro"
        title="Eliminar registro"
        onClick={() => onDelete(record)}
        className={`${actionClassName} text-truffle-trouble`}
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

export function ProfileRecordsTable({ section, records, onDelete }: ProfileRecordsTableProps) {
  const columns = getRecordColumns(section);

  if (records.length === 0) {
    const emptySection = {
      education: {
        id: 'formacion-academica',
        title: 'Aún no tienes formación académica registrada',
        description: 'Agrega tus estudios para completar tu perfil profesional.',
        button: 'Agregar formación académica',
      },
      experience: {
        id: 'experiencia-laboral',
        title: 'Aún no tienes experiencia laboral registrada',
        description: 'Agrega tu trayectoria profesional para enriquecer tu perfil.',
        button: 'Agregar experiencia',
      },
      certification: {
        id: 'certificaciones',
        title: 'Aún no tienes certificaciones registradas',
        description: 'Agrega tus certificaciones y destaca tus conocimientos.',
        button: 'Agregar certificación',
      },
    }[section];

    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-abyssal-blue/20 bg-white px-5 py-10 text-center sm:px-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-palladian">
          <FilePlus2 className="h-6 w-6 text-truffle-trouble" aria-hidden="true" />
        </div>

        <div className="flex flex-col gap-1">
          <h3 className="text-base font-bold text-blue-fantastic">
            {emptySection.title}
          </h3>
          <p className="max-w-md text-sm leading-relaxed text-blue-fantastic/70">
            {emptySection.description}
          </p>
        </div>

        <Link
          href={completarSeccionHref(emptySection.id)}
          className="mt-2 inline-flex min-h-11 items-center justify-center rounded-lg bg-burning-flame px-5 py-3 text-sm font-bold text-abyssal-blue transition hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-truffle-trouble"
        >
          {emptySection.button}
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Tabla de escritorio */}
      <div className="hidden overflow-hidden rounded-2xl border border-abyssal-blue/10 bg-white md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-palladian/50">
            <tr>
              {[...columns.map((column) => column.label), 'Acciones'].map((label) => (
                <th
                  key={label}
                  scope="col"
                  className="px-5 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-blue-fantastic/70"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr key={record.id} className="border-t border-oatmeal/60">
                {columns.map((column) => (
                  <td key={column.label} className="px-5 py-4 text-blue-fantastic">
                    {column.getValue(record)}
                  </td>
                ))}
                <td className="px-5 py-4">
                  <RecordActions section={section} record={record} onDelete={onDelete} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Tarjetas en móvil */}
      <ul className="flex flex-col gap-3 md:hidden">
        {records.map((record) => {
          const [primary, secondary, ...rest] = columns;
          return (
            <li
              key={record.id}
              className="flex items-start justify-between gap-3 rounded-2xl border border-abyssal-blue/10 bg-white p-4"
            >
              <div className="min-w-0 space-y-1">
                <p className="text-base font-bold text-blue-fantastic">{primary.getValue(record)}</p>
                <p className="text-sm text-blue-fantastic/80">{secondary.getValue(record)}</p>
                <p className="text-xs text-blue-fantastic/60">
                  {rest.map((column) => column.getValue(record)).join(' · ')}
                </p>
              </div>
              <RecordActions section={section} record={record} onDelete={onDelete} />
            </li>
          );
        })}
      </ul>
    </>
  );
}
