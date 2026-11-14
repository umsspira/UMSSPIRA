'use client';

import { useEffect, useState } from 'react';
import { SessionError } from '@/shared/services/auth-session';
import { notifySessionExpired } from '@/modules/auth/frontend/services/session-expired';
import {
  createSurvey,
  formatDate,
  loadManagedSurveys,
  publishSurvey,
  toInputDate,
  unpublishSurvey,
  updateSurvey,
} from '../services/survey-admin.adapter';
import type { ManagedSurvey, SurveyFormValues } from '../types/survey-admin.types';
import { SurveyAdminForm } from './survey-admin-form';

type FormMode = { type: 'new' } | { type: 'edit'; survey: ManagedSurvey } | null;

const GRID = 'md:grid-cols-[minmax(0,2fr)_7rem_7rem_7rem_13rem]';
const GENERIC_ERROR = 'No se pudo completar la acción. Inténtalo de nuevo.';

function statusLabel(status: string | null): string {
  if (status === 'PUBLICADA') return 'Publicado';
  if (status === 'BORRADOR') return 'Borrador';
  return '—';
}

export function SurveyManagement() {
  const [surveys, setSurveys] = useState<ManagedSurvey[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [form, setForm] = useState<FormMode>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    loadManagedSurveys(controller.signal)
      .then((list) => {
        if (active) setSurveys(list);
      })
      .catch((reason) => {
        if (!active || controller.signal.aborted) return;
        if (reason instanceof SessionError && reason.status === 401) {
          notifySessionExpired();
          return;
        }
        setLoadError('No se pudieron cargar las encuestas.');
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [attempt]);

  const reload = () => setAttempt((n) => n + 1);

  function report(reason: unknown, show: (message: string) => void) {
    if (reason instanceof SessionError && reason.status === 401) {
      notifySessionExpired();
      return;
    }
    show(reason instanceof Error ? reason.message : GENERIC_ERROR);
  }

  function handleSubmit(values: SurveyFormValues) {
    if (!form) return;
    setSubmitting(true);
    setFormError(null);
    const action = form.type === 'edit' ? updateSurvey(form.survey.id, values) : createSurvey(values);
    action
      .then(() => {
        setForm(null);
        reload();
      })
      .catch((reason) => report(reason, setFormError))
      .finally(() => setSubmitting(false));
  }

  function handleToggle(survey: ManagedSurvey) {
    setActionError(null);
    setBusyId(survey.id);
    const action = survey.status === 'PUBLICADA' ? unpublishSurvey(survey.id) : publishSurvey(survey.id);
    action
      .then(reload)
      .catch((reason) => {
        report(reason, setActionError); // CA-08: la encuesta sigue en Borrador
        reload();
      })
      .finally(() => setBusyId(null));
  }

  function openForm(mode: FormMode) {
    setFormError(null);
    setActionError(null);
    setForm(mode);
  }

  return (
    <section
      aria-labelledby="survey-management-heading"
      className="min-w-0 rounded-xl border border-oatmeal bg-white p-4 shadow-sm sm:p-6"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 id="survey-management-heading" className="text-lg font-semibold text-abyssal-blue">
            Gestión de encuestas
          </h2>
          <p className="mt-1 text-sm text-abyssal-blue/70">Encuestas de empleabilidad de tu carrera</p>
        </div>
        {!form && (
          <button
            type="button"
            onClick={() => openForm({ type: 'new' })}
            className="min-h-11 rounded-md bg-abyssal-blue px-4 py-2 text-sm font-semibold text-white"
          >
            + Nueva encuesta
          </button>
        )}
      </div>

      {actionError && (
        <p role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {actionError}
        </p>
      )}

      {form && (
        <SurveyAdminForm
          key={form.type === 'edit' ? form.survey.id : 'new'}
          heading={form.type === 'edit' ? 'Editar encuesta' : 'Nueva encuesta'}
          initial={
            form.type === 'edit'
              ? {
                  title: form.survey.title ?? '',
                  startDate: toInputDate(form.survey.startDate),
                  endDate: toInputDate(form.survey.endDate),
                }
              : undefined
          }
          submitting={submitting}
          serverError={formError}
          onSubmit={handleSubmit}
          onCancel={() => setForm(null)}
        />
      )}

      {loadError && (
        <div role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <p>{loadError}</p>
          <button
            type="button"
            className="mt-2 underline"
            onClick={() => {
              setLoadError(null);
              reload();
            }}
          >
            Reintentar
          </button>
        </div>
      )}

      {!loadError && surveys === null && (
        <p role="status" className="mt-4 text-sm text-gray-600">
          Cargando encuestas…
        </p>
      )}

      {surveys && surveys.length === 0 && (
        <p className="mt-4 text-sm text-abyssal-blue/70">Todavía no hay encuestas. Crea la primera.</p>
      )}

      {surveys && surveys.length > 0 && (
        <ul className="mt-4">
          <li
            aria-hidden="true"
            className={`hidden gap-3 bg-palladian px-4 py-2 text-xs font-semibold text-abyssal-blue/70 md:grid ${GRID}`}
          >
            <span>Título</span>
            <span>Inicio</span>
            <span>Fin</span>
            <span>Estado</span>
            <span />
          </li>
          {surveys.map((survey) => {
            const isDraft = survey.status === 'BORRADOR';
            const isPublished = survey.status === 'PUBLICADA';
            return (
              <li
                key={survey.id}
                className={`mb-3 grid min-w-0 gap-2 rounded-lg border border-oatmeal p-4 md:mb-0 md:items-center md:gap-3 md:rounded-none md:border-0 md:border-b md:px-4 md:py-3 ${GRID}`}
              >
                <p className="min-w-0 break-words font-semibold text-abyssal-blue">
                  {survey.title ?? 'Sin título'}
                </p>
                <p className="text-sm text-abyssal-blue">
                  <span className="md:hidden">Inicio: </span>
                  {formatDate(survey.startDate)}
                </p>
                <p className="text-sm text-abyssal-blue">
                  <span className="md:hidden">Fin: </span>
                  {formatDate(survey.endDate)}
                </p>
                <p>
                  <span
                    className={
                      'inline-block rounded-full px-2 py-0.5 text-xs font-semibold ' +
                      (isPublished ? 'bg-green-100 text-green-800' : 'bg-oatmeal text-abyssal-blue')
                    }
                  >
                    {statusLabel(survey.status)}
                  </span>
                </p>
                <div className="flex flex-wrap gap-2 md:justify-end">
                  {isDraft && (
                    <button
                      type="button"
                      onClick={() => openForm({ type: 'edit', survey })}
                      className="min-h-11 rounded-md border border-abyssal-blue bg-white px-3 py-2 text-sm font-semibold text-abyssal-blue"
                    >
                      Editar
                    </button>
                  )}
                  {(isDraft || isPublished) && (
                    <button
                      type="button"
                      disabled={busyId === survey.id}
                      onClick={() => handleToggle(survey)}
                      className={
                        'min-h-11 rounded-md px-3 py-2 text-sm font-semibold disabled:opacity-60 ' +
                        (isDraft
                          ? 'bg-abyssal-blue text-white'
                          : 'border border-abyssal-blue bg-white text-abyssal-blue')
                      }
                    >
                      {isDraft ? 'Publicar' : 'Despublicar'}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}