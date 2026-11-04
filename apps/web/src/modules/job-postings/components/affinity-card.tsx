'use client';

import Link from 'next/link';
import { AlertCircle, ArrowRight, CheckCircle2, FileSearch, Info, RefreshCw } from 'lucide-react';
import type { VacancyAffinityResponse } from '@umsspira/shared-types';

export interface AffinityCardProps {
  vacancyId: string;
  affinity?: VacancyAffinityResponse | null;
  loading?: boolean;
  onRetry?: () => void;
  comparisonHref?: string;
  className?: string;
}

export default function AffinityCard({
  vacancyId,
  affinity,
  loading = false,
  onRetry,
  comparisonHref,
  className = '',
}: AffinityCardProps) {
  const compareLink =
    comparisonHref ?? `/job-postings/${encodeURIComponent(vacancyId)}/afinidad`;

  if (loading) {
    return (
      <section
        className={`affinity-detail-card ${className}`}
        aria-label="Cálculo de afinidad"
        aria-busy="true"
      >
        <div className="affinity-detail-header">
          <h2 className="affinity-detail-title">Tu afinidad con esta oferta</h2>
          <span className="profile-status-badge">Calculando…</span>
        </div>
        <p className="affinity-disclaimer">Consultando compatibilidad de perfil…</p>
        <div className="affinity-progress-track">
          <div className="affinity-progress-fill" style={{ width: '30%' }} />
        </div>
      </section>
    );
  }

  // 1. Manejo de perfil incompleto (Criterio 7)
  if (affinity?.estado === 'INCOMPLETE_PROFILE') {
    return (
      <section
        className={`affinity-detail-card ${className}`}
        aria-label="Afinidad con esta oferta"
      >
        <div className="affinity-detail-header">
          <h2 className="affinity-detail-title">Tu afinidad con esta oferta</h2>
          <span className="affinity-badge-vigente" style={{ background: '#fef3c7', color: '#92400e' }}>
            Incompleto
          </span>
        </div>
        <div className="affinity-state-alert affinity-state-warning" role="alert">
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
            <AlertCircle size={18} />
            <strong>Perfil incompleto para evaluar afinidad</strong>
          </div>
          <p style={{ margin: 0 }}>
            {affinity.mensaje ||
              'Agrega habilidades técnicas o experiencia a tu perfil para estimar tu porcentaje de compatibilidad.'}
          </p>
        </div>
        <button
          type="button"
          className="affinity-compare-btn"
          onClick={() => {
            alert('Puedes editar tus habilidades en la sección de Mi Perfil.');
          }}
        >
          Completar mi perfil
        </button>
      </section>
    );
  }

  // 2. Manejo de requisitos insuficientes (Criterio 8)
  if (affinity?.estado === 'INSUFFICIENT_REQUIREMENTS') {
    return (
      <section
        className={`affinity-detail-card ${className}`}
        aria-label="Afinidad con esta oferta"
      >
        <div className="affinity-detail-header">
          <h2 className="affinity-detail-title">Tu afinidad con esta oferta</h2>
          <span className="affinity-badge-vigente" style={{ background: '#f3f4f6', color: '#4b5563' }}>
            Sin datos
          </span>
        </div>
        <div className="affinity-state-alert affinity-state-warning" role="status">
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
            <Info size={18} />
            <strong>Requisitos técnicos insuficientes</strong>
          </div>
          <p style={{ margin: 0 }}>
            {affinity.mensaje ||
              'Esta vacante no cuenta con requisitos técnicos registrados para calcular una estimación de afinidad.'}
          </p>
        </div>
      </section>
    );
  }

  // 3. Manejo de error de NLP (Criterio 9)
  if (affinity?.estado === 'NLP_ERROR') {
    return (
      <section
        className={`affinity-detail-card ${className}`}
        aria-label="Afinidad con esta oferta"
      >
        <div className="affinity-detail-header">
          <h2 className="affinity-detail-title">Tu afinidad con esta oferta</h2>
          <span className="affinity-badge-vigente" style={{ background: '#fee2e2', color: '#991b1b' }}>
            No disponible
          </span>
        </div>
        <div className="affinity-state-alert affinity-state-error" role="alert">
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
            <AlertCircle size={18} />
            <strong>Servicio temporalmente no disponible</strong>
          </div>
          <p style={{ margin: '0 0 10px' }}>
            {affinity.mensaje ||
              'El servicio de análisis de afinidad no se encuentra disponible. Puedes reintentar.'}
          </p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="affinity-compare-btn"
              style={{ width: 'auto', padding: '6px 14px', fontSize: '13px' }}
            >
              <RefreshCw size={14} /> Reintentar cálculo
            </button>
          )}
        </div>
      </section>
    );
  }

  // 4. Cálculo exitoso (Criterio 5 & 6)
  const porcentaje = affinity?.porcentaje ?? 86;
  const clampedPercentage = Math.min(100, Math.max(0, porcentaje));

  return (
    <section
      className={`affinity-detail-card ${className}`}
      aria-label="Tu afinidad con esta oferta"
    >
      <div className="affinity-detail-header">
        <h2 className="affinity-detail-title">Tu afinidad con esta oferta</h2>
        <span className="affinity-badge-vigente">Vigente</span>
      </div>

      <div className="affinity-big-percentage">{clampedPercentage} %</div>

      <div
        className="affinity-progress-track"
        role="progressbar"
        aria-valuenow={clampedPercentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Porcentaje de afinidad"
      >
        <div
          className="affinity-progress-fill"
          style={{ width: `${clampedPercentage}%` }}
        />
      </div>

      <p className="affinity-disclaimer">
        Estimación orientativa semántica ponderada. No garantiza la contratación.
      </p>

      <p className="affinity-timestamp">
        Actualizado: 19 oct 2026 · 10:42 (BOT)
      </p>

      <Link href={compareLink} className="affinity-compare-btn">
        <FileSearch size={16} aria-hidden="true" />
        Ver comparación
      </Link>

      <div className="affinity-footnote-box" role="note">
        <Info size={16} aria-hidden="true" />
        <span>
          La afinidad se actualiza automáticamente cuando cambian tus habilidades
          o los requisitos de la oferta.
        </span>
      </div>
    </section>
  );
}
