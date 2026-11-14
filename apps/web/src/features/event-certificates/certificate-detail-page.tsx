'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CertificatePreview } from './certificate-preview';
import {
  downloadCertificatePdf,
} from './certificate-file-service';
import styles from './certificates.module.css';

export type CertificateDetailState =
  | 'available'
  | 'loading'
  | 'processing'
  | 'unavailable'
  | 'error'
  | 'forbidden'
  | 'unauthenticated';

interface CertificateDocument {
  id: string;
  eventName: string;
  participationDate: string;
  pdf: Blob;
}

interface Props {
  state: CertificateDetailState;
  document?: CertificateDocument;
  eventName?: string;
  onRetry?: () => void;
}

export function CertificateDetailPage({
  state,
  document,
  eventName,
  onRetry,
}: Props) {
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const content = {
    loading: {
      title: 'Consultando certificado',
      tag: 'CARGANDO',
      heading: 'Estamos recuperando tu documento',
      description: 'Espera mientras recuperamos tu certificado.',
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
  };

  const isAvailable = state === 'available' && !!document;
  const fallback = content[state === 'available' ? 'unavailable' : state];

  function handleDownload() {
    if (!document || !isAvailable) return;

    setDownloadError(null);

    try {
      downloadCertificatePdf(document.pdf, document.id);
    } catch {
      setDownloadError('No se pudo iniciar la descarga. Intenta nuevamente.');
    }
  }

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
          <h1>
            {isAvailable ? 'Certificado de participación' : fallback.title}
          </h1>
          <p>
            {isAvailable
              ? `Evento: ${document.eventName}`
              : fallback.description}
          </p>
        </header>

        {isAvailable ? (
          <section className={styles.detailLayout}>
            <div className={styles.previewArea}>
              <CertificatePreview
                pdf={document.pdf}
                title={document.eventName}
              />
            </div>

            <aside className={styles.documentInfo}>
              <h2>Documento disponible</h2>
              <span className={styles.available}>EMITIDO</span>

              <dl className={styles.documentMetadata}>
                <dt>Evento</dt>
                <dd>{document.eventName}</dd>
                <dt>Fecha de participación</dt>
                <dd>{document.participationDate}</dd>
              </dl>

              <button
                type="button"
                className={styles.primaryButton}
                onClick={handleDownload}
              >
                Descargar certificado
              </button>

              {downloadError && (
                <p role="alert">{downloadError}</p>
              )}

              <Link
                className={styles.secondaryButton}
                href="/mis-certificados"
              >
                Volver al listado
              </Link>
            </aside>
          </section>
        ) : (
          <section className={styles.statePanel} role="status">
            <span className={styles.counter}>{fallback.tag}</span>
            <h2>{fallback.heading}</h2>
            <p>{fallback.description}</p>

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
        )}
      </div>
    </main>
  );
}
