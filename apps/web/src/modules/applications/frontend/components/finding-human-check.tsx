'use client';

import { useEffect, useState } from 'react';
import type { OcrFinding } from '@umsspira/shared-types';
import { btnAccent, btnSecondary, FieldError, FieldLabel, fieldClass } from './review-ui';
import { useFindingCheck, STALE_FINDING_MESSAGE } from '../hooks/use-finding-check';
import type { FindingAction, HumanFindingCheck as HumanFindingCheckModel } from '../services/applications-board.service';

export interface FindingHumanCheckProps {
  applicationId: string;
  finding: OcrFinding | null;
  expectedVersion?: number;
  currentAuthor?: string;
  onCheckSaved?: (check: HumanFindingCheckModel) => void;
  onRefreshNeeded?: () => void;
}

const ACTION_LABELS: Record<FindingAction, string> = {
  CONFIRMADO: 'Confirmar lectura / dato',
  CORREGIDO: 'Corregir lectura manualmente',
  NO_VERIFICABLE: 'Marcar como no verificable',
};

export function FindingHumanCheck({
  applicationId,
  finding,
  expectedVersion,
  currentAuthor,
  onCheckSaved,
  onRefreshNeeded,
}: FindingHumanCheckProps) {
  const { saveCheck, getCheckForField, isLoading, isSaving, error, stale, clearError } = useFindingCheck({
    applicationId,
    expectedVersion,
    currentAuthor,
    onSaved: onCheckSaved,
    onRefreshNeeded,
  });

  const [selectedAction, setSelectedAction] = useState<FindingAction | null>(null);
  const [verifiedValue, setVerifiedValue] = useState('');
  const [reason, setReason] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const existingCheck = finding ? getCheckForField(finding.field) : undefined;

  useEffect(() => {
    clearError();
    setLocalError(null);
    if (existingCheck) {
      setSelectedAction(existingCheck.action);
      setVerifiedValue(existingCheck.verifiedValue ?? '');
      setReason(existingCheck.reason ?? '');
    } else {
      setSelectedAction(null);
      setVerifiedValue('');
      setReason('');
    }
  }, [finding?.field, existingCheck, clearError]);

  if (!finding) {
    return (
      <div className="mt-3 rounded-lg border border-dashed border-[#C9C1B1] p-3 text-xs text-[#2C3B4D]">
        <p>Selecciona un hallazgo en la tabla para registrar su comprobación humana.</p>
      </div>
    );
  }

  const handleActionChange = (action: FindingAction) => {
    setSelectedAction(action);
    setLocalError(null);
    clearError();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (stale) {
      setLocalError(STALE_FINDING_MESSAGE);
      return;
    }
    if (!selectedAction) {
      setLocalError('Elige una acción de comprobación (Confirmar, Corregir o No verificable).');
      return;
    }
    if (selectedAction === 'CORREGIDO' && !verifiedValue.trim()) {
      setLocalError('Debes ingresar el valor comprobado manualmente.');
      return;
    }
    if (selectedAction === 'NO_VERIFICABLE' && !reason.trim()) {
      setLocalError('Debes indicar la explicación de por qué no es verificable.');
      return;
    }

    await saveCheck({
      field: finding.field,
      action: selectedAction,
      verifiedValue: verifiedValue.trim(),
      reason: reason.trim(),
    });
  };

  const activeError = !stale ? (localError || error) : null;

  return (
    <section aria-label={`Comprobación humana de ${finding.label}`} className="mt-4 rounded-lg border border-[#C9C1B1] bg-white p-4 text-xs shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-[#EEE9DF] pb-2">
        <div>
          <h4 className="font-bold text-[#1B2632] sm:text-sm">Comprobación humana: {finding.label}</h4>
          <p className="text-[11px] text-[#2C3B4D]">Deja constancia de la validación humana del dato antes de emitir dictamen.</p>
        </div>
        {existingCheck && (
          <span className="inline-flex items-center rounded-full bg-[#EEE9DF] px-2.5 py-0.5 text-[11px] font-semibold text-[#1B2632]" data-testid="saved-check-badge">
            ✓ Comprobado: {existingCheck.action}
          </span>
        )}
      </div>

      {/* Presentación por separado: Formulario Titulado vs Lectura OCR */}
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-[#C9C1B1] bg-[#F7F5F0] p-3">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-[#2C3B4D]">Formulario del Titulado (Declarado)</span>
          <p className="mt-1 break-words font-semibold text-[#1B2632]">{finding.declared || 'Sin dato'}</p>
        </div>
        <div className="rounded-lg border border-[#C9C1B1] bg-[#F7F5F0] p-3">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-[#2C3B4D]">Lectura original OCR (No modificable)</span>
          <p className="mt-1 break-words font-semibold text-[#1B2632]">{finding.read || 'No legible'}</p>
          <span className="mt-1 inline-block text-[10px] text-[#2C3B4D]">Estado automático: {finding.status}</span>
        </div>
      </div>

      {/* Registro previo con autor y fecha */}
      {existingCheck && (
        <div className="mb-4 rounded-lg border border-[#EEE9DF] bg-[#FAF8F5] p-3" data-testid="existing-check-info">
          <p className="text-[11px] font-medium text-[#2C3B4D]">
            Comprobación registrada por <strong className="text-[#1B2632]">{existingCheck.author}</strong> el{' '}
            <time dateTime={existingCheck.checkedAt}>
              {new Date(existingCheck.checkedAt).toLocaleString('es-BO', { timeZone: 'America/La_Paz' })}
            </time>{' '}
            (versión {existingCheck.version})
          </p>
          {existingCheck.action === 'CORREGIDO' && (
            <p className="mt-1 text-[11px] text-[#1B2632]">
              Valor corregido: <strong className="underline">{existingCheck.verifiedValue}</strong>
            </p>
          )}
          {existingCheck.action === 'NO_VERIFICABLE' && (
            <p className="mt-1 text-[11px] text-[#A35139]">
              Motivo no verificable: <em>{existingCheck.reason}</em>
            </p>
          )}
        </div>
      )}

      {/* Alerta de vista desactualizada (CA-14.7) */}
      {stale && (
        <div role="alert" className="mb-3 rounded-lg border border-[#A35139] bg-[#A35139]/10 p-3 text-[#A35139]">
          <p className="font-semibold">{STALE_FINDING_MESSAGE}</p>
          {onRefreshNeeded && (
            <button type="button" onClick={onRefreshNeeded} className={`${btnSecondary} mt-2 text-xs`}>
              Actualizar expediente
            </button>
          )}
        </div>
      )}

      {/* Formulario de comprobación humana */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <fieldset disabled={isSaving || stale}>
          <legend className="mb-1.5 text-[12px] font-bold text-[#1B2632]">Acción de comprobación humana:</legend>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {(['CONFIRMADO', 'CORREGIDO', 'NO_VERIFICABLE'] as FindingAction[]).map((action) => (
              <label
                key={action}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 transition ${
                  selectedAction === action
                    ? 'border-[#1B2632] bg-[#EEE9DF] font-semibold text-[#1B2632]'
                    : 'border-[#C9C1B1] bg-white text-[#2C3B4D] hover:bg-[#FAF8F5]'
                }`}
              >
                <input
                  type="radio"
                  name={`action-${finding.field}`}
                  value={action}
                  checked={selectedAction === action}
                  onChange={() => handleActionChange(action)}
                  className="accent-[#1B2632]"
                />
                <span>{ACTION_LABELS[action]}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {selectedAction === 'CORREGIDO' && (
          <div>
            <FieldLabel htmlFor={`verified-value-${finding.field}`} required>Valor comprobado manualmente</FieldLabel>
            <input
              id={`verified-value-${finding.field}`}
              type="text"
              value={verifiedValue}
              onChange={(e) => { setVerifiedValue(e.target.value); setLocalError(null); }}
              placeholder="Escribe el valor correcto verificado en el documento"
              className={fieldClass(Boolean(activeError && selectedAction === 'CORREGIDO'))}
              disabled={isSaving || stale}
            />
          </div>
        )}

        {selectedAction === 'NO_VERIFICABLE' && (
          <div>
            <FieldLabel htmlFor={`reason-${finding.field}`} required>Explicación de por qué no es verificable</FieldLabel>
            <textarea
              id={`reason-${finding.field}`}
              rows={2}
              value={reason}
              onChange={(e) => { setReason(e.target.value); setLocalError(null); }}
              placeholder="Indica la razón por la que el documento no permite verificar este dato"
              className={fieldClass(Boolean(activeError && selectedAction === 'NO_VERIFICABLE'))}
              disabled={isSaving || stale}
            />
          </div>
        )}

        {activeError && <FieldError>{activeError}</FieldError>}

        <div className="flex items-center gap-2 pt-1">
          <button type="submit" disabled={isSaving || stale || !selectedAction || isLoading} className={btnAccent}>
            {isSaving ? 'Guardando…' : existingCheck ? 'Actualizar comprobación' : 'Guardar comprobación'}
          </button>
        </div>
      </form>
    </section>
  );
}
