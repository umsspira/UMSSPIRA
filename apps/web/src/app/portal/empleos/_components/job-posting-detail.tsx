'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Briefcase, CalendarDays, MapPin } from 'lucide-react';
import type { AvailableJobPostingDetail } from '@umsspira/shared-types';
import { ApiError } from '@/shared/services/api-client';
import { ErrorAlert } from '@/shared/components/error-alert';
import { Spinner } from '@/shared/components/spinner';
import { ApplyToVacancyButton } from '@/shared/components/apply-to-vacancy-button';
import { getAvailableJobPosting } from '@/shared/services/available-job-postings';
import { calculateVacancyAffinity, type JobPostingAffinityResult } from '@/shared/services/job-posting-affinity';
import { descriptionWithoutRequirements } from '@/shared/utils/job-posting-requirements';

type DetailState =
  | { status: 'loading' }
  | { status: 'loaded'; posting: AvailableJobPostingDetail }
  | { status: 'not-found' }
  | { status: 'error' };

type AffinityState =
  | { status: 'loading' }
  | { status: 'error'; message?: string; retryable?: boolean }
  | JobPostingAffinityResult;

export function JobPostingDetail({
  id,
  backHref = '/portal/empleos',
  presentation = 'legacy',
}: {
  id: string;
  backHref?: string;
  presentation?: 'legacy' | 'hu002';
}) {
  const [state, setState] = useState<DetailState>({ status: 'loading' });
  const [retryCount, setRetryCount] = useState(0);
  const [affinityState, setAffinityState] = useState<AffinityState>({ status: 'loading' });
  const [affinityRetryCount, setAffinityRetryCount] = useState(0);
  const [showComparison, setShowComparison] = useState(false);

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

  const loadedPosting = state.status === 'loaded' ? state.posting : null;
  const technicalRequirements = useMemo(
    () => loadedPosting?.requisitos ?? [],
    [loadedPosting],
  );

  useEffect(() => {
    if (!loadedPosting) return;
    let active = true;
    setAffinityState({ status: 'loading' });
    setShowComparison(false);
    calculateVacancyAffinity(id).then(
      (result) => active && setAffinityState(result),
      (error: unknown) => {
        if (!active) return;
        const message = error instanceof Error ? error.message : 'No se pudo calcular la afinidad';
        const retryable = (error as Record<string, unknown>)?.status === 503 || (error as Record<string, unknown>)?.retryable !== false;
        setAffinityState({ status: 'error', message, retryable });
      },
    );
    return () => {
      active = false;
    };
  }, [id, loadedPosting, affinityRetryCount]);

  if (state.status === 'loading') {
    return (
      <main className={presentation === 'hu002' ? 'min-h-screen bg-[#F5F2EA] px-4 py-16' : 'mx-auto max-w-5xl px-4 py-16'}>
        <Spinner size="lg" text="Cargando oferta. Espera un momento..." />
      </main>
    );
  }

  if (state.status === 'not-found') {
    if (presentation === 'hu002') {
      return (
        <main className="min-h-screen bg-[#F5F2EA] px-4 py-16 sm:px-6">
          <section className="mx-auto max-w-3xl rounded-2xl border border-[#D8CEBF] bg-white p-8 text-center shadow-sm sm:p-12">
            <h1 className="text-2xl font-bold text-[#172238]">Esta vacante ya no está disponible</h1>
            <Link
              href={backHref}
              className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#172238] px-5 font-semibold text-white transition hover:bg-slate-700"
            >
              <ArrowLeft size={18} aria-hidden="true" />
              Volver a vacantes
            </Link>
          </section>
        </main>
      );
    }

    return (
      <main className="mx-auto max-w-5xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Esta vacante no existe o ya no está disponible</h1>
        <Link
          href={backHref}
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#0F172A] px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Volver a las vacantes
        </Link>
      </main>
    );
  }

  if (state.status === 'error') {
    if (presentation === 'hu002') {
      return (
        <main className="min-h-screen bg-[#F5F2EA] px-4 py-12 sm:px-6">
          <div className="mx-auto max-w-3xl">
            <ErrorAlert
              title="No pudimos cargar el detalle de la vacante"
              message="Ocurrió un problema al consultar la oferta. Inténtalo nuevamente."
              onRetry={() => setRetryCount((count) => count + 1)}
            />
            <Link
              href={backHref}
              className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#D8CEBF] bg-white px-4 font-semibold text-[#172238] hover:bg-slate-50"
            >
              <ArrowLeft size={18} aria-hidden="true" />
              Volver a vacantes
            </Link>
          </div>
        </main>
      );
    }

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

  if (presentation === 'hu002') {
    return (
      <main className="min-h-screen bg-[#F5F2EA] px-4 py-8 text-[#172238] sm:px-6 lg:px-10 lg:py-12">
        <div className="mx-auto max-w-[1500px]">
          <Link
            href={backHref}
            className="mb-8 inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#D8CEBF] bg-white px-4 font-medium text-[#172238] transition hover:bg-slate-50"
          >
            <ArrowLeft size={19} aria-hidden="true" />
            Bolsa de Trabajo
          </Link>

          <header className="rounded-3xl bg-[#192B36] px-6 py-8 text-white sm:px-10 sm:py-10 lg:px-14">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="text-lg font-semibold">{posting.empresa ?? 'Empresa no disponible'}</p>
              <span className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800">
                Abierta
              </span>
            </div>
            <h1 className="mt-8 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              {posting.titulo}
            </h1>
            <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 text-slate-200">
              {posting.modalidad && (
                <span className="inline-flex items-center gap-2">
                  <MapPin size={20} aria-hidden="true" />
                  {posting.modalidad}
                </span>
              )}
              {posting.nivelExperiencia && (
                <span className="inline-flex items-center gap-2">
                  <Briefcase size={19} aria-hidden="true" />
                  {posting.nivelExperiencia}
                </span>
              )}
            </div>
          </header>

          <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1.8fr)_minmax(300px,.8fr)]">
            <div className="space-y-6">
              <section className="rounded-2xl border border-[#D8CEBF] bg-white p-6 shadow-sm sm:p-8">
                <h2 className="text-2xl font-bold">Acerca del puesto</h2>
                <p className="mt-5 whitespace-pre-wrap text-base leading-7 text-slate-700">
                  {descriptionWithoutRequirements(posting.descripcionTecnica) || 'La empresa no registró una descripción adicional para esta oferta.'}
                </p>
              </section>

              <section className="rounded-2xl border border-[#D8CEBF] bg-white p-6 shadow-sm sm:p-8">
                <h2 className="inline-flex items-center gap-3 text-2xl font-bold">
                  <Briefcase className="text-slate-500" size={22} aria-hidden="true" />
                  Requisitos técnicos
                </h2>
                {technicalRequirements.length === 0 ? (
                  <p className="mt-5 leading-7 text-slate-700">
                    La empresa no detalló requisitos técnicos en la descripción de esta oferta.
                  </p>
                ) : (
                  <ul className="mt-5 space-y-3">
                    {technicalRequirements.map((requirement) => (
                      <li key={requirement.id} className="flex gap-3 leading-7 text-slate-700">
                        <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-[#A64D35]" aria-hidden="true" />
                        {requirement.nombre}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="rounded-2xl border border-[#D8CEBF] bg-white p-6 shadow-sm sm:p-8">
                <h2 className="text-2xl font-bold">{posting.empresa ?? 'Empresa'}</h2>
                <p className="mt-3 text-slate-600">Información de la empresa no disponible en esta consulta.</p>
              </section>
            </div>

            <aside className="space-y-5 lg:sticky lg:top-6">
              <section aria-labelledby="job-apply-heading" className="rounded-2xl border border-[#D8CEBF] bg-white p-6 shadow-sm">
                <h2 id="job-apply-heading" className="text-xl font-bold">Postulación</h2>
                <div className="mt-4">
                  <ApplyToVacancyButton vacancyId={posting.id} />
                </div>
              </section>
              <section aria-labelledby="job-affinity-heading" className="rounded-2xl border border-[#D8CEBF] bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <h2 id="job-affinity-heading" className="text-xl font-bold leading-7">
                    Tu afinidad con esta oferta
                  </h2>
                  {affinityState.status === 'ready' && (
                    <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800">
                      Vigente
                    </span>
                  )}
                </div>
                {affinityState.status === 'loading' && (
                  <div role="status" className="mt-6 rounded-xl border border-[#D8CEBF] bg-[#FAF8F3] px-4 py-6 text-center">
                    <p className="font-semibold text-slate-800">Calculando afinidad…</p>
                  </div>
                )}
                {affinityState.status === 'profile-incomplete' && (
                  <div className="mt-6 rounded-xl border border-[#D8CEBF] bg-[#FAF8F3] p-5 text-center">
                    <p className="font-semibold text-slate-800">Completa tu perfil para conocer tu afinidad</p>
                    <Link href="/mentorship/onboarding" className="mt-4 inline-flex min-h-10 items-center rounded-lg bg-[#172238] px-4 font-semibold text-white hover:bg-slate-700">
                      Configurar perfil de mentoría
                    </Link>
                  </div>
                )}
                {(affinityState.status === 'no-requirements' || (affinityState as { status: string }).status === 'insufficient-requirements') && (
                  <div role="status" className="mt-6 rounded-xl border border-[#D8CEBF] bg-[#FAF8F3] px-4 py-6 text-center">
                    <p className="font-semibold text-slate-800">Afinidad no calculada</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">La oferta no contiene requisitos técnicos identificables para comparar.</p>
                  </div>
                )}
                {affinityState.status === 'error' && (
                  <div role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-5 text-center">
                    <p className="font-semibold text-red-800">Afinidad no disponible por ahora</p>
                    <button type="button" onClick={() => setAffinityRetryCount((count) => count + 1)} className="mt-4 min-h-10 rounded-lg bg-[#172238] px-4 font-semibold text-white hover:bg-slate-700">
                      Reintentar cálculo
                    </button>
                  </div>
                )}
                {affinityState.status === 'ready' && (
                  <>
                    <div className="mt-6 flex items-center justify-between gap-3">
                      <p className="text-5xl font-bold tracking-tight text-[#A64D35]">{affinityState.percentage}%</p>
                      <span className="text-sm text-slate-500">Afinidad</span>
                    </div>
                    <div
                      role="progressbar"
                      aria-label="Porcentaje de afinidad"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={affinityState.percentage}
                      className="mt-4 h-2 overflow-hidden rounded-full bg-[#EEE9DF]"
                    >
                      <div className="h-full rounded-full bg-[#F7A95B]" style={{ width: `${affinityState.percentage}%` }} />
                    </div>
                    <p className="mt-4 text-sm leading-6 text-slate-600">Estimación orientativa basada en los requisitos identificados. No garantiza la contratación.</p>
                    <p className="mt-3 text-sm text-slate-500">Actualizado: {new Date(affinityState.calculatedAt).toLocaleString('es-BO')}</p>
                    <button type="button" aria-expanded={showComparison} onClick={() => setShowComparison((visible) => !visible)} className="mt-5 min-h-12 w-full rounded-lg border border-[#D8CEBF] px-4 font-semibold text-[#172238] hover:bg-slate-50">
                      {showComparison ? 'Ocultar comparación' : 'Ver comparación'}
                    </button>
                    {showComparison && (
                      <ul className="mt-4 space-y-3 border-t border-[#E8E1D6] pt-4">
                        {affinityState.comparison.map((item, index) => (
                          <li key={`${item.requirement}-${index}`} className="rounded-lg bg-[#FAF8F3] p-3 text-sm">
                            <p className="font-semibold text-slate-800">{item.requirement}</p>
                            <p className="mt-1 text-slate-600">Habilidad: {item.matchedSkill ?? 'No encontrada'}</p>
                            <p className="mt-1 text-slate-500">Resultado: {item.result === 'exact' ? 'Exacta' : item.result === 'similar' ? 'Similar' : 'No encontrada'}</p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
                <p id="job-affinity-note" className="mt-4 text-sm leading-6 text-slate-500">
                  La afinidad es orientativa y no garantiza la contratación.
                </p>
              </section>              <section className="rounded-2xl border border-[#D8CEBF] bg-white p-6 shadow-sm">
                <h2 className="text-xl font-bold">Información de la oferta</h2>
                <dl className="mt-5 space-y-5">
                  <div>
                    <dt className="text-sm text-slate-500">Modalidad</dt>
                    <dd className="mt-1 font-semibold">{posting.modalidad ?? 'No especificada'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-slate-500">Experiencia</dt>
                    <dd className="mt-1 font-semibold">{posting.nivelExperiencia ?? 'No especificada'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-slate-500">Ãrea laboral</dt>
                    <dd className="mt-1 font-semibold">{posting.areaLaboral ?? 'No especificada'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-slate-500">UbicaciÃ³n</dt>
                    <dd className="mt-1 font-semibold">{posting.ubicacion ?? 'No especificada'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-slate-500">Publicación</dt>
                    <dd className="mt-1 inline-flex items-center gap-2 font-semibold">
                      <CalendarDays size={17} aria-hidden="true" />
                      {formattedDate}
                    </dd>
                  </div>
                </dl>
              </section>
            </aside>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
      <Link
        href={backHref}
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
          <h2 className="text-xl font-bold text-slate-900">Postulación</h2>
          <div className="mt-3">
            <ApplyToVacancyButton vacancyId={posting.id} />
          </div>
        </section>

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
