'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSurveyDraft } from '../hooks/use-survey-draft';
import { useSurveyForm, type SurveyWorkFields } from '../hooks/use-survey-form';
import { useSurveySubmit } from '../hooks/use-survey-submit';
import { useSurveyUserId } from '../hooks/use-survey-user-id';
import { SurveyDraftNotice } from './survey-draft-notice';
import { Button } from '@/shared/components/button';
import { SurveyJobInputs } from './survey-job-inputs';
import { SurveySalarySelector } from './survey-salary-selectors';
import { SurveyInsertionTimeInput } from './survey-insertion-time-input';
import { SurveyProgressBar } from './survey-progress-bar';
import { SurveyConfidentialNotice } from './survey-confidential-notice';
import { SurveyOfflineBanner } from './survey-offline-banner';
import { SurveyReviewModal, type SurveyReviewAnswer } from './survey-review-modal';
import type { SurveyDraft, WorkCondition } from '../types/survey.types';
import type { WorkModality } from '../types/survey-job.types';
import { SurveyWorkConditionSelector } from './survey-work-condition-selector';

const MODALITY_FROM_DRAFT: Record<NonNullable<SurveyDraft['modalidad']>, WorkModality> = {
presencial: 'Presencial',
remoto: 'Remoto',
hibrido: 'Hibrido',
};

