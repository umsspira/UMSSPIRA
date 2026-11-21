"use client";

import { useEffect, useState } from "react";
import type { OcrAnalysis } from "@umsspira/shared-types";
import { maskEmail } from "@/shared/utils/mask-email";
import {
  MAX_NOTE_LENGTH,
  MIN_NOTE_LENGTH,
  OBSERVATION_CATEGORIES,
  REJECTION_CAUSES,
  useReview,
  type ReviewDecision,
  type ReviewPayload,
} from "../hooks/use-review";
import { ocrRequest } from "../services/ocr-api";
import { retryMailEvent, type ReviewNotification } from "../services/applications-board.service";
import { ReasonsSelector } from "./reasons-selector";
import { ReviewPreviewDialog } from "./review-preview-dialog";
import { btnAccent, btnSecondary, FieldError, FieldHint, FieldLabel, fieldClass } from "./review-ui";

export type ReviewDraft = {
  decision: ReviewDecision | null;
  reasons: string[];
  cause: string;
  note: string;
};

export const emptyDraft: ReviewDraft = { decision: null, reasons: [], cause: "", note: "" };

type DraftErrors = Partial<Record<"decision" | "reasons" | "cause" | "note", string>>;

const suggestionLabels: Record<string, string> = {
  APROBAR: "Aprobar",
  OBSERVAR: "Observar",
  RECHAZAR: "Rechazar",
  REVISION_MANUAL: "Revisión manual obligatoria",
};

const notificationLabels: Record<ReviewNotification["status"], string> = {
  pendiente: "Notificación pendiente de envío. La decisión ya está guardada.",
  enviada: "Correo enviado al Titulado.",
  fallida: "El correo no se pudo enviar. La decisión se conserva.",
};

export function validateDraft(draft: ReviewDraft, hasDifference: boolean, canObserve: boolean): DraftErrors {
  const errors: DraftErrors = {};
  const noteLength = draft.note.trim().length;
  if (!draft.decision) {
    errors.decision = "Elige aprobar, observar o rechazar.";
    return errors;
  }
  if (draft.decision === "APROBADA" && hasDifference && noteLength === 0) {
    errors.note = "Aprobar con una posible diferencia exige una nota interna.";
  }
  if (draft.decision === "OBSERVADA") {
    if (!canObserve) errors.decision = "Este expediente ya no admite más observaciones.";
    if (draft.reasons.length === 0) errors.reasons = "Selecciona al menos un motivo de observación.";
    if (noteLength < MIN_NOTE_LENGTH) {
      errors.note = `La explicación debe tener al menos ${MIN_NOTE_LENGTH} caracteres.`;
    }
  }
  if (draft.decision === "RECHAZADA") {
    if (!draft.cause) errors.cause = "Selecciona la causal de rechazo.";
    if (noteLength < MIN_NOTE_LENGTH) {
      errors.note = `La justificación debe tener al menos ${MIN_NOTE_LENGTH} caracteres.`;
    }
  }
  return errors;
}

export function buildPayload(draft: ReviewDraft, expectedVersion?: number): ReviewPayload {
  const note = draft.note.trim();
  const decision = draft.decision as ReviewDecision;
  if (decision === "OBSERVADA") return { decision, motivos: draft.reasons, note, expectedVersion };
  if (decision === "RECHAZADA") return { decision, category: draft.cause, note, expectedVersion };
  return { decision, ...(note ? { note } : {}), expectedVersion };
}

type Props = {
  applicationId: string;
  expedienteCode: string;
  applicantName: string;
  applicantEmail?: string;
  version?: number;
  canReview: boolean;
  canObserve: boolean;
  notification?: ReviewNotification | null;
  onReviewed: () => void | Promise<void>;
  onRefresh: () => Promise<void>;
};

