'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/shared/components/button';

import { useSurveyDraft } from '../hooks/use-survey-draft';
import { useSurveyEdit } from '../hooks/use-survey-edit';
import {
  isMeaningfulText,
  useSurveyForm,
  type SurveyFormValues,
  type SurveyWorkFields,
} from '../hooks/use-survey-form';
import { useSurveySubmit } from '../hooks/use-survey-submit';
import { useSurveyUserId } from '../hooks/use-survey-user-id';

import {
  getMySurveyResponse,
  getSurveySubmissionStatus,
  type SurveyPersistedAnswer,
} from '../services/surveys.service';

import type { WorkModality } from '../types/survey-job.types';
import type { SurveyDraft, WorkCondition } from '../types/survey.types';

import { SurveyConfidentialNotice } from './survey-confidential-notice';
import { SurveyDraftNotice } from './survey-draft-notice';
import { SurveyInsertionTimeInput } from './survey-insertion-time-input';
import { SurveyJobInputs } from './survey-job-inputs';
import { SurveyOfflineBanner } from './survey-offline-banner';
import { SurveyProgressBar } from './survey-progress-bar';
import {
  SurveyReviewModal,
  type SurveyReviewAnswer,
} from './survey-review-modal';
import { SurveySalarySelector } from './survey-salary-selectors';
import { SurveySubmissionStatusModal } from './survey-submission-status-modal';
import { SurveyWorkConditionSelector } from './survey-work-condition-selector';

const MODALITY_FROM_DRAFT: Record<
  NonNullable<SurveyDraft['modalidad']>,
  WorkModality
> = {
  presencial: 'Presencial',
  remoto: 'Remoto',
  hibrido: 'Hibrido',
};

