'use client';

import React, { Component, type ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';

import { logSectionFailure } from '@/shared/services/section-failure-log';

interface SectionUnavailableProps {
  title: string;
  onRetry: () => void;
  timedOut?: boolean;
}

/** Mensaje estándar HU18: «Esta sección no está disponible. Reintentar». */
export function SectionUnavailable({ title, onRetry, timedOut = false }: SectionUnavailableProps) {
  return (
    <div
      role="alert"
      data-section-state="unavailable"
      className="flex h-full flex-col justify-between gap-3 rounded-2xl border border-dashed border-[#C9C1B1] bg-white p-5 shadow-sm"
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {timedOut ? 'Tiempo agotado' : 'No disponible'}
        </p>
        <h3 className="mt-1 font-bold text-slate-900">{title}</h3>
        <p className="mt-1 text-sm text-slate-600">Esta sección no está disponible.</p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex min-h-[44px] items-center justify-center gap-2 self-start rounded-full border border-amber-500 px-4 text-sm font-semibold text-amber-700 hover:bg-amber-50"
      >
        <RefreshCw className="h-4 w-4" aria-hidden="true" />
        Reintentar
      </button>
    </div>
  );
}

interface SectionBoundaryProps {
  sectionId: string;
  title: string;
  children: ReactNode;
}

interface SectionBoundaryState {
  hasError: boolean;
  attempt: number;
}

/**
 * HU18 CA-02: si una sección lanza un error al dibujarse, solo esa sección
 * muestra el aviso; el resto de la pantalla y la navegación siguen funcionando.
 * CA-03: «Reintentar» vuelve a montar solo esta sección, sin recargar la página.
 */
export class SectionBoundary extends Component<SectionBoundaryProps, SectionBoundaryState> {
  state: SectionBoundaryState = { hasError: false, attempt: 0 };

  static getDerivedStateFromError(): Pick<SectionBoundaryState, 'hasError'> {
    return { hasError: true };
  }

  componentDidCatch(error: unknown): void {
    logSectionFailure(this.props.sectionId, 'render', error);
  }

  private retry = (): void => {
    this.setState((current) => ({ hasError: false, attempt: current.attempt + 1 }));
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return <SectionUnavailable title={this.props.title} onRetry={this.retry} />;
    }
    return <React.Fragment key={this.state.attempt}>{this.props.children}</React.Fragment>;
  }
}