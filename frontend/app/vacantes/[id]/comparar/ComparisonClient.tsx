'use client';

import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  ListChecks,
} from 'lucide-react';
import {
  ComparisonBreadcrumbs,
  ComparisonFooter,
  ComparisonPageFrame,
  LocalDataNotice,
} from '../../components/ComparisonUi';
import { useComparison } from './useComparison';

export default function ComparisonClient({ id }: { id: string }) {
  const { loaded, vacancy, requirements, error } = useComparison(id);

  if (!loaded) {
    return (
      <ComparisonPageFrame>
        <p className="text-sm text-[#44474D]">
          Cargando la comparación...
        </p>
      </ComparisonPageFrame>
    );
  }

  if (error || !vacancy) {
    return (
      <ComparisonPageFrame>
        <section className="rounded-lg bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold">
            {error ? 'No se pudo realizar la comparación' : 'Vacante no encontrada'}
          </h1>
          <p role={error ? 'alert' : undefined} className="mt-3 text-sm text-[#44474D]">
            {error || 'La vacante seleccionada ya no está disponible.'}
          </p>
          <Link
            href="/vacantes"
            className="mt-6 inline-flex items-center gap-2 rounded bg-[#FFA94D] px-4 py-3 text-sm font-semibold text-[#000B21]"
          >
            <ArrowLeft size={16} />
            Volver a vacantes
          </Link>
        </section>
      </ComparisonPageFrame>
    );
  }

  const matches = requirements.filter((item) => item.meetsRequirement);
  const pending = requirements.filter((item) => !item.meetsRequirement);
  const vacancyHref = `/vacantes/${encodeURIComponent(String(vacancy.id))}`;

  return (
    <>
      <ComparisonPageFrame>
        <ComparisonBreadcrumbs
          vacancyId={String(vacancy.id)}
          current="Comparación"
        />

        <header className="mb-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#A66320]">
            Análisis de perfil
          </p>
          <h1 className="text-[30px] font-bold leading-9 tracking-tight">
            Comparación de habilidades
          </h1>
          <p className="mt-2 text-[15px] leading-6 text-[#44474D]">
            Revisa las habilidades solicitadas para{' '}
            <span className="font-semibold text-[#000B21]">{vacancy.title}</span>
            {' '}en {vacancy.company}.
          </p>
        </header>

        <section className="mb-6 flex items-center justify-between gap-8 rounded-lg bg-white px-7 py-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded bg-[#F4F3F0]">
              <ListChecks size={23} />
            </div>
            <div>
              <h2 className="text-base font-semibold">{vacancy.title}</h2>
              <p className="mt-1 text-sm text-[#44474D]">
                {vacancy.company} · {vacancy.area}
              </p>
            </div>
          </div>
          <div className="min-w-[210px] rounded bg-[#F4F3F0] px-5 py-3 text-right">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#44474D]">
              Coincidencias
            </p>
            <p className="mt-1 text-lg font-bold">
              {matches.length} de {requirements.length} requisitos
            </p>
          </div>
        </section>

        <div className="grid grid-cols-2 items-start gap-6">
          <section className="overflow-hidden rounded-lg bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-[#E7E6E3] px-6 py-5">
              <div>
                <h2 className="text-lg font-semibold">Coinciden con tu perfil</h2>
                <p className="mt-1 text-sm text-[#66686D]">
                  Requisitos que aparecen en tus habilidades registradas
                </p>
              </div>
              <span className="rounded-full bg-[#ECFDF5] px-3 py-1 text-sm font-bold text-[#065F46]">
                {matches.length}
              </span>
            </div>
            {matches.length ? (
              <ul className="divide-y divide-[#F0EFEC]">
                {matches.map((item) => (
                  <li
                    key={`match-${item.index}`}
                    className="flex items-start gap-3 px-6 py-5"
                  >
                    <CheckCircle2
                      size={19}
                      className="mt-0.5 shrink-0 text-[#059669]"
                    />
                    <div>
                      <p className="text-sm font-semibold">{item.requirement}</p>
                      <p className="mt-1 text-xs text-[#66686D]">
                        Registrada en tu perfil
                        {item.profileSkill?.level
                          ? ` · Nivel ${item.profileSkill.level}`
                          : ''}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-6 py-8 text-sm text-[#66686D]">
                Ningún requisito coincide con las habilidades guardadas en este
                navegador.
              </p>
            )}
          </section>

          <section className="overflow-hidden rounded-lg bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-[#E7E6E3] px-6 py-5">
              <div>
                <h2 className="text-lg font-semibold">Pendientes de cubrir</h2>
                <p className="mt-1 text-sm text-[#66686D]">
                  Requisitos no encontrados o con nivel inferior al indicado
                </p>
              </div>
              <span className="rounded-full bg-[#FFF4E5] px-3 py-1 text-sm font-bold text-[#92520D]">
                {pending.length}
              </span>
            </div>
            {pending.length ? (
              <ul className="divide-y divide-[#F0EFEC]">
                {pending.map((item) => (
                  <li
                    key={`pending-${item.index}`}
                    className="flex items-start justify-between gap-4 px-6 py-5"
                  >
                    <div className="flex items-start gap-3">
                      <CircleAlert
                        size={19}
                        className="mt-0.5 shrink-0 text-[#C2741B]"
                      />
                      <div>
                        <p className="text-sm font-semibold">{item.requirement}</p>
                        <p className="mt-1 text-xs text-[#66686D]">
                          {item.profileSkill
                            ? `Registrada con nivel ${item.profileSkill.level}${
                                item.requiredLevel
                                  ? `; se solicita ${item.requiredLevel}`
                                  : ''
                              }`
                            : 'No está registrada en tu perfil'}
                        </p>
                      </div>
                    </div>
                    <Link
                      href={`${vacancyHref}/comparar/habilidad/${item.index}`}
                      className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-[#92520D] hover:underline"
                      aria-label={`Ver detalle de ${item.skillName}`}
                    >
                      Ver detalle
                      <ArrowRight size={15} />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-6 py-8 text-sm text-[#66686D]">
                Todos los requisitos registrados coinciden con tus habilidades
                guardadas.
              </p>
            )}
          </section>
        </div>

        <LocalDataNotice />

        <div className="mt-6 flex justify-between">
          <Link
            href={vacancyHref}
            className="inline-flex items-center gap-2 rounded border border-[#C5C6CD] bg-white px-5 py-3 text-sm font-semibold text-[#000B21] hover:bg-[#F8F7F4]"
          >
            <ArrowLeft size={16} />
            Volver al detalle de vacante
          </Link>
          <Link
            href="/skills"
            className="inline-flex items-center gap-2 rounded bg-[#000B21] px-5 py-3 text-sm font-semibold text-white hover:bg-[#17243B]"
          >
            Revisar mis habilidades
            <ArrowRight size={16} />
          </Link>
        </div>
      </ComparisonPageFrame>
      <ComparisonFooter />
    </>
  );
}
