'use client';

import { useCallback, useEffect, useRef } from 'react';
import { Button } from '@/shared/components/button';

interface ExitRegistrationDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ExitRegistrationDialog({ isOpen, onConfirm, onCancel }: ExitRegistrationDialogProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  // Al abrirse, guarda el control de origen y enfoca la opción segura.
  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement as HTMLElement | null;
      cancelButtonRef.current?.focus();
    }
  }, [isOpen]);

  const handleCancel = useCallback(() => {
    onCancel();
    triggerRef.current?.focus();
  }, [onCancel]);

  // Atrapa el foco dentro del diálogo y permite cerrar con Escape retornando el foco.
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        handleCancel();
      } else if (event.key === 'Tab') {
        const dialog = dialogRef.current;
        if (!dialog) return;
        const focusable = dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleCancel]);

  if (!isOpen) return null;

  return (
    <div
      role="presentation"
      onClick={handleCancel}
      className="fixed inset-0 z-50 flex items-center justify-center bg-abyssal-blue/60 px-4"
    >
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="exit-registration-title"
        aria-describedby="exit-registration-description"
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-[420px] rounded-2xl border border-oatmeal bg-white p-6 shadow-xl sm:p-8"
      >
        <h2 id="exit-registration-title" className="text-lg font-semibold leading-6 text-abyssal-blue sm:text-2xl sm:leading-8">
          ¿Salir del registro?
        </h2>
        <p id="exit-registration-description" className="mt-2 text-[13px] text-abyssal-blue/80 sm:text-sm">
          Se perderán los datos ingresados.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button ref={cancelButtonRef} type="button" variant="secondary" onClick={handleCancel}>
            Seguir en el registro
          </Button>
          <Button type="button" onClick={onConfirm}>
            Salir
          </Button>
        </div>
      </div>
    </div>
  );
}
