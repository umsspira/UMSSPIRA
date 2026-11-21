'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { AvailableJobPosting } from '@umsspira/shared-types';
import { ErrorAlert } from '@/shared/components/error-alert';
import { Spinner } from '@/shared/components/spinner';
import { listAvailableJobPostings } from '@/shared/services/available-job-postings';
import { jobPostingDetailRoute } from '@/shared/routes/job-postings';

type ListState =
  | { status: 'loading' }
  | { status: 'loaded'; postings: AvailableJobPosting[] }
  | { status: 'error' };

export function AvailableJobPostingsSection() {
  const [state, setState] = useState<ListState>({ status: 'loading' });
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let active = true;
    setState({ status: 'loading' });

    listAvailableJobPostings().then(
      (postings) => {
        if (active) setState({ status: 'loaded', postings });
      },
      () => {
        if (active) setState({ status: 'error' });
      },
    );

    return () => {
      active = false;
    };
  }, [retryCount]);

  return (
    <section
      aria-labelledby="available-job-postings-heading"
      className="pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full"
    >
      <h2
        id="available-job-postings-heading"
        className="text-2xl font-serif font-bold text-slate-900 mb-6"
      >
        Vacantes disponibles
      </h2>

      {state.status === 'loading' && (
        <div className="space-y-6">
          <Spinner
            size="lg"
            text="Cargando vacantes disponibles. Espera un momento..."
            className="py-8"
          />
          <div aria-hidden="true" className="grid gap-4 md:grid-cols-2">
            {[0, 1].map((item) => (
              <div
                key={item}
                className="h-28 animate-pulse rounded-2xl border border-[#C9C1B1] bg-[#F5F2EA]"
              />
            ))}
          </div>
        </div>
      )}

      {state.status === 'error' && (
        <ErrorAlert
          title="No pudimos cargar las vacantes"
          message="Ocurrió un problema al buscar vacantes disponibles."
          onRetry={() => setRetryCount((count) => count + 1)}
        />
      )}

      {state.status === 'loaded' && state.postings.length === 0 && (
        <div className="rounded-2xl border border-[#C9C1B1] bg-[#F5F2EA] p-8 text-center">
          <p className="mb-5 text-slate-700">Aún no hay vacantes disponibles</p>
          <Link
            href="/portal"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#0F172A] px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Volver al inicio
          </Link>
        </div>
      )}

      {state.status === 'loaded' && state.postings.length > 0 && (
        <ul className="grid gap-4 md:grid-cols-2">
          {state.postings.map((posting) => (
            <li
              key={posting.id}
              className="flex items-center justify-between gap-5 rounded-2xl border border-[#C9C1B1] bg-[#F5F2EA] p-6 shadow-sm"
            >
              <div className="min-w-0">
                <h3 className="font-bold text-slate-900">{posting.titulo}</h3>
                <p className="mt-1 text-sm text-slate-600">
                  {posting.empresa ?? 'Empresa no disponible'}
                </p>
              </div>
              <Link
                href={jobPostingDetailRoute(posting.id)}
                className="shrink-0 rounded-lg bg-[#0F172A] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Ver oferta
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
