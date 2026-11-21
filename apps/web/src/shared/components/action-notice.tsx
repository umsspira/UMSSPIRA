'use client';

import React, { useEffect, useRef } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
  RefreshCw,
  WifiOff,
} from 'lucide-react';
import { cn } from '@/shared/utils/cn';
import type { ActionStatus } from '@/shared/hooks/use-action-status';

/** HU10 CA-04: mensaje único para acciones que necesitan servidor. */
export const OFFLINE_ACTION_MESSAGE = 'Necesitas conexión para esta acción';

/** HU10 CA-02: la confirmación desaparece sola en unos segundos. */
export const NOTICE_SUCCESS_DURATION_MS = 4000;

export type ActionNoticeState = 'loading' | 'success' | 'error' | 'offline';

export interface ActionNoticeProps {
  state: ActionNoticeState;
  /** Texto principal del aviso. */
  message: string;
  /** Texto secundario (qué pasó / qué hacer). */
  description?: string;
  /** Si se pasa, el error muestra el botón «Reintentar» (CA-03). */
  onRetry?: () => void;
  /** Si se pasa, el éxito se cierra solo tras `autoDismissMs` (CA-02). */
  onDismiss?: () => void;
  autoDismissMs?: number;
  className?: string;
}

const STYLES: Record<ActionNoticeState, string> = {
  loading: 'border-oatmeal bg-white text-abyssal-blue',
  success: 'border-green-300 bg-green-50 text-green-900',
  error: 'border-truffle-trouble bg-truffle-trouble/10 text-abyssal-blue',
  offline: 'border-oatmeal bg-oatmeal/30 text-abyssal-blue',
};

function NoticeIcon({ state }: { state: ActionNoticeState }) {
  // CA-05: el aviso nunca depende solo del color; siempre lleva ícono + texto.
  switch (state) {
    case 'loading':
      return <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />;
    case 'success':
      return <CheckCircle2 size={18} aria-hidden="true" />;
    case 'error':
      return <AlertCircle size={18} className="text-truffle-trouble" aria-hidden="true" />;
    default:
      return <WifiOff size={18} aria-hidden="true" />;
  }
}

/**
 * HU10 CA-06: único componente de avisos (carga, éxito, error y sin conexión).
 * CA-07: es un aviso dentro de la página; no bloquea la navegación ni es push.
 */
export const ActionNotice: React.FC<ActionNoticeProps> = ({
  state,
  message,
  description,
  onRetry,
  onDismiss,
  autoDismissMs = NOTICE_SUCCESS_DURATION_MS,
  className,
}) => {
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  useEffect(() => {
    if (state !== 'success' || !dismissRef.current) return;
    const timeoutId = setTimeout(() => dismissRef.current?.(), autoDismissMs);
    return () => clearTimeout(timeoutId);
  }, [state, autoDismissMs]);

  const isError = state === 'error';

  return (
    <div
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
      aria-busy={state === 'loading' || undefined}
      className={cn(
        'flex w-full items-start gap-3 rounded-xl border p-4 font-sans text-[14px]',
        STYLES[state],
        className
      )}
    >
      <span className="mt-0.5 flex-shrink-0">
        <NoticeIcon state={state} />
      </span>

      <div className="min-w-0 flex-1">
        <p className="font-semibold">{message}</p>
        {description && (
          <p className="mt-0.5 text-[12px] opacity-80">{description}</p>
        )}

        {isError && onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-burning-flame px-4 font-semibold text-abyssal-blue hover:opacity-90"
          >
            <RefreshCw size={16} aria-hidden="true" />
            Reintentar
          </button>
        )}
      </div>
    </div>
  );
};

export interface ActionStatusNoticeProps {
  /** Estado que devuelve useActionStatus. */
  status: ActionStatus;
  messages: { loading: string; success: string; error: string };
  /** Detalle del error en lenguaje simple (CA-03). */
  errorDetail?: string | null;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

/** Atajo: dibuja el aviso que corresponde al estado de useActionStatus. */
export const ActionStatusNotice: React.FC<ActionStatusNoticeProps> = ({
  status,
  messages,
  errorDetail,
  onRetry,
  onDismiss,
  className,
}) => {
  if (status === 'idle') return null;

  if (status === 'offline') {
    return (
      <ActionNotice state="offline" message={OFFLINE_ACTION_MESSAGE} className={className} />
    );
  }

  if (status === 'loading') {
    return <ActionNotice state="loading" message={messages.loading} className={className} />;
  }

  if (status === 'success') {
    return (
      <ActionNotice
        state="success"
        message={messages.success}
        onDismiss={onDismiss}
        className={className}
      />
    );
  }

  return (
    <ActionNotice
      state="error"
      message={messages.error}
      description={errorDetail ?? 'Inténtalo nuevamente.'}
      onRetry={onRetry}
      className={className}
    />
  );
};