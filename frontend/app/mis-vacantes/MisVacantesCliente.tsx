'use client';

import { Check } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  configuredCompanyId,
  isVacancyAvailable,
  listVacancies,
  type Vacancy,
} from '../../lib/api/vacantes';
import VacancyAdminFooter from '../vacantes/components/VacancyAdminFooter';

export default function MisVacantesCliente() {
  const searchParams = useSearchParams();
  const savedId = searchParams.get('guardada');
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [loading, setLoading] = useState(Boolean(configuredCompanyId));
  const [error, setError] = useState(
    configuredCompanyId
      ? ''
      : 'No se configuró la empresa cuyas vacantes deben consultarse.',
  );

  useEffect(() => {
    let active = true;

    if (!configuredCompanyId) {
      return;
    }

    listVacancies(configuredCompanyId)
      .then((data) => {
        if (active) setVacancies(data);
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : 'No se pudieron consultar las vacantes.',
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const counts = useMemo(() => {
    const available = vacancies.filter((vacancy) =>
      isVacancyAvailable(vacancy.estado),
    ).length;
    return {
      all: vacancies.length,
      available,
      unavailable: vacancies.length - available,
    };
  }, [vacancies]);

  const savedVacancy = vacancies.find((vacancy) => vacancy.id === savedId);

  return (
    <div className="min-h-[calc(100vh-84px)] bg-[#eee9df] text-[#1b2632]">
      <main className="mx-auto min-h-[890px] max-w-[1440px] px-5 pb-16 pt-6 sm:px-8 lg:px-14">
        <p className="text-xs font-medium">Mis vacantes</p>
        <header className="mt-7">
          <h1 className="text-3xl font-bold tracking-tight">Mis vacantes</h1>
          <p className="mt-2 text-sm text-[#6e7880]">
            Consulta las vacantes registradas de tu empresa.
          </p>
        </header>

        {savedId && !loading && !error && (
          <section className="mt-14 flex min-h-[70px] items-center gap-4 rounded-[10px] border border-[#2f7a5d] bg-[#e7f3ed] px-5 text-[#2f7a5d]">
            <Check size={20} strokeWidth={3} aria-hidden="true" />
            <div>
              <h2 className="text-sm font-bold">Vacante guardada</h2>
              <p className="mt-1 text-[11px] font-medium">
                {savedVacancy
                  ? `${savedVacancy.titulo} ya aparece en tu listado de vacantes.`
                  : 'La vacante guardada ya forma parte de tu listado.'}
              </p>
            </div>
          </section>
        )}

        <section className={`${savedId ? 'mt-4' : 'mt-14'} rounded-2xl border border-[#ddd6c8] bg-white p-5 sm:p-7`}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-xl font-bold">Mis vacantes</h2>
            <Link
              href="/vacantes/nueva"
              className="rounded-lg bg-[#ffb162] px-4 py-2.5 text-xs font-semibold hover:bg-[#f2a455]"
            >
              Nueva vacante
            </Link>
          </div>

          <div className="mt-7 flex flex-wrap gap-x-9 gap-y-3 rounded-lg bg-[#f8f5ef] px-5 py-3 text-xs font-semibold">
            <span>Todas {counts.all}</span>
            <span className="text-[#2f7a5d]">Disponibles {counts.available}</span>
            <span className="text-[#a35139]">No disponibles {counts.unavailable}</span>
          </div>

          {loading ? (
            <p className="py-16 text-center text-sm text-[#6e7880]" role="status">
              Cargando vacantes...
            </p>
          ) : error ? (
            <p className="my-8 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : vacancies.length === 0 ? (
            <div className="py-16 text-center">
              <h3 className="text-base font-bold">Todavía no hay vacantes registradas</h3>
              <p className="mt-2 text-sm text-[#6e7880]">
                Registra una vacante para verla en este listado.
              </p>
            </div>
          ) : (
            <ul className="mt-5 divide-y divide-[#ddd6c8]">
              {vacancies.map((vacancy, index) => {
                const available = isVacancyAvailable(vacancy.estado);
                return (
                  <li
                    key={vacancy.id}
                    className={`grid gap-3 rounded-lg px-4 py-4 text-sm sm:grid-cols-[minmax(160px,1fr)_minmax(220px,2fr)_120px_110px] sm:items-center ${
                      index % 2 === 1 ? 'bg-[#f8f5ef]' : ''
                    }`}
                  >
                    <Link
                      href={`/vacantes/${encodeURIComponent(vacancy.id)}`}
                      className="break-all text-xs font-semibold text-[#a35139] hover:underline"
                    >
                      {vacancy.id}
                    </Link>
                    <span className="font-medium">{vacancy.titulo}</span>
                    <span
                      className={`rounded-full px-4 py-2 text-center text-[11px] font-bold ${
                        available
                          ? 'bg-[#e7f3ed] text-[#2f7a5d]'
                          : 'bg-[#fff4db] text-[#a66b1f]'
                      }`}
                    >
                      {vacancy.estado}
                    </span>
                    <Link
                      href={`/vacantes/${encodeURIComponent(vacancy.id)}/requisitos`}
                      className="inline-flex items-center justify-center rounded-md border border-[#dfd5c4] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#8b4f17] hover:bg-[#fff9ef] transition-colors"
                    >
                      Requisitos
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
      <VacancyAdminFooter />
    </div>
  );
}
