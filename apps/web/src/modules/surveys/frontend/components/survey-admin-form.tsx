'use client';

import { useState, type FormEvent } from 'react';
import type { SurveyFormValues } from '../types/survey-admin.types';

const REQUIRED = 'Este campo es obligatorio';
const END_BEFORE_START = 'La fecha de fin no puede ser anterior a la de inicio';

type Errors = Partial<Record<keyof SurveyFormValues, string>>;

/** CA-03 y CA-04. Las fechas YYYY-MM-DD se pueden comparar como texto. */
export function validateSurveyForm(values: SurveyFormValues): Errors {
  const errors: Errors = {};
  if (!values.title.trim()) errors.title = REQUIRED;
  if (!values.startDate) errors.startDate = REQUIRED;
  if (!values.endDate) errors.endDate = REQUIRED;
  else if (values.startDate && values.endDate < values.startDate) errors.endDate = END_BEFORE_START;
  return errors;
}

interface Props {
  heading: string;
  initial?: SurveyFormValues;
  submitting: boolean;
  serverError: string | null;
  onSubmit: (values: SurveyFormValues) => void;
  onCancel: () => void;
}

const inputClass =
  'mt-1 w-full min-w-0 rounded-md border border-oatmeal bg-white px-3 py-2 text-sm text-abyssal-blue';

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1 text-xs text-red-700">
      {message}
    </p>
  );
}

export function SurveyAdminForm({ heading, initial, submitting, serverError, onSubmit, onCancel }: Props) {
  const [values, setValues] = useState<SurveyFormValues>(
    initial ?? { title: '', startDate: '', endDate: '' },
  );
  const [errors, setErrors] = useState<Errors>({});

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const found = validateSurveyForm(values);
    setErrors(found);
    if (Object.keys(found).length === 0) onSubmit(values);
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      className="mt-4 min-w-0 rounded-lg border border-oatmeal bg-palladian p-4 sm:p-5"
    >
      <h3 className="font-semibold text-abyssal-blue">{heading}</h3>
      <p className="mt-1 text-sm text-abyssal-blue/70">La encuesta se guarda en estado «Borrador»</p>

      {serverError && (
        <p role="alert" className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {serverError}
        </p>
      )}

      <div className="mt-4">
        <label htmlFor="survey-title" className="text-sm font-semibold text-abyssal-blue">
          Título *
        </label>
        <input
          id="survey-title"
          type="text"
          value={values.title}
          placeholder="Ej.: Encuesta de empleabilidad 2027"
          aria-invalid={Boolean(errors.title)}
          aria-describedby={errors.title ? 'survey-title-error' : undefined}
          onChange={(e) => setValues({ ...values, title: e.target.value })}
          className={inputClass}
        />
        <FieldError id="survey-title-error" message={errors.title} />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="min-w-0">
          <label htmlFor="survey-start" className="text-sm font-semibold text-abyssal-blue">
            Fecha de inicio *
          </label>
          <input
            id="survey-start"
            type="date"
            value={values.startDate}
            aria-invalid={Boolean(errors.startDate)}
            aria-describedby={errors.startDate ? 'survey-start-error' : undefined}
            onChange={(e) => setValues({ ...values, startDate: e.target.value })}
            className={inputClass}
          />
          <FieldError id="survey-start-error" message={errors.startDate} />
        </div>
        <div className="min-w-0">
          <label htmlFor="survey-end" className="text-sm font-semibold text-abyssal-blue">
            Fecha de fin *
          </label>
          <input
            id="survey-end"
            type="date"
            value={values.endDate}
            aria-invalid={Boolean(errors.endDate)}
            aria-describedby={errors.endDate ? 'survey-end-error' : undefined}
            onChange={(e) => setValues({ ...values, endDate: e.target.value })}
            className={inputClass}
          />
          <FieldError id="survey-end-error" message={errors.endDate} />
        </div>
      </div>

      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="min-h-11 rounded-md border border-abyssal-blue bg-white px-4 py-2 text-sm font-semibold text-abyssal-blue"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="min-h-11 rounded-md bg-abyssal-blue px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {submitting ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </form>
  );
}