import Link from "next/link";
import { Award, Calendar, GraduationCap, Pencil, Trash2 } from "lucide-react";
import { formatPeriod } from "@/lib/academic-education/form";
import type { AcademicEducation } from "@/components/academic-education/types";

export function AcademicEducationCard({
  record,
  onDelete,
}: {
  record: AcademicEducation;
  onDelete: (record: AcademicEducation) => void;
}) {
  const AcademicIcon = record.nivelAcademico === "Diplomado" ? Award : GraduationCap;

  return (
    <article className="grid grid-cols-[2.75rem_minmax(0,1fr)] items-start gap-4 px-5 py-6 sm:grid-cols-[2.75rem_minmax(0,1fr)_auto] sm:px-6">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-950">
        <AcademicIcon className="size-5" aria-hidden="true" />
      </span>
      <div className="flex min-w-0 flex-col gap-1 break-words">
        <div className="flex flex-wrap items-center gap-1.5">
          <h3 className="text-sm font-semibold text-zinc-900">{record.titulo}</h3>
          <span className="rounded-md bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-950">
            {record.nivelAcademico}
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-1.5 py-0.5 text-xs font-medium text-zinc-700">
            <span className="size-1.5 rounded-full bg-orange-700" aria-hidden="true" />
            {record.estado}
          </span>
        </div>
        <p className="max-w-20 text-sm leading-5 text-zinc-600">{record.institucion}</p>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-zinc-500">
          <Calendar className="size-3.5" aria-hidden="true" />
          {formatPeriod(record)}
        </p>
      </div>
      <div className="col-start-2 flex items-center justify-end gap-1 self-center sm:col-start-3 sm:row-start-1">
        <Link
          href={`/perfil/formacion/${record.idFormacion}/editar`}
          className="inline-flex size-8 items-center justify-center rounded bg-zinc-100 text-zinc-600 transition-colors hover:bg-blue-100 hover:text-blue-950"
          aria-label={`Editar ${record.titulo}`}
          title="Editar formación"
        >
          <Pencil className="size-4" aria-hidden="true" />
        </Link>
        <button
          type="button"
          onClick={() => onDelete(record)}
          className="inline-flex size-8 items-center justify-center rounded bg-zinc-100 text-zinc-600 transition-colors hover:bg-zinc-200 hover:text-zinc-900"
          aria-label={`Eliminar ${record.titulo}`}
          title="Eliminar formación"
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}
