'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { AvailableJobPostingDetail } from '@umsspira/shared-types';
import { ApiError } from '@/shared/services/api-client';
import { ErrorAlert } from '@/shared/components/error-alert';
import { Spinner } from '@/shared/components/spinner';
import { getAvailableJobPosting } from '@/shared/services/available-job-postings';

type DetailState =
  | { status: 'loading' }
  | { status: 'loaded'; posting: AvailableJobPostingDetail }
  | { status: 'not-found' }
  | { status: 'error' };

export function JobPostingDetail({ id }: { id: string }) {
  const [state, setState] = useState<DetailState>({ status: 'loading' });
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let active = true;
    setState({ status: 'loading' });

    getAvailableJobPosting(id).then(
      (posting) => {
        if (active) setState({ status: 'loaded', posting });
      },
      (error: unknown) => {
        if (!active) return;
        if (error instanceof ApiError && error.status === 404) {
          setState({ status: 'not-found' });
          return;
        }
        setState({ status: 'error' });
      },
    );

    return () => {
      active = false;
    };
  }, [id, retryCount]);

  if (state.status === 'loading') {
    return (
      <main className="mx-auto max-w-5xl px-4 py-16">
        <Spinner size="lg" text="Cargando oferta. Espera un momento..." />
      </main>
    );
  }

  if (state.status === 'not-found') {
    return (
      <main className="mx-auto max-w-5xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Esta vacante no existe o ya no está disponible</h1>
        <Link
          href="/portal/empleos"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#0F172A] px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Volver a las vacantes
        </Link>
      </main>
    );
  }

  if (state.status === 'error') {
    return (
      <main className="mx-auto max-w-5xl px-4 py-16">
        <ErrorAlert
          title="No pudimos cargar los requisitos"
          message="No fue posible conectar para cargar esta oferta y sus requisitos. Inténtalo nuevamente."
          onRetry={() => setRetryCount((count) => count + 1)}
        />
      </main>
    );
  }

  const { posting } = state;
  const publicationDate = posting.fechaPublicacion
    ? new Date(posting.fechaPublicacion)
    : null;
  const formattedDate =
    publicationDate && !Number.isNaN(publicationDate.getTime())
      ? publicationDate.toLocaleDateString('es')
      : 'Fecha no disponible';

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
      <Link
        href="/portal/empleos"
        className="mb-6 inline-flex min-h-11 items-center text-sm font-semibold text-[#1E3A5F] underline underline-offset-4"
      >
        Volver a las vacantes
      </Link>
      <article className="rounded-2xl border border-[#C9C1B1] bg-[#F5F2EA] p-6 shadow-sm sm:p-8">
        <p className="text-sm text-slate-600">{posting.empresa ?? 'Empresa no disponible'}</p>
        <h1 className="mt-2 text-3xl font-serif font-bold text-slate-900">{posting.titulo}</h1>
        <p className="mt-3 text-sm text-slate-600">Publicada: {formattedDate}</p>

        <dl className="mt-6 grid gap-4 border-y border-[#C9C1B1] py-5 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-semibold text-slate-700">Modalidad</dt>
            <dd className="mt-1 text-slate-900">{posting.modalidad ?? 'No especificada'}</dd>
          </div>
          <div>
            <dt className="text-sm font-semibold text-slate-700">Nivel de experiencia</dt>
            <dd className="mt-1 text-slate-900">{posting.nivelExperiencia ?? 'No especificado'}</dd>
          </div>
        </dl>

        <section className="mt-6">
          <h2 className="text-xl font-bold text-slate-900">Descripción de la oferta</h2>
          <p className="mt-3 whitespace-pre-wrap leading-7 text-slate-700">
            {posting.descripcionTecnica ?? 'No se registró una descripción técnica.'}
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-bold text-slate-900">Requisitos técnicos</h2>
          {posting.requisitos.length === 0 ? (
            <p className="mt-3 text-slate-700">
              Esta vacante no requiere conocimientos técnicos específicos
            </p>
          ) : (
            <ul className="mt-3 flex flex-wrap gap-2">
              {posting.requisitos.map((requirement) => (
                <li
                  key={requirement.id}
                  className="rounded-full border border-[#C9C1B1] bg-white px-4 py-2 text-sm text-slate-800"
                >
                  {requirement.nombre}
                </li>
              ))}
            </ul>
          )}
        </section>
      </article>
    </main>
  );
}
