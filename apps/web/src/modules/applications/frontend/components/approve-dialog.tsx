"use client";

import { useReview } from "../hooks/use-review";
import { maskEmail } from "@/shared/utils/mask-email";
import { btnAccent, btnSecondary, InfoBox, FieldError, ModalShell } from "./review-ui";

type Props = {
  open: boolean;
  applicationId: string;
  expedienteCode: string;
  applicantName: string;
  applicantEmail?: string;
  currentReviewer?: { name: string | null; email: string } | null;
  onClose: () => void;
  onSuccess?: () => void;
};

export function ApproveDialog({
  open,
  applicationId,
  expedienteCode,
  applicantName,
  applicantEmail,
  currentReviewer,
  onClose,
  onSuccess,
}: Props) {
  const { submitReview, isLoading, error } = useReview({
    applicationId,
    onSuccess,
  });

  if (!open) return null;

  async function handleConfirm() {
    const ok = await submitReview({ decision: "APROBADA" });
    if (ok) onClose();
  }

  return (
    <ModalShell
      titleId="approve-title"
      title="Aprobar Expediente"
      subtitle={`ID: #${expedienteCode}`}
      onClose={onClose}
    >
      <InfoBox>
        Expediente: <strong>#{expedienteCode}</strong> • {applicantName}. Al
        aprobar, se generará el código de activación (válido por 24 horas) y se
        notificará al titulado por correo.
      </InfoBox>

      <dl className="space-y-2 rounded-lg border border-oatmeal bg-palladian/40 p-3 text-sm text-abyssal-blue">
        <div>
          <dt className="font-semibold">Correo del postulante:</dt>
          <dd>{applicantEmail ? maskEmail(applicantEmail) : 'No disponible'}</dd>
        </div>
        <div>
          <dt className="font-semibold">Dictamen registrado por:</dt>
          <dd>{currentReviewer?.name || currentReviewer?.email || 'No disponible'}</dd>
        </div>
      </dl>

      {error && <FieldError>{error}</FieldError>}

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onClose}
          disabled={isLoading}
          className={btnSecondary}
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isLoading}
          className={btnAccent}
        >
          {isLoading ? "Aprobando..." : "Confirmar Aprobación"}
        </button>
      </div>
    </ModalShell>
  );
}