export function ReviewControls({
  applicationId,
  expedienteCode,
  applicantName,
  applicantEmail,
  version,
  canReview,
  canObserve,
  notification,
  onReviewed,
  onRefresh,
}: Props) {
  const [draft, setDraft] = useState<ReviewDraft>(emptyDraft);
  const [attempted, setAttempted] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [analysis, setAnalysis] = useState<{ suggestion: string; hasDifference: boolean } | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [retryMessage, setRetryMessage] = useState<string | null>(null);
  const { submitReview, isLoading, error, stale, clearError } = useReview({
    applicationId,
    onSuccess: onReviewed,
  });

  useEffect(() => {
    if (!canReview) return;
    const controller = new AbortController();
    ocrRequest<OcrAnalysis[]>(`${applicationId}/ocr`, undefined, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        const result = data.find((item) => item.current)?.result;
        setAnalysis(
          result
            ? {
                suggestion: result.suggestion,
                hasDifference: result.findings.some((f) => f.status === "POSIBLE_DIFERENCIA"),
              }
            : null,
        );
      })
      .catch(() => {
        if (!controller.signal.aborted) setAnalysis(null);
      });
    return () => controller.abort();
  }, [applicationId, canReview, version]);

  const hasDifference = analysis?.hasDifference ?? false;
  const suggestionLabel = analysis ? (suggestionLabels[analysis.suggestion] ?? null) : null;
  const errors = attempted ? validateDraft(draft, hasDifference, canObserve) : {};

  function update(patch: Partial<ReviewDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  function handleReview() {
    setAttempted(true);
    if (Object.keys(validateDraft(draft, hasDifference, canObserve)).length > 0) return;
    clearError();
    setPreviewOpen(true);
  }

  async function handleConfirm() {
    const ok = await submitReview(buildPayload(draft, version));
    if (ok) {
      setPreviewOpen(false);
      setDraft(emptyDraft);
      setAttempted(false);
    }
  }

  async function handleRefresh() {
    await onRefresh();
    clearError();
  }

  async function handleRetry() {
    if (!notification) return;
    setRetrying(true);
    setRetryMessage(null);
    const result = await retryMailEvent(notification.eventId);
    setRetrying(false);
    if (!result.ok) setRetryMessage(result.message);
    else await onRefresh();
  }

  if (!canReview && !notification) return null;

  const noteLabel =
    draft.decision === "OBSERVADA"
      ? "Qué debe corregir el Titulado"
      : draft.decision === "RECHAZADA"
        ? "Justificación del rechazo"
        : "Nota interna (no se envía al Titulado)";

  return (
    <section
      aria-label="Dictamen"
      className="space-y-4 rounded-xl border border-oatmeal bg-white p-4 shadow-sm sm:p-6"
    >
      {notification && (
        <div role="status" className="space-y-2 rounded-lg border border-oatmeal bg-palladian/40 p-3 text-sm text-abyssal-blue">
          <p className="font-semibold">{notificationLabels[notification.status]}</p>
          <p className="text-xs">Intentos de envío: {notification.attempts}</p>
          {notification.status === "fallida" && (
            <button type="button" onClick={handleRetry} disabled={retrying} className={btnSecondary}>
              {retrying ? "Reintentando..." : "Reintentar envío"}
            </button>
          )}
          {retryMessage && <FieldError>{retryMessage}</FieldError>}
        </div>
      )}

      {canReview && (
        <>
          <h2 className="text-lg font-semibold text-abyssal-blue">Preparar dictamen</h2>
          <p className="text-xs text-abyssal-blue/70">
            Sugerencia del análisis (solo referencia): {suggestionLabel ?? "Sin análisis vigente"}. La decisión
            la eliges tú.
          </p>
          {hasDifference && (
            <p className="text-xs font-semibold text-truffle-trouble">
              El análisis marcó una posible diferencia: la nota interna es obligatoria.
            </p>
          )}

          <fieldset className="space-y-2">
            <legend className="mb-1.5 text-[13px] font-semibold text-abyssal-blue">Decisión</legend>
            {(
              [
                ["APROBADA", "Aprobar"],
                ["OBSERVADA", "Observar"],
                ["RECHAZADA", "Rechazar"],
              ] as const
            ).map(([value, label]) => (
              <label key={value} className="flex items-center gap-2 text-sm text-abyssal-blue">
                <input
                  type="radio"
                  name="review-decision"
                  checked={draft.decision === value}
                  onChange={() => update({ decision: value })}
                  disabled={value === "OBSERVADA" && !canObserve}
                />
                {label}
              </label>
            ))}
            {errors.decision && <FieldError>{errors.decision}</FieldError>}
          </fieldset>

          {draft.decision === "OBSERVADA" && (
            <ReasonsSelector
              options={OBSERVATION_CATEGORIES}
              selected={draft.reasons}
              onChange={(reasons) => update({ reasons })}
              error={errors.reasons}
            />
          )}

          {draft.decision === "RECHAZADA" && (
            <div>
              <FieldLabel htmlFor="review-cause" required>
                Causal de rechazo
              </FieldLabel>
              <select
                id="review-cause"
                value={draft.cause}
                onChange={(e) => update({ cause: e.target.value })}
                aria-invalid={Boolean(errors.cause)}
                className={fieldClass(Boolean(errors.cause))}
              >
                <option value="">Seleccione la causal...</option>
                {REJECTION_CAUSES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              {errors.cause && <FieldError>{errors.cause}</FieldError>}
            </div>
          )}

          {draft.decision && (
            <div>
              <FieldLabel
                htmlFor="review-note"
                required={draft.decision !== "APROBADA" || hasDifference}
                optional={draft.decision === "APROBADA" && !hasDifference}
              >
                {noteLabel}
              </FieldLabel>
              <textarea
                id="review-note"
                value={draft.note}
                onChange={(e) => update({ note: e.target.value })}
                rows={4}
                maxLength={MAX_NOTE_LENGTH}
                aria-invalid={Boolean(errors.note)}
                className={fieldClass(Boolean(errors.note))}
              />
              {errors.note ? (
                <FieldError>{errors.note}</FieldError>
              ) : (
                <FieldHint>
                  {draft.note.length} / {MAX_NOTE_LENGTH}
                  {draft.decision !== "APROBADA" && ` · mínimo ${MIN_NOTE_LENGTH} caracteres`}
                </FieldHint>
              )}
            </div>
          )}

          <div className="flex justify-end">
            <button type="button" onClick={handleReview} className={btnAccent}>
              Revisar dictamen
            </button>
          </div>
        </>
      )}

      <ReviewPreviewDialog
        open={previewOpen}
        decision={draft.decision}
        expedienteCode={expedienteCode}
        applicantName={applicantName}
        recipient={applicantEmail ? maskEmail(applicantEmail) : "No disponible"}
        reasonLabels={OBSERVATION_CATEGORIES.filter((o) => draft.reasons.includes(o.code)).map((o) => o.label)}
        cause={draft.cause}
        note={draft.note}
        suggestionLabel={suggestionLabel}
        version={version}
        isLoading={isLoading}
        error={error}
        stale={stale}
        onBack={() => setPreviewOpen(false)}
        onCancel={() => setPreviewOpen(false)}
        onConfirm={handleConfirm}
        onRefresh={handleRefresh}
      />
    </section>
  );
}