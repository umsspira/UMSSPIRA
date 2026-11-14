'use client';

import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  CircleAlert,
  GraduationCap,
} from 'lucide-react';
import {
  ComparisonBreadcrumbs,
  ComparisonFooter,
  ComparisonPageFrame,
  LocalDataNotice,
} from '../../../../components/ComparisonUi';
import { useComparison } from '../../useComparison';

export default function MissingSkillClient({
  id,
  indice,
}: {
  id: string;
  indice: string;
}) {
  const { loaded, vacancy, requirements, error } = useComparison(id);
  const requirementIndex = Number(indice);
  const requirement =
    Number.isInteger(requirementIndex) && requirementIndex >= 0
      ? requirements[requirementIndex]
      : undefined;

  if (!loaded) {
    return (
      <ComparisonPageFrame>
        <p className="text-sm text-[#44474D]">
          Cargando el detalle de la habilidad...
        </p>
      </ComparisonPageFrame>
    );
  }

  if (error || !vacancy || !requirement) {
    return (
      <ComparisonPageFrame>
        <section className="rounded-lg bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold">
            {error ? 'No se pudo cargar el detalle' : 'Requisito no encontrado'}
          </h1>
          <p role={error ? 'alert' : undefined} className="mt-3 text-sm text-[#44474D]">
            {error ||
              'Este requisito ya no está disponible para la vacante seleccionada.'}
          </p>
          <Link
            href={`/vacantes/${encodeURIComponent(id)}/comparar`}
            className="mt-6 inline-flex items-center gap-2 rounded bg-[#FFA94D] px-4 py-3 text-sm font-semibold text-[#000B21]"
          >
            <ArrowLeft size={16} />
            Volver a la comparación
          </Link>
        </section>
      </ComparisonPageFrame>
    );
  }

  const comparisonHref = `/vacantes/${encodeURIComponent(String(vacancy.id))}/comparar`;
  const skillHref = requirement.profileSkill
    ? `/skills/${encodeURIComponent(requirement.profileSkill.id)}/edit`
    : `/habilidades/agregar?nombre=${encodeURIComponent(requirement.skillName)}`;

  return (
    <>
      <ComparisonPageFrame>
        <ComparisonBreadcrumbs
          vacancyId={String(vacancy.id)}
          current="Habilidad pendiente"
        />

        <header className="mb-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#A66320]">
            Requisito de la vacante
          </p>
          <h1 className="text-[30px] font-bold leading-9 tracking-tight">
            Detalle de habilidad pendiente
          </h1>
          <p className="mt-2 text-[15px] leading-6 text-[#44474D]">
            Revisa cómo se encontró este requisito en la comparación para{' '}
            <span className="font-semibold text-[#000B21]">{vacancy.title}</span>.
          </p>
        </header>

        <section className="mb-6 rounded-lg bg-white p-8 shadow-sm">
          <div className="flex items-start gap-5">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded bg-[#FFF4E5] text-[#92520D]">
              <GraduationCap size={27} />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#66686D]">
                Habilidad solicitada
              </p>
              <h2 className="mt-2 text-2xl font-bold">{requirement.requirement}</h2>
              <p className="mt-2 text-sm text-[#44474D]">
                {vacancy.company} · {vacancy.title}
              </p>
            </div>
            {requirement.meetsRequirement ? (
              <span className="rounded-full bg-[#ECFDF5] px-3 py-1 text-xs font-semibold text-[#065F46]">
                Coincide con tu perfil
              </span>
            ) : (
              <span className="rounded-full bg-[#FFF4E5] px-3 py-1 text-xs font-semibold text-[#92520D]">
                Pendiente
              </span>
            )}
          </div>
        </section>

        <div className="grid grid-cols-[minmax(0,2fr)_minmax(320px,1fr)] items-start gap-6">
          <section className="rounded-lg bg-white p-8 shadow-sm">
            <h2 className="flex items-center gap-3 text-lg font-semibold">
              <CircleAlert size={19} className="text-[#C2741B]" />
              Estado en tu perfil
            </h2>
            {requirement.meetsRequirement ? (
              <p className="mt-4 rounded bg-[#ECFDF5] p-4 text-sm leading-6 text-[#065F46]">
                La habilidad ahora coincide con este requisito. La información
                del perfil pudo cambiar desde que se abrió el resultado.
              </p>
            ) : requirement.profileSkill ? (
              <p className="mt-4 rounded bg-[#FFF9F0] p-4 text-sm leading-6 text-[#55565A]">
                Encontramos <strong>{requirement.profileSkill.name}</strong> con
                nivel <strong>{requirement.profileSkill.level}</strong>
                {requirement.requiredLevel
                  ? `, mientras que la vacante indica nivel ${requirement.requiredLevel}.`
                  : ', pero no se pudo confirmar una coincidencia suficiente.'}
              </p>
            ) : (
              <p className="mt-4 rounded bg-[#FFF9F0] p-4 text-sm leading-6 text-[#55565A]">
                No encontramos una habilidad con este nombre entre las
                habilidades guardadas en el navegador. La vacante no incluye
                más detalle para este requisito.
              </p>
            )}

            <div className="mt-7 border-t border-[#E7E6E3] pt-6">
              <h3 className="flex items-center gap-2 text-base font-semibold">
                <BookOpenCheck size={18} />
                Próximo paso
              </h3>
              <p className="mt-2 text-sm leading-6 text-[#44474D]">
                Puedes revisar o registrar esta habilidad en tu perfil. No se
                añadirá automáticamente; deberás completar y guardar sus datos.
              </p>
              <Link
                href={skillHref}
                className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded bg-[#FFA94D] px-5 text-sm font-bold text-[#000B21] hover:bg-[#f39a3d]"
              >
                {requirement.profileSkill
                  ? 'Editar habilidad del perfil'
                  : 'Agregar a mis habilidades'}
                <ArrowRight size={16} />
              </Link>
            </div>
          </section>

          <aside className="rounded-lg bg-[#000B21] p-7 text-white">
            <h2 className="text-base font-semibold">Vacante relacionada</h2>
            <p className="mt-4 text-lg font-bold">{vacancy.title}</p>
            <p className="mt-1 text-sm text-[#E3E2DF]">{vacancy.company}</p>
            <p className="mt-5 border-t border-white/15 pt-5 text-sm leading-6 text-[#E3E2DF]">
              Este detalle se basa únicamente en el requisito escrito por la
              empresa y en los datos guardados en tu perfil local.
            </p>
            <Link
              href={`/vacantes/${encodeURIComponent(String(vacancy.id))}`}
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#FFA94D] hover:underline"
            >
              Ver detalle de vacante
              <ArrowRight size={15} />
            </Link>
          </aside>
        </div>

        <LocalDataNotice />

        <div className="mt-6 flex justify-between">
          <Link
            href={comparisonHref}
            className="inline-flex items-center gap-2 rounded border border-[#C5C6CD] bg-white px-5 py-3 text-sm font-semibold text-[#000B21] hover:bg-[#F8F7F4]"
          >
            <ArrowLeft size={16} />
            Volver a la comparación
          </Link>
        </div>
      </ComparisonPageFrame>
      <ComparisonFooter />
    </>
  );
}