export function SurveyContainer() {
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  // HU-006 / T6.2
  const [isEditing, setIsEditing] = useState(false);
  const [editUsedLocally, setEditUsedLocally] = useState(false);

  const successNoticeRef = useRef<HTMLParagraphElement>(null);

  const [error, setError] = useState<string | undefined>();

  // HU-001 (QA): aviso al pasar de «Trabaja» a «No trabaja».
  const [showDiscardNotice, setShowDiscardNotice] = useState(false);

  // HU-002: errores visibles únicamente después de intentar continuar/guardar.
  const [showErrors, setShowErrors] = useState(false);

  const [submissionCheck, setSubmissionCheck] = useState<
    'checking' | 'available' | 'submitted' | 'error'
  >('checking');

  const [statusCheckAttempt, setStatusCheckAttempt] = useState(0);

  const [recordedResponse, setRecordedResponse] =
    useState<SurveyPersistedAnswer | null>(null);

  const router = useRouter();

  const userId = useSurveyUserId();

  const { draft, status, saveDraft, clearDraft } =
    useSurveyDraft(userId);

  const form = useSurveyForm();

  const submission = useSurveySubmit();

  const edit = useSurveyEdit();

  /**
   * Consulta inicial:
   * - verifica si existe una respuesta previa;
   * - si existe, recupera las respuestas persistidas.
   */
  useEffect(() => {
    let active = true;

    setSubmissionCheck('checking');

    getSurveySubmissionStatus()
      .then(async (submitted) => {
        if (!active) return;

        if (!submitted) {
          setSubmissionCheck('available');
          return;
        }

        try {
          const response = await getMySurveyResponse();

          if (active) {
            setRecordedResponse(response);
          }
        } catch {
          // /status ya confirmó que existe respuesta.
          // El resumen es información complementaria.
        } finally {
          if (active) {
            setSubmissionCheck('submitted');
          }
        }
      })
      .catch(() => {
        if (active) {
          setSubmissionCheck('error');
        }
      });

    return () => {
      active = false;
    };
  }, [statusCheckAttempt]);

  /**
   * Tras cerrar el modal del envío inicial, enfoca el mensaje de éxito.
   */
  useEffect(() => {
    if (!isReviewOpen && submission.status === 'success') {
      successNoticeRef.current?.focus();
    }
  }, [isReviewOpen, submission.status]);

  /**
   * Recuperación del borrador para una encuesta todavía no enviada.
   */
  useEffect(() => {
    if (!draft || submissionCheck === 'submitted') return;

    form.replaceValues({
      condicion_laboral: draft.workCondition === 'works',
      cargo: draft.cargo,
      empresa: draft.empresa,
      area: draft.area,
      modalidad: draft.modalidad
        ? MODALITY_FROM_DRAFT[draft.modalidad]
        : undefined,
      salario_mensual: draft.salario_mensual,
      tiempo_insercion: draft.tiempo_insercion,
    });
  }, [draft, submissionCheck]);

  /**
   * HU-006 CA-02:
   * precarga las respuestas persistidas cuando la encuesta ya fue enviada.
   */
  useEffect(() => {
    if (
      submissionCheck !== 'submitted' ||
      !recordedResponse ||
      isEditing
    ) {
      return;
    }

    form.replaceValues({
      condicion_laboral: recordedResponse.condicion_laboral,
      cargo: recordedResponse.cargo ?? '',
      empresa: recordedResponse.empresa ?? '',
      area: recordedResponse.area ?? '',
      modalidad: recordedResponse.modalidad ?? '',
      salario_mensual: recordedResponse.salario_mensual ?? '',
      tiempo_insercion: recordedResponse.tiempo_insercion ?? '',
    });
  }, [recordedResponse, submissionCheck, isEditing]);

  const workCondition: WorkCondition | null =
    form.values.condicion_laboral === null
      ? null
      : form.values.condicion_laboral
        ? 'works'
        : 'not-works';

  /**
   * Persistencia del borrador correspondiente al flujo de envío inicial.
   * Durante HU-006 no se guarda borrador porque se está modificando una
   * respuesta ya persistida.
   */
  const persistDraft = (
    values: SurveyFormValues = form.values,
  ) => {
    if (values.condicion_laboral === null) return;

    if (!values.condicion_laboral) {
      saveDraft({
        workCondition: 'not-works',
      });

      return;
    }

    saveDraft({
      workCondition: 'works',
      cargo: values.cargo,
      empresa: values.empresa,
      area: values.area,
      modalidad: values.modalidad?.toLowerCase() as SurveyDraft['modalidad'],
      salario_mensual: values.salario_mensual,
      tiempo_insercion: values.tiempo_insercion,
    });
  };

  /**
   * Cambio de condición laboral.
   *
   * HU-006 CA-10:
   * useSurveyForm purga los campos laborales cuando se cambia a
   * «No trabaja».
   */
  const handleChange = (value: WorkCondition) => {
    setShowDiscardNotice(
      form.values.condicion_laboral === true &&
        value === 'not-works',
    );

    setShowErrors(false);

    form.setWorkCondition(value === 'works');

    const works = value === 'works';

    if (!isEditing) {
      persistDraft(
        form.values.condicion_laboral === works
          ? form.values
          : {
              condicion_laboral: works,
              cargo: '',
              empresa: '',
              area: '',
              modalidad: '',
              salario_mensual: '',
              tiempo_insercion: '',
            },
      );
    }

    if (submission.status !== 'success') {
      submission.resetFeedback();
    }

    if (edit.status !== 'idle') {
      edit.resetFeedback();
    }

    setError(undefined);
  };

  const handleWorkFieldChange = (
    field: keyof SurveyWorkFields,
    value: string,
  ) => {
    form.setWorkField(field, value);

    if (
      !isEditing &&
      form.values.condicion_laboral === true
    ) {
      persistDraft({
        ...form.values,
        [field]: value,
      });
    }

    if (submission.status !== 'success') {
      submission.resetFeedback();
    }

    if (edit.status !== 'idle') {
      edit.resetFeedback();
    }

    setError(undefined);
  };

  /**
   * Flujo normal de envío inicial.
   */
  const handleNext = () => {
    if (
      submissionCheck !== 'available' ||
      submission.status === 'success'
    ) {
      return;
    }

    if (!form.canProceed) {
      setError('Seleccione su condición laboral actual');
      return;
    }

    if (hasWorkErrors) {
      setShowErrors(true);
      return;
    }

    persistDraft();

    setIsReviewOpen(true);
  };

  const handleConfirm = async () => {
    if (
      submissionCheck !== 'available' ||
      form.values.condicion_laboral === null ||
      hasWorkErrors
    ) {
      return;
    }

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
      setSubmissionCheck('submitted');

      // El borrador deja de ser necesario después del envío.
      clearDraft();
    }
  };

  const handleCloseReview = () => {
    if (submission.isSubmitting) return;

    setIsReviewOpen(false);

    if (submission.status === 'error') {
      submission.resetFeedback();
    }
  };

  /**
   * Restaura exactamente las respuestas registradas.
   * Se usa tanto al iniciar como al cancelar una edición.
   */
  const restoreRecordedResponse = () => {
    if (!recordedResponse) return;

    form.replaceValues({
      condicion_laboral: recordedResponse.condicion_laboral,
      cargo: recordedResponse.cargo ?? '',
      empresa: recordedResponse.empresa ?? '',
      area: recordedResponse.area ?? '',
      modalidad: recordedResponse.modalidad ?? '',
      salario_mensual: recordedResponse.salario_mensual ?? '',
      tiempo_insercion: recordedResponse.tiempo_insercion ?? '',
    });
  };

  /**
   * HU-006 CA-01 / CA-02.
   */
  const handleStartEdit = () => {
    if (
      !recordedResponse ||
      editUsedLocally
    ) {
      return;
    }

    restoreRecordedResponse();

    setShowErrors(false);
    setShowDiscardNotice(false);
    setError(undefined);

    edit.resetFeedback();

    setIsEditing(true);
  };

  /**
   * HU-006 CA-08:
   * Cancelar no consume la edición y restaura los datos originales.
   */
  const handleCancelEdit = () => {
    restoreRecordedResponse();

    setShowErrors(false);
    setShowDiscardNotice(false);
    setError(undefined);

    edit.resetFeedback();

    setIsEditing(false);
  };

  /**
   * HU-006 CA-04 / CA-05 / CA-06 / CA-07 / CA-10.
   */
  const handleSaveEdit = async () => {
    if (form.values.condicion_laboral === null) {
      setError('Seleccione su condición laboral actual');
      return;
    }

    if (hasWorkErrors) {
      setShowErrors(true);
      return;
    }

    const saved = await edit.saveChanges({
      condicion_laboral: form.values.condicion_laboral,
      cargo: form.values.cargo,
      empresa: form.values.empresa,
      area: form.values.area,
      modalidad: form.values.modalidad ?? undefined,
      salario_mensual: form.values.salario_mensual,
      tiempo_insercion: form.values.tiempo_insercion,
    });

    if (!saved) return;

    /**
     * Actualiza inmediatamente el resumen local después del PATCH.
     *
     * Si cambia a No trabaja, no se conservan campos laborales.
     */
    setRecordedResponse({
      condicion_laboral: form.values.condicion_laboral,

      cargo: form.values.condicion_laboral
        ? form.values.cargo
        : null,

      empresa: form.values.condicion_laboral
        ? form.values.empresa
        : null,

      area: form.values.condicion_laboral
        ? form.values.area
        : null,

      modalidad: form.values.condicion_laboral
        ? form.values.modalidad
        : null,

      salario_mensual: form.values.condicion_laboral
        ? form.values.salario_mensual
        : null,

      tiempo_insercion: form.values.condicion_laboral
        ? form.values.tiempo_insercion
        : null,
    });

    setShowErrors(false);
    setShowDiscardNotice(false);

    /**
     * CA-07:
     * una vez guardados los cambios, desaparece el botón de edición.
     *
     * El backend seguirá siendo la autoridad definitiva mediante
     * edicion_usada.
     */
    setEditUsedLocally(true);

    setIsEditing(false);
  };

  /**
   * Datos mostrados tanto en la revisión previa al envío como en el
   * resumen de la encuesta persistida.
   */
  const reviewAnswers = useMemo<SurveyReviewAnswer[]>(() => {
    const answers: SurveyReviewAnswer[] = [
      {
        id: 'condicion-laboral',
        question: 'Condición laboral',
        answer: form.values.condicion_laboral
          ? 'Trabaja'
          : 'No trabaja',
        fullWidth: true,
      },
    ];

    if (!form.values.condicion_laboral) {
      return answers;
    }

    return answers.concat([
      {
        id: 'cargo',
        question: 'Cargo',
        answer: form.values.cargo,
      },
      {
        id: 'empresa',
        question: 'Empresa',
        answer: form.values.empresa,
      },
      {
        id: 'area',
        question: 'Área o departamento',
        answer: form.values.area,
      },
      {
        id: 'modalidad',
        question: 'Modalidad',
        answer: form.values.modalidad,
      },
      {
        id: 'salario',
        question: 'Salario mensual',
        answer: form.values.salario_mensual,
      },
      {
        id: 'insercion',
        question: 'Inserción laboral',
        answer: form.values.tiempo_insercion
          ? `${form.values.tiempo_insercion} meses`
          : '',
      },
    ]);
  }, [form.values]);

  const fieldErrors: Record<
    keyof SurveyWorkFields,
    string | undefined
  > = {
    cargo:
      form.values.condicion_laboral &&
      !form.values.cargo.trim()
        ? 'Este campo es obligatorio'
        : form.values.condicion_laboral &&
            !isMeaningfulText(form.values.cargo)
          ? 'Ingresa un cargo válido'
          : undefined,

    empresa:
      form.values.condicion_laboral &&
      !form.values.empresa.trim()
        ? 'Este campo es obligatorio'
        : form.values.condicion_laboral &&
            !isMeaningfulText(form.values.empresa)
          ? 'Ingresa una empresa válida'
          : undefined,

    area:
      form.values.condicion_laboral &&
      !form.values.area.trim()
        ? 'Este campo es obligatorio'
        : form.values.condicion_laboral &&
            !isMeaningfulText(form.values.area)
          ? 'Ingresa un área válida'
          : undefined,

    modalidad:
      form.values.condicion_laboral &&
      !form.values.modalidad
        ? 'Este campo es obligatorio'
        : undefined,

    salario_mensual:
      form.values.condicion_laboral &&
      !form.values.salario_mensual
        ? 'Este campo es obligatorio'
        : undefined,

    tiempo_insercion:
      form.values.condicion_laboral &&
      !form.values.tiempo_insercion
        ? 'Este campo es obligatorio'
        : undefined,
  };

  const hasWorkErrors =
    form.values.condicion_laboral === true &&
    Object.values(fieldErrors).some(Boolean);

  const visibleErrors: Record<
    keyof SurveyWorkFields,
    string | undefined
  > = showErrors
    ? fieldErrors
    : {
        cargo: undefined,
        empresa: undefined,
        area: undefined,
        modalidad: undefined,
        salario_mensual: undefined,
        tiempo_insercion: undefined,
      };

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
      <nav className="text-xs text-abyssal-blue/70">
        Inicio / Encuesta de empleabilidad / Situación laboral
      </nav>

      <h1 className="mt-4 font-display text-3xl font-semibold text-abyssal-blue">
        Encuesta de empleabilidad
      </h1>

      <p className="mt-2 text-sm text-abyssal-blue/70">
        Ayúdanos a conocer tu trayectoria profesional. Solo te
        preguntaremos lo que corresponda a tu situación.
      </p>

      {/* Éxito del envío inicial */}
      {submission.status === 'success' &&
  !isReviewOpen && (
          <p
            ref={successNoticeRef}
            tabIndex={-1}
            role="status"
            className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800"
          >
            {submission.message}
          </p>
        )}

      {/* Resumen inmediatamente después del envío inicial */}
      {submission.status === 'success' &&
  !isReviewOpen && (
          <section
            className="mt-6 rounded-xl border border-green-200 bg-white p-4 shadow-sm sm:p-6"
            aria-labelledby="survey-success-summary-title"
          >
            <div className="flex flex-col gap-4 border-b border-oatmeal pb-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2
                  id="survey-success-summary-title"
                  className="text-xl font-semibold text-abyssal-blue"
                >
                  Resumen de tu encuesta
                </h2>

                <p className="mt-1 text-sm text-abyssal-blue/70">
                  Estas son las respuestas que quedaron registradas.
                </p>
              </div>
            </div>

            <dl className="mt-5 grid gap-3 sm:grid-cols-2">
              {reviewAnswers.map((item) => (
                <div
                  key={`success-${item.id}`}
                  className="rounded-lg border border-oatmeal bg-palladian/50 p-4"
                >
                  <dt className="text-xs font-semibold uppercase tracking-wide text-abyssal-blue/70">
                    {item.question}
                  </dt>

                  <dd className="mt-1 break-words text-sm font-semibold text-abyssal-blue">
                    {item.answer === null ||
                    item.answer === undefined ||
                    item.answer === ''
                      ? 'Sin respuesta'
                      : String(item.answer)}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        )}

      {/* Consulta de estado */}
      {submissionCheck === 'checking' && (
        <p
          role="status"
          className="mt-6 rounded-lg border border-abyssal-blue/30 bg-palladian p-4 text-abyssal-blue"
        >
          Verificando si ya enviaste esta encuesta...
        </p>
      )}

      {submissionCheck === 'error' && (
        <div
          role="alert"
          className="mt-6 rounded-lg border border-red-300 bg-red-50 p-4 text-red-800"
        >
          <p>
            No se pudo verificar si la encuesta ya fue enviada. Por
            seguridad, el formulario está bloqueado.
          </p>

          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              setStatusCheckAttempt((attempt) => attempt + 1)
            }
          >
            Reintentar verificación
          </Button>
        </div>
      )}

      {/* Estado de encuesta previamente enviada */}
      {submissionCheck === 'submitted' && (
        <div
          role="status"
          className="mt-6 flex flex-col gap-4 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800 sm:flex-row sm:items-center sm:justify-between"
        >
          <p>
            {isEditing
              ? 'Está editando las respuestas de su encuesta.'
              : 'Esta encuesta ya fue enviada.'}
          </p>

          {!isEditing && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push('/portal')}
            >
              Volver al inicio
            </Button>
          )}
        </div>
      )}

      {/* HU-006 CA-05 */}
      {edit.status === 'success' && !isEditing && (
        <p
          role="status"
          className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800"
        >
          Cambios guardados correctamente.
        </p>
      )}

      {/* Resumen de encuesta ya enviada */}
      {submissionCheck === 'submitted' &&
        recordedResponse &&
        !isEditing && (
          <section
            className="mt-6 rounded-xl border border-green-200 bg-white p-4 shadow-sm sm:p-6"
            aria-labelledby="survey-recorded-summary-title"
          >
            <div className="flex flex-col gap-4 border-b border-oatmeal pb-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2
                  id="survey-recorded-summary-title"
                  className="text-xl font-semibold text-abyssal-blue"
                >
                  Resumen de tu encuesta
                </h2>

                <p className="mt-1 text-sm text-abyssal-blue/70">
                  Estas son las respuestas que quedaron registradas.
                </p>
              </div>

              {!editUsedLocally && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleStartEdit}
                >
                  Editar respuestas
                </Button>
              )}
            </div>

            <dl className="mt-5 grid gap-3 sm:grid-cols-2">
              {reviewAnswers.map((item) => (
                <div
                  key={`recorded-${item.id}`}
                  className="rounded-lg border border-oatmeal bg-palladian/50 p-4"
                >
                  <dt className="text-xs font-semibold uppercase tracking-wide text-abyssal-blue/70">
                    {item.question}
                  </dt>

                  <dd className="mt-1 break-words text-sm font-semibold text-abyssal-blue">
                    {item.answer === null ||
                    item.answer === undefined ||
                    item.answer === ''
                      ? 'Sin respuesta'
                      : String(item.answer)}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        )}

      {/* Formulario inicial o formulario en modo edición */}
      {(submissionCheck === 'available' || isEditing) && (
        <>
          {!isEditing && (
            <ol className="mt-6 flex items-center gap-3 text-sm">
              <li className="flex items-center gap-2 font-semibold text-abyssal-blue">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-abyssal-blue text-xs text-white">
                  1
                </span>
                Situación laboral
              </li>

              <li
                className="h-px flex-1 bg-oatmeal"
                aria-hidden="true"
              />

              <li className="flex items-center gap-2 text-abyssal-blue/70">
                <span className="flex h-6 w-6 items-center justify-center rounded-full border border-oatmeal bg-white text-xs">
                  2
                </span>
                Revisión y envío
              </li>
            </ol>
          )}

          {/* HU-006 CA-03 */}
          {isEditing && (
            <div
              role="status"
              className="mt-6 rounded-lg border border-truffle-trouble/40 bg-truffle-trouble/10 p-4"
            >
              <p className="font-semibold text-truffle-trouble">
                Solo puede editar esta encuesta una vez
              </p>

              <p className="mt-1 text-sm text-abyssal-blue/80">
                Revise cuidadosamente sus respuestas antes de guardar
                los cambios.
              </p>
            </div>
          )}

          {/* Errores del PATCH */}
          {isEditing && edit.status === 'error' && (
            <div
              role="alert"
              className="mt-4 rounded-lg border border-red-300 bg-red-50 p-4 text-red-800"
            >
              {edit.errorKind === 'already-edited' && (
                <p>
                  Esta encuesta ya fue editada. Actualice la página para
                  ver las respuestas registradas.
                </p>
              )}

              {edit.errorKind === 'expired' && (
                <p>
                  La encuesta ya no está vigente y no puede ser editada.
                </p>
              )}

              {edit.errorKind === 'connection' && (
                <p>
                  No se pudo guardar los cambios. Verifique su conexión e
                  intente nuevamente.
                </p>
              )}

              {edit.errorKind === 'http' && (
                <p>
                  No se pudo guardar los cambios. Intente nuevamente.
                </p>
              )}
            </div>
          )}

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
                  Cuando selecciones Trabaja aparecerán inmediatamente
                  las preguntas correspondientes.
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
                    modalidad:
                      form.values.modalidad as WorkModality | null,
                  }}
                  errors={visibleErrors}
                  touched={{
                    cargo: true,
                    empresa: true,
                    area: true,
                    modalidad: true,
                  }}
                  onChange={(field, value) =>
                    handleWorkFieldChange(field, String(value))
                  }
                  onBlur={() => undefined}
                />

                <div className="space-y-5">
                  <SurveySalarySelector
                    value={form.values.salario_mensual}
                    onChange={(value) =>
                      handleWorkFieldChange(
                        'salario_mensual',
                        value,
                      )
                    }
                    error={visibleErrors.salario_mensual}
                  />

                  <SurveyInsertionTimeInput
                    value={form.values.tiempo_insercion}
                    onChange={(value) =>
                      handleWorkFieldChange(
                        'tiempo_insercion',
                        value,
                      )
                    }
                    error={visibleErrors.tiempo_insercion}
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
                  Al seleccionar No trabaja se ocultan los campos
                  laborales y puedes continuar sin llenarlos.
                </p>
              </div>
            )}

            {workCondition === 'not-works' &&
              showDiscardNotice && (
                <div
                  role="alert"
                  className="mt-4 flex gap-3 rounded-lg border border-truffle-trouble/40 bg-truffle-trouble/10 p-4 text-sm"
                >
                  <span
                    aria-hidden="true"
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-truffle-trouble text-xs font-bold text-white"
                  >
                    !
                  </span>

                  <div>
                    <p className="font-semibold text-truffle-trouble">
                      Las respuestas anteriores se descartaron
                    </p>

                    <p className="text-abyssal-blue/80">
                      No se enviarán datos de cargo, empresa, salario o
                      inserción que ahora están ocultos
                    </p>
                  </div>
                </div>
              )}

            {/* Los borradores solo corresponden al envío inicial */}
            {!isEditing && (
              <div className="mt-4 empty:hidden">
                <SurveyDraftNotice status={status} />
              </div>
            )}
          </section>

          <p className="mt-4 text-xs text-abyssal-blue/70">
            * Campos obligatorios únicamente si están visibles
          </p>

          {/* Acciones */}
          <div className="mt-4 flex flex-row gap-3 sm:justify-end">
            {isEditing ? (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  className="min-w-0 flex-1 sm:flex-none"
                  onClick={handleCancelEdit}
                  disabled={edit.isSaving}
                >
                  Cancelar
                </Button>

                <Button
                  type="button"
                  variant="primary"
                  className="min-w-0 flex-1 sm:flex-none"
                  onClick={handleSaveEdit}
                  disabled={edit.isSaving}
                >
                  {edit.isSaving
                    ? 'Guardando…'
                    : 'Guardar cambios'}
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  className="min-w-0 flex-1 sm:flex-none"
                  onClick={() => router.back()}
                >
                  Volver
                </Button>

                <Button
                  type="button"
                  variant="primary"
                  className="min-w-0 flex-1 sm:flex-none"
                  onClick={handleNext}
                  disabled={submission.status === 'success'}
                >
                  Siguiente →
                </Button>
              </>
            )}
          </div>
        </>
      )}

      <SurveyReviewModal
        isOpen={
          isReviewOpen &&
          !submission.isSubmitting &&
          submission.status === 'idle'
        }
        answers={reviewAnswers}
        showNoWorkWarning={
          form.values.condicion_laboral === false
        }
        isSubmitting={false}
        onClose={handleCloseReview}
        onConfirm={handleConfirm}
      />

      <SurveySubmissionStatusModal
        isOpen={
          isReviewOpen &&
          (submission.isSubmitting ||
            submission.status !== 'idle')
        }
        status={
          submission.isSubmitting
            ? 'sending'
            : submission.status === 'success'
              ? 'success'
              : 'error'
        }
        isConnectionError={
          submission.errorKind === 'connection'
        }
        onClose={handleCloseReview}
        onRetry={handleConfirm}
      />
    </main>
  );
}