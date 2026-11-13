'use client';

import { RefreshCw } from 'lucide-react';
import { HeatmapCell } from './heatmap-cell';
import { HeatmapLegend } from './heatmap-legend';
import {
  formatHeatmapUpdatedAt,
  HEATMAP_AREAS,
  HEATMAP_AREA_LABELS,
  orderedCohorts,
} from './heatmap.utils';
import type { HeatmapData } from './heatmap.types';
import styles from './competency-heatmap.module.css';

interface Props {
  /** Nombre real de carrera del administrador, suministrado por la vista padre. */
  careerName: string;
  data: HeatmapData | null;
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void | Promise<void>;
}

/**
 * HU-EP09-06 / T2.2 y T2.3.
 * Sin navbar, sin acceso directo a API, sin datos falsos en producción.
 * HU-001 integra el componente en /reports/acreditacion; Diego entrega la carga.
 */
export function CompetencyHeatmap({
  careerName, data, loading = false, error = null, onRefresh,
}: Props) {
  const cohorts = data ? orderedCohorts(data.cohorts) : [];

  return (
    <section className={styles.card} aria-labelledby="competency-heatmap-title">
      <div className={styles.heading}>
        <h2 id="competency-heatmap-title" className={styles.title}>Mapa de calor de competencias</h2>
        <p className={styles.subtitle}>Porcentaje de dominio por cohorte en las 6 áreas técnicas</p>
      </div>

      <div className={styles.meta}>
        <p className={styles.career}>Carrera: {careerName}</p>
        <div className={styles.updateRow}>
          <p className={styles.updated} aria-live="polite">
            Actualizado: {formatHeatmapUpdatedAt(data?.updatedAt)}
          </p>
          {onRefresh && (
            <button
              type="button"
              className={styles.refreshButton}
              disabled={loading}
              onClick={() => { void onRefresh(); }}
            >
              <RefreshCw size={14} aria-hidden="true" className={loading ? styles.spinning : undefined} />
              {loading ? 'Actualizando…' : 'Actualizar'}
            </button>
          )}
        </div>
      </div>

      {error && <p role="alert" className={styles.error}>{error}</p>}

      {!data && loading ? (
        <p role="status" className={styles.message}>Cargando mapa de calor…</p>
      ) : !data || cohorts.length === 0 ? (
        <p role="status" className={styles.message}>No hay información de competencias disponible.</p>
      ) : (
        <>
          <div
            className={styles.tableViewport}
            role="region"
            aria-label="Mapa de calor desplazable horizontalmente"
            tabIndex={0}
            data-testid="heatmap-scroll-region"
          >
            <table className={styles.table} aria-label="Porcentaje de dominio por cohorte y área técnica">
              <thead>
                <tr>
                  <th scope="col" className={styles.cohortHeader}>Cohorte</th>
                  {HEATMAP_AREAS.map((area) => (
                    <th key={area} scope="col" className={styles.areaHeader}>
                      {HEATMAP_AREA_LABELS[area]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cohorts.map(({ year, areas }) => (
                  <tr key={year}>
                    <th scope="row" className={styles.yearCell}>{year}</th>
                    {HEATMAP_AREAS.map((area) => (
                      <td key={`${year}-${area}`} className={styles.valueCell}>
                        <HeatmapCell cell={areas[area]} year={year} areaLabel={HEATMAP_AREA_LABELS[area]} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={styles.scrollHint}>Desliza dentro del recuadro para ver todas las áreas</p>
          <HeatmapLegend />
        </>
      )}
    </section>
  );
}
