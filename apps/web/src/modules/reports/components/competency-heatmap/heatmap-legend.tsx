import { HEATMAP_NO_DATA, HEATMAP_PALETTE } from './heatmap.utils';
import styles from './competency-heatmap.module.css';

const LABELS = ['0 %', '20 %', '40 %', '60 %', '80 %', '100 %'] as const;

export function HeatmapLegend() {
  return (
    <div className={styles.legend} aria-label="Leyenda de dominio entre 0 y 100 por ciento">
      <span className={styles.legendTitle}>Dominio:</span>
      <div className={styles.legendScale}>
        <div className={styles.legendSwatches} aria-hidden="true">
          {HEATMAP_PALETTE.map((color, index) => (
            <span key={color} className={styles.legendSwatch} style={{ backgroundColor: color }} data-range={`${index * 20}-${(index + 1) * 20}`} />
          ))}
        </div>
        <div className={styles.legendLabels}>
          {LABELS.map((label) => <span key={label}>{label}</span>)}
        </div>
      </div>
      <span className={styles.legendEmpty}>
        <span className={styles.legendNoDataSquare} style={{ backgroundColor: HEATMAP_NO_DATA }} aria-hidden="true" />
        Sin datos
      </span>
    </div>
  );
}
