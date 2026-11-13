'use client';

import React, { useState } from 'react';
import {
  AccreditationExportError,
  EXPORT_MESSAGES,
  requestAccreditationExport,
  saveExportFile,
  type AccreditationExportFilters,
  type AccreditationExportFormat,
} from '../services/accreditation-export.service';

interface AccreditationExportButtonsProps {
  /** Filtros aplicados en el tablero; el archivo trae solo esos datos (CA-04). */
  filters: AccreditationExportFilters;
  /** false cuando el periodo no tiene respuestas: no se pide ni se descarga nada (CA-08). */
  hasData: boolean;
  apiBaseUrl?: string;
}

type Feedback = { kind: 'info' | 'error'; text: string } | null;

const buttonClassName =
  'inline-flex h-11 w-full items-center justify-center rounded-md px-4 text-sm font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FFB162] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto';

/**
 * Botones «Exportar PDF» y «Exportar Excel» del tablero de acreditación (HU-004).
 * CA-01, CA-05, CA-08 y CA-10; mensaje de falla cubierto con prueba automatizada.
 */
export function AccreditationExportButtons({
  filters,
  hasData,
  apiBaseUrl,
}: AccreditationExportButtonsProps) {
  const [generating, setGenerating] = useState<AccreditationExportFormat | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);

  async function handleExport(format: AccreditationExportFormat) {
    setFeedback(null);
    if (!hasData) {
      setFeedback({ kind: 'info', text: EXPORT_MESSAGES.noData });
      return;
    }
    setGenerating(format);
    try {
      const file = await requestAccreditationExport(format, filters, apiBaseUrl);
      saveExportFile(file);
    } catch (error) {
      const reason = error instanceof AccreditationExportError ? error.reason : 'failure';
      setFeedback({
        kind: reason === 'noData' ? 'info' : 'error',
        text: EXPORT_MESSAGES[reason],
      });
    } finally {
      setGenerating(null);
    }
  }

  const busy = generating !== null;

  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
        <button
          type="button"
          onClick={() => handleExport('pdf')}
          disabled={busy}
          aria-busy={generating === 'pdf'}
          className={`${buttonClassName} bg-[#1B2632] text-white hover:bg-[#2C3B4D]`}
        >
          {generating === 'pdf' ? EXPORT_MESSAGES.generating : EXPORT_MESSAGES.exportPdf}
        </button>
        <button
          type="button"
          onClick={() => handleExport('xlsx')}
          disabled={busy}
          aria-busy={generating === 'xlsx'}
          className={`${buttonClassName} border border-[#C9C1B1] bg-white text-[#1B2632] hover:bg-[#F7F3EC]`}
        >
          {generating === 'xlsx' ? EXPORT_MESSAGES.generating : EXPORT_MESSAGES.exportXlsx}
        </button>
      </div>

      {feedback && (
        <p
          role={feedback.kind === 'error' ? 'alert' : 'status'}
          className={`w-full text-sm sm:text-right ${
            feedback.kind === 'error' ? 'text-[#B42318]' : 'text-[#5B6470]'
          }`}
        >
          {feedback.text}
        </p>
      )}
    </div>
  );
}