'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, BriefcaseBusiness, Building2, CalendarDays } from 'lucide-react';
import {
  fetchMyApplications,
  type MyApplication,
} from '@/features/job-postings/my-applications.service';

const DATE_FORMAT = new Intl.DateTimeFormat('es-BO', {
  dateStyle: 'medium',
  timeZone: 'America/La_Paz',
});

function appliedDate(value: string | null): string {
  return value ? DATE_FORMAT.format(new Date(value)) : 'Fecha no disponible';
}

function affinityLabel(value: number | null): string {
  return value === null
    ? 'Sin calcular'
    : `${value.toLocaleString('es-BO', { maximumFractionDigits: 2 })} %`;
}

export default function MyApplicationsPage() {
  const [applications, setApplications] = useState<MyApplication[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadApplications = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setApplications(await fetchMyApplications());
    } catch {
      setApplications(null);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadApplications();
  }, [loadApplications]);

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8 sm:px-6">
      <header>
        <h1 className="text-3xl font-bold text-abyssal-blue">Mis postulaciones</h1>
        <p className="mt-2 text-sm text-abyssal-blue/70">
          Revisa tus ofertas y el porcentaje de afinidad disponible para cada una.
        </p>
      </header>

      {loading ? (
        <p role="status" className="rounded-2xl border border-oatmeal bg-white p-8 text-center">
          Cargando tus postulaciones…
        </p>
      ) : error ? (
        <section className="rounded-2xl border border-truffle-trouble/40 bg-white p-8 text-center">
          <p role="alert" className="font-medium text-truffle-trouble">
            No pudimos cargar tus postulaciones
          </p>
          <button
            type="button"
            onClick={() => void loadApplications()}
            className="mt-4 rounded-lg bg-abyssal-blue px-4 py-2 font-semibold text-white hover:bg-abyssal-blue/90"
          >
            Reintentar
          </button>
        </section>
      ) : applications?.length === 0 ? (
        <section className="rounded-2xl border border-oatmeal bg-white p-10 text-center">
          <BriefcaseBusiness aria-hidden="true" className="mx-auto h-10 w-10 text-abyssal-blue/50" />
          <p role="status" className="mt-4 text-lg font-semibold text-abyssal-blue">
            Aún no te has postulado
          </p>
          <Link
            href="/job-postings"
            className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-abyssal-blue px-5 font-semibold text-white hover:bg-abyssal-blue/90"
          >
            Ver vacantes
          </Link>
        </section>
      ) : (
        <ul className="space-y-4">
          {applications?.map((application) => (
            <li key={application.id}>
              <article className="rounded-2xl border border-oatmeal bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-semibold text-abyssal-blue">
                        {application.vacancyTitle || 'Vacante sin título'}
                      </h2>
                      {!application.isVacancyAvailable && (
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                          Vacante no disponible
                        </span>
                      )}
                    </div>
                    <p className="flex items-center gap-2 text-sm text-slate-700">
                      <Building2 aria-hidden="true" className="h-4 w-4 shrink-0" />
                      {application.companyName || 'Empresa no disponible'}
                    </p>
                    <p className="flex items-center gap-2 text-sm text-slate-700">
                      <CalendarDays aria-hidden="true" className="h-4 w-4 shrink-0" />
                      Postulación: {appliedDate(application.appliedAt)}
                    </p>
                    <p className="text-sm text-slate-700">
                      Afinidad:{' '}
                      <span className="font-semibold">{affinityLabel(application.matchPercentage)}</span>
                    </p>
                  </div>
                  {application.vacancyId && (
                    <Link
                      href={`/my-applications/oferta/${encodeURIComponent(application.vacancyId)}`}
                      className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-abyssal-blue px-4 font-semibold text-abyssal-blue hover:bg-abyssal-blue/5"
                    >
                      Ver oferta
                      <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
                    </Link>
                  )}
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