export function SurveyContainer() {
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const router = useRouter();
  const userId = useSurveyUserId();
  const { draft, status, saveDraft, clearDraft } = useSurveyDraft(userId);
  const form = useSurveyForm();
  const submission = useSurveySubmit();

  useEffect(() => {
    if (!draft) return;
    form.replaceValues({
      condicion_laboral: draft.workCondition === 'works',
      cargo: draft.cargo,
      empresa: draft.empresa,
      area: draft.area,
        modalidad: draft.modalidad ? MODALITY_FROM_DRAFT[draft.modalidad] : undefined,
    });
  }, [draft]);

  const workCondition: WorkCondition | null = form.values.condicion_laboral === null
    ? null
    : form.values.condicion_laboral ? 'works' : 'not-works';

  const persistDraft = () => {
    if (!form.values.condicion_laboral) {
      saveDraft({ workCondition: 'not-works' });
      return;
    }
    saveDraft({
      workCondition: 'works',
      cargo: form.values.cargo,
      empresa: form.values.empresa,
      area: form.values.area,
      modalidad: form.values.modalidad?.toLowerCase() as SurveyDraft['modalidad'],
    });
  };

  const handleChange = (value: WorkCondition) => {
    form.setWorkCondition(value === 'works');
    setError(undefined);
  };

  const handleNext = () => {
    if (!form.canProceed) {
      setError('Seleccione su condición laboral actual');
      return;
    }
    if (hasWorkErrors) return;
    persistDraft();
    setIsReviewOpen(true);
  };

  const handleConfirm = async () => {
    if (form.values.condicion_laboral === null || hasWorkErrors) return;

    const sent = await submission.submit({
      condicion_laboral: form.values.condicion_laboral,
      cargo: form.values.cargo,
      empresa: form.values.empresa,
      area: form.values.area,
      modalidad: form.values.modalidad ?? undefined,
      salario_mensual: form.values.salario_mensual,
      tiempo_insercion: form.values.tiempo_insercion,
    });

    if (sent) {
      clearDraft();
      setIsReviewOpen(false);
    }
  };

  const reviewAnswers = useMemo<SurveyReviewAnswer[]>(() => {
    const answers: SurveyReviewAnswer[] = [{
      id: 'condicion-laboral', question: 'Condición laboral',
      answer: form.values.condicion_laboral ? 'Trabaja' : 'No trabaja', fullWidth: true,
    }];
    if (!form.values.condicion_laboral) return answers;
    return answers.concat([
      { id: 'cargo', question: 'Cargo', answer: form.values.cargo },
      { id: 'empresa', question: 'Empresa', answer: form.values.empresa },
      { id: 'area', question: 'Área o departamento', answer: form.values.area },
      { id: 'modalidad', question: 'Modalidad', answer: form.values.modalidad },
      { id: 'salario', question: 'Salario mensual', answer: form.values.salario_mensual },
      { id: 'insercion', question: 'Inserción laboral', answer: form.values.tiempo_insercion ? `${form.values.tiempo_insercion} meses` : '' },
    ]);
  }, [form.values]);

  const fieldErrors: Record<keyof SurveyWorkFields, string | undefined> = {
    cargo: form.values.condicion_laboral && !form.values.cargo.trim() ? 'Este campo es obligatorio' : undefined,
    empresa: form.values.condicion_laboral && !form.values.empresa.trim() ? 'Este campo es obligatorio' : undefined,
    area: form.values.condicion_laboral && !form.values.area.trim() ? 'Este campo es obligatorio' : undefined,
    modalidad: form.values.condicion_laboral && !form.values.modalidad ? 'Este campo es obligatorio' : undefined,
    salario_mensual: form.values.condicion_laboral && !form.values.salario_mensual ? 'Este campo es obligatorio' : undefined,
    tiempo_insercion: form.values.condicion_laboral && !form.values.tiempo_insercion ? 'Este campo es obligatorio' : undefined,
  };

  const hasWorkErrors = form.values.condicion_laboral === true && Object.values(fieldErrors).some(Boolean);

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
      <nav className="text-xs text-abyssal-blue/70">
        Inicio / Encuesta de empleabilidad / Situación laboral
      </nav>

      <h1 className="mt-4 font-display text-3xl font-semibold text-abyssal-blue">
        Encuesta de empleabilidad
      </h1>
      <p className="mt-2 text-sm text-abyssal-blue/70">
        Ayúdanos a conocer tu trayectoria profesional. Solo te preguntaremos lo que
        corresponda a tu situación.
      </p>

      <ol className="mt-6 flex items-center gap-3 text-sm">
        <li className="flex items-center gap-2 font-semibold text-abyssal-blue">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-abyssal-blue text-xs text-white">
            1
          </span>
          Situación laboral
        </li>
        <li className="h-px flex-1 bg-oatmeal" aria-hidden="true" />
        <li className="flex items-center gap-2 text-abyssal-blue/70">
          <span className="flex h-6 w-6 items-center justify-center rounded-full border border-oatmeal bg-white text-xs">
            2
          </span>
          Revisión y envío
        </li>
      </ol>

      <section className="mt-6 rounded-xl border border-oatmeal bg-white p-4 sm:p-6">
        <SurveyOfflineBanner />
        <SurveyWorkConditionSelector
          value={workCondition}
          onChange={handleChange}
          error={error}
        />

        <hr className="my-5 border-oatmeal" />

        {workCondition === null && (
          <div className="rounded-lg border border-oatmeal bg-palladian p-4 text-sm">
            <p className="font-semibold text-abyssal-blue">
              Formulario adaptado a tu condición laboral
            </p>
            <p className="text-abyssal-blue/70">
              Cuando selecciones Trabaja aparecerán inmediatamente las preguntas
              correspondientes.
            </p>
          </div>
        )}

        {workCondition === 'works' && (
          <div className="space-y-5">
            <SurveyProgressBar values={form.values} />
            <SurveyJobInputs
              values={{
                cargo: form.values.cargo,
                empresa: form.values.empresa,
                area: form.values.area,
                modalidad: form.values.modalidad as WorkModality | null,
              }}
              errors={fieldErrors}
              touched={{ cargo: true, empresa: true, area: true, modalidad: true }}
              onChange={(field, value) => form.setWorkField(field, String(value))}
              onBlur={() => undefined}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SurveySalarySelector
                value={form.values.salario_mensual}
                onChange={(value) => form.setWorkField('salario_mensual', value)}
                error={fieldErrors.salario_mensual}
              />
              <SurveyInsertionTimeInput
                value={form.values.tiempo_insercion}
                onChange={(value) => form.setWorkField('tiempo_insercion', value)}
                error={fieldErrors.tiempo_insercion}
              />
            </div>
            <SurveyConfidentialNotice />
          </div>
        )}

        {workCondition === 'not-works' && (
          <div className="rounded-lg border border-oatmeal bg-palladian p-4 text-sm">
            <p className="font-semibold text-abyssal-blue">
              No necesitas completar datos de empleo actual
            </p>
            <p className="text-abyssal-blue/70">
              Al seleccionar No trabaja se ocultan los campos laborales y puedes
              continuar sin llenarlos.
            </p>
          </div>
        )}

        <div className="mt-4 empty:hidden">
          <SurveyDraftNotice status={status} />
        </div>
      </section>

      <p className="mt-4 text-xs text-abyssal-blue/70">
        * Campos obligatorios únicamente si están visibles
      </p>

      <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Volver
        </Button>
        <Button type="button" variant="primary" onClick={handleNext}>
          Siguiente →
        </Button>
      </div>
      <SurveyReviewModal
        isOpen={isReviewOpen}
        answers={reviewAnswers}
        isSubmitting={submission.isSubmitting}
        onClose={() => setIsReviewOpen(false)}
        onConfirm={handleConfirm}
      />
      {submission.message && (
        <p
          role="status"
          className={`mt-4 rounded-lg border p-3 text-sm ${
            submission.status === 'success'
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {submission.message}
        </p>
      )}
    </main>
  );
}
