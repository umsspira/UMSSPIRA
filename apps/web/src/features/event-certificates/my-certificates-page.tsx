import Link from 'next/link';
import { CertificateCard } from './certificate-card';
import type { CertificatesView } from './certificate-types';
import styles from './certificates.module.css';

interface Props {
  view: CertificatesView;
  onRetry?: () => void;
  onDownload?: (id: string) => void;
  downloadingId?: string | null;
}

export function MyCertificatesPage({
  view,
  onRetry,
  onDownload,
  downloadingId,
}: Props) {
  const certificates =
    view.status === 'success' ? view.certificates : [];

  const isEmpty =
    view.status === 'success' && certificates.length === 0;

  const heading = isEmpty
    ? 'Aún no tienes certificados'
    : 'Mis certificados';

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <nav className={styles.breadcrumb} aria-label="Ruta de navegación">
          <Link href="/portal/eventos">Eventos</Link>
          <span aria-hidden="true">/</span>
          <span>Mis certificados</span>
        </nav>

        <header className={styles.header}>
          <h1>{heading}</h1>
          <p>
            Consulta y descarga tus certificados de participación
            en eventos universitarios.
          </p>
        </header>

        {view.status === 'success' && !isEmpty && (
          <section className={styles.panel} aria-label="Certificados disponibles">
            <div className={styles.sectionHeader}>
              <h2>Certificados disponibles</h2>
              <span className={styles.counter}>
                {certificates.length}
                {' '}
                {certificates.length === 1
                  ? 'certificado'
                  : 'certificados'}
              </span>
            </div>

            <div className={styles.list}>
              {certificates.map((certificate) => (
                <CertificateCard
                  key={certificate.id}
                  certificate={certificate}
                  onDownload={onDownload}
                  downloading={downloadingId === certificate.id}
                />
              ))}
            </div>
          </section>
        )}

        {isEmpty && (
          <section className={styles.statePanel}>
            <div className={styles.stateIcon} aria-hidden="true">
              ◇
            </div>
            <h2>Aquí aparecerán tus certificados</h2>
            <p>
              Cuando se confirme tu participación y se emita
              el certificado de un evento, podrás consultarlo aquí.
            </p>
            <Link className={styles.primaryButton} href="/portal/eventos">
              Explorar eventos
            </Link>
          </section>
        )}

        {view.status === 'loading' && (
          <section className={styles.statePanel} role="status">
            <h2>Consultando tus certificados...</h2>
            <p>Estamos recuperando tu información.</p>
          </section>
        )}

        {view.status === 'integration-pending' && (
          <section className={styles.statePanel} role="status">
            <span className={styles.counter}>INTEGRACIÓN PENDIENTE</span>
            <h2>Estamos preparando esta sección</h2>
            <p>
              La consulta de certificados estará disponible cuando
              se conecte el servicio de emisión de HU18.
            </p>
            <Link className={styles.secondaryButton} href="/portal/eventos">
              Volver a eventos
            </Link>
          </section>
        )}

        {view.status === 'error' && (
          <section className={styles.statePanel} role="alert">
            <h2>No pudimos consultar tus certificados</h2>
            <p>{view.message}</p>
            {onRetry && (
              <button
                type="button"
                className={styles.primaryButton}
                onClick={onRetry}
              >
                Reintentar
              </button>
            )}
          </section>
        )}

        {view.status === 'unauthenticated' && (
          <section className={styles.statePanel} role="alert">
            <h2>Debes iniciar sesión</h2>
            <p>
              Inicia sesión con tu cuenta para consultar
              tus certificados de participación.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
