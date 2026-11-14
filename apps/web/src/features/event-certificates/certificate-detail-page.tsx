import Link from 'next/link';
import styles from './certificates.module.css';

export type CertificateDetailState =
  | 'loading'
  | 'processing'
  | 'unavailable'
  | 'error'
  | 'forbidden'
  | 'unauthenticated';

interface Props {
  state: CertificateDetailState;
  eventName?: string;
  onRetry?: () => void;
}

export function CertificateDetailPage({
  state,
  eventName,
  onRetry,
}: Props) {
  const content = {
    loading: {
      title: 'Consultando certificado',
      tag: 'CARGANDO',
      heading: 'Estamos recuperando tu documento',
      description: 'Esta operación puede tardar unos instantes.',
    },
    processing: {
      title: 'Certificado aún no disponible',
      tag: 'EN PROCESO',
      heading: 'Estamos preparando tu documento',
      description: eventName
        ? `El certificado de ${eventName} todavía no ha sido emitido.`
        : 'Este certificado todavía no ha sido emitido.',
    },
    unavailable: {
      title: 'No pudimos abrir el certificado',
      tag: 'ARCHIVO NO DISPONIBLE',
      heading: 'Vuelve a intentarlo',
      description: 'No fue posible recuperar el archivo solicitado.',
    },
    error: {
      title: 'Error al consultar el certificado',
      tag: 'ERROR TEMPORAL',
      heading: 'Intenta nuevamente',
      description:
        'El servicio no respondió. Tu certificado no ha sido modificado.',
    },
    forbidden: {
      title: 'Acceso restringido',
      tag: 'ACCESO RESTRINGIDO',
      heading: 'No puedes consultar este certificado',
      description: 'Este documento no está disponible para tu cuenta.',
    },
    unauthenticated: {
      title: 'Inicia sesión',
      tag: 'SESIÓN REQUERIDA',
      heading: 'Debes iniciar sesión',
      description: 'Identifícate para consultar tus certificados.',
    },
  }[state];

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <nav className={styles.breadcrumb} aria-label="Ruta de navegación">
          <Link href="/portal/eventos">Eventos</Link>
          <span aria-hidden="true">/</span>
          <Link href="/mis-certificados">Mis certificados</Link>
          <span aria-hidden="true">/</span>
          <span>Detalle</span>
        </nav>

        <header className={styles.header}>
          <h1>{content.title}</h1>
          <p>{content.description}</p>
        </header>

        <section className={styles.statePanel} role="status">
          <span className={styles.counter}>{content.tag}</span>
          <h2>{content.heading}</h2>
          <p>{content.description}</p>

          <div className={styles.buttons}>
            <Link
              className={styles.secondaryButton}
              href="/mis-certificados"
            >
              Mis certificados
            </Link>

            {(state === 'error' || state === 'unavailable') && onRetry && (
              <button
                type="button"
                className={styles.primaryButton}
                onClick={onRetry}
              >
                Reintentar consulta
              </button>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
