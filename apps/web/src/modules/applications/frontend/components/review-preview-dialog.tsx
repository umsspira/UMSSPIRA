"use client";

import { useEffect, useState } from "react";
import type { ReviewDecision } from "../hooks/use-review";
import {
  btnAccent,
  btnSecondary,
  CheckboxRow,
  FieldError,
  InfoBox,
  ModalShell,
} from "./review-ui";

const decisionLabels: Record<ReviewDecision, string> = {
  APROBADA: "Aprobar",
  OBSERVADA: "Observar",
  RECHAZADA: "Rechazar",
};

type Props = {
  open: boolean;
  decision: ReviewDecision | null;
  expedienteCode: string;
  applicantName: string;
  recipient: string;
  reasonLabels: string[];
  cause: string;
  note: string;
  suggestionLabel: string | null;
  version?: number;
  isLoading: boolean;
  error: string | null;
  stale: boolean;
  onBack: () => void;
  onCancel: () => void;
  onConfirm: () => void;
  onRefresh: () => void;
};

export function ReviewPreviewDialog({
  open,
  decision,
  expedienteCode,
  applicantName,
  recipient,
  reasonLabels,
  cause,
  note,
  suggestionLabel,
  version,
  isLoading,
  error,
  stale,
  onBack,
  onCancel,
  onConfirm,
  onRefresh,
}: Props) {
  const [accepted, setAccepted] = useState(false);

  // La declaración entra sin marcar cada vez que se abre y cuando cambia la versión (CA-14.5).
  useEffect(() => {
    if (open) setAccepted(false);
  }, [open, version]);

  if (!open || !decision) return null;

  return (
    <ModalShell
      titleId="review-preview-title"
      title="Vista previa del dictamen"
      subtitle={`ID: #${expedienteCode}`}
      badge="Aún no se guardó ni se envió"
      onClose={onCancel}
    >
      <InfoBox>
        Expediente <strong>#{expedienteCode}</strong> • {applicantName}
      </InfoBox>

      <dl className="space-y-2 rounded-lg border border-oatmeal bg-palladian/40 p-3 text-sm text-abyssal-blue">
        <div>
          <dt className="font-semibold">Decisión elegida:</dt>
          <dd>{decisionLabels[decision]}</dd>
        </div>
        <div>
          <dt className="font-semibold">Destinatario:</dt>
          <dd>{recipient}</dd>
        </div>
        <div>
          <dt className="font-semibold">Sugerencia del análisis (solo referencia):</dt>
          <dd>{suggestionLabel ?? "Sin análisis vigente"}</dd>
        </div>
      </dl>

      <section
        aria-label="Mensaje al Titulado"
        className="space-y-2 rounded-lg border border-oatmeal p-3 text-sm text-abyssal-blue"
      >
        <h3 className="font-semibold">Mensaje que recibirá el Titulado</h3>
        {decision === "APROBADA" && (
          <p>
            Tu solicitud fue aprobada. Recibirás un código de activación válido por 24 horas.
          </p>
        )}
        {decision === "OBSERVADA" && (
          <>
            <p>Tu solicitud tiene observaciones que debes corregir:</p>
            <ul className="list-disc pl-5">
              {reasonLabels.map((label) => (
                <li key={label}>{label}</li>
              ))}
            </ul>
            <p className="break-words">{note.trim()}</p>
            <p>Incluye un enlace seguro para entregar la corrección.</p>
          </>
        )}
        {decision === "RECHAZADA" && (
          <>
            <p>
              Tu solicitud fue rechazada. Causal: <strong>{cause}</strong>
            </p>
            <p className="break-words">{note.trim()}</p>
          </>
        )}
        <p className="text-[11px] text-blue-fantastic">
          Es un resumen de los datos del correo; el sistema arma el texto final al enviarlo.
        </p>
      </section>

      {decision === "APROBADA" && note.trim() && (
        <section
          aria-label="Nota interna"
          className="rounded-lg border border-oatmeal bg-palladian/40 p-3 text-sm text-abyssal-blue"
        >
          <h3 className="font-semibold">Nota interna (no se envía al Titulado)</h3>
          <p className="break-words">{note.trim()}</p>
        </section>
      )}

      <CheckboxRow
        id="review-declaration"
        checked={accepted}
        onChange={setAccepted}
        disabled={isLoading || stale}
      >
        Declaro que revisé el respaldo y los hallazgos, y confirmo este dictamen.
      </CheckboxRow>

      {error && <FieldError>{error}</FieldError>}
      {stale && (
        <button type="button" onClick={onRefresh} className={btnSecondary}>
          Actualizar expediente
        </button>
      )}

      <div className="flex flex-wrap justify-end gap-3 pt-2">
        <button type="button" onClick={onBack} disabled={isLoading} className={btnSecondary}>
          Volver a editar
        </button>
        <button type="button" onClick={onCancel} disabled={isLoading} className={btnSecondary}>
          Cancelar
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={!accepted || isLoading || stale}
          className={btnAccent}
        >
          {isLoading ? "Confirmando..." : "Confirmar dictamen y notificar"}
        </button>
      </div>
    </ModalShell>
  );
}