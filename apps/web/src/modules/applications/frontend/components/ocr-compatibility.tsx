import type { OcrFinding } from "@umsspira/shared-types";
import styles from "./ocr-review.module.css";

export function OcrCompatibility({
  findings,
  partial = false,
}: {
  findings: readonly OcrFinding[];
  partial?: boolean;
}) {
  const total = findings.length;
  const matches = findings.filter(
    (finding) => finding.status === "COINCIDE",
  ).length;
  const unchecked = findings.filter(
    (finding) => finding.status === "NO_COMPROBADO",
  ).length;
  const percentage =
    total > 0 && unchecked < total ? Math.round((matches / total) * 100) : null;

  return (
    <section
      aria-label="Compatibilidad documental"
      className={styles.compatibility}
    >
      <div className={styles.compatibilityHeading}>
        <h4>Compatibilidad documental</h4>
        <strong>
          {percentage === null ? "Sin datos suficientes" : `${percentage}%`}
        </strong>
      </div>
      {percentage !== null && (
        <div
          role="progressbar"
          aria-label="Porcentaje de campos coincidentes"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percentage}
          aria-valuetext={`${matches} de ${total} campos coinciden`}
          className={styles.compatibilityTrack}
        >
          <span style={{ width: `${percentage}%` }} />
        </div>
      )}
      <p>
        {total
          ? `${matches} de ${total} campos coinciden${unchecked > 0 ? ` · ${unchecked} sin comprobar` : ""}.`
          : "No hay campos comparados."}
        {partial && " Lectura parcial."}
      </p>
      <p className={styles.compatibilityHint}>
        Coincidencias sobre los campos comparados; no reemplaza el dictamen.
      </p>
    </section>
  );
}
