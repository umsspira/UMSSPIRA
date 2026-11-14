import Link from 'next/link';
import type { EventCertificate } from './certificate-types';
import styles from './certificates.module.css';

interface Props {
  certificate: EventCertificate;
  downloading?: boolean;
  onDownload?: (id: string) => void;
}

export function CertificateCard({
  certificate,
  downloading = false,
  onDownload,
}: Props) {
  return (
    <article className={styles.card}>
      <div className={styles.cardInformation}>
        <h3>{certificate.eventName}</h3>
        <p>
          Fecha de participación:{' '}
          <strong>{certificate.participationDate}</strong>
        </p>
      </div>

      <div className={styles.cardActions}>
        <span className={styles.available}>DISPONIBLE</span>

        <div className={styles.buttons}>
          <Link
            className={styles.secondaryButton}
            href={`/mis-certificados/${encodeURIComponent(certificate.id)}`}
          >
            Ver certificado
          </Link>

          <button
            type="button"
            className={styles.primaryButton}
            disabled={!onDownload || downloading}
            onClick={() => onDownload?.(certificate.id)}
            title={
              !onDownload
                ? 'Descarga pendiente de integración con HU18'
                : undefined
            }
          >
            {downloading ? 'Descargando...' : 'Descargar'}
          </button>
        </div>
      </div>
    </article>
  );
}
