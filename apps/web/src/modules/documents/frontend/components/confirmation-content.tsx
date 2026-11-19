'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Check,
  Download,
  Landmark,
  MailCheck,
  ShieldCheck,
} from 'lucide-react';
import {
  useRegistrationStore,
  type RegistrationDocumentType,
} from '@/modules/registration/frontend/store';
import { maskEmail } from '@/shared/utils/mask-email';
import { downloadReceiptPdf } from '../lib/receipt-pdf';

const DOCUMENT_TYPE_LABELS: Record<RegistrationDocumentType, string> = {
  titulo_provision_nacional: 'Título en Provisión Nacional',
  diploma_academico: 'Diploma Académico',
  certificado_egreso: 'Certificado de Egreso',
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendiente',
  APPROVED: 'Aprobado',
  OBSERVED: 'Observado',
  REJECTED: 'Rechazado',
  PENDIENTE: 'Pendiente',
  APROBADA: 'Aprobado',
  OBSERVADA: 'Observado',
  RECHAZADA: 'Rechazado',
};

function formatSubmittedAt(value: Date | string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Fecha no disponible';
  }

  return new Intl.DateTimeFormat('es-BO', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'America/La_Paz',
  }).format(date);
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1 border-b border-[#e9e2d7] px-1 py-2 last:border-b-0 sm:flex-row sm:items-start sm:justify-between sm:gap-5">
      <dt className="text-sm font-semibold text-[#5b5046]">
        {label}
      </dt>
      <dd className="min-w-0 break-words text-sm font-semibold text-[#292621] sm:max-w-[65%] sm:text-right">
        {value}
      </dd>
    </div>
  );
}

export function ConfirmationContent() {
  const [isMounted, setIsMounted] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const confirmation = useRegistrationStore(
    (state) => state.confirmation
  );

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  if (!confirmation) {
    return (
      <section className="mx-auto w-full max-w-[575px] overflow-hidden rounded-2xl border-t-[6px] border-[#ffb365] bg-white px-5 pb-6 pt-5 shadow-sm sm:px-8 sm:pt-6 print:shadow-none">
        <h1 className="text-xl font-bold text-abyssal-blue">
          No encontramos una solicitud reciente
        </h1>
        <p className="mt-2 text-sm text-abyssal-blue/70">
          Si acabas de entregar tu solicitud, vuelve a iniciar
          el proceso o revisa tu correo electrónico.
        </p>
        <Link
          href="/"
          className="mt-5 inline-flex h-11 items-center justify-center rounded-lg bg-burning-flame px-6 text-sm font-bold text-abyssal-blue"
        >
          Volver al inicio
        </Link>
      </section>
    );
  }

  const documentType =
    confirmation.tipoDocumento ?? 'titulo_provision_nacional';

  const status =
    STATUS_LABEL[confirmation.estado] ?? confirmation.estado;

  async function handleDownloadReceipt() {
    if (!confirmation || isDownloading) return;
    setIsDownloading(true);
    setDownloadError(null);
    try {
      await downloadReceiptPdf({
        fullName: confirmation.nombreCompleto,
        ci: confirmation.ci,
        documentTypeLabel: DOCUMENT_TYPE_LABELS[documentType],
        status,
        submittedAt: formatSubmittedAt(confirmation.fechaEnvio),
        email: maskEmail(confirmation.correo ?? confirmation.correoEnmascarado),
      });
    } catch {
      setDownloadError('No pudimos generar la constancia. Inténtalo nuevamente.');
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-[640px] overflow-hidden rounded-[20px] border-t-[9px] border-[#ffb365] bg-white px-5 pb-10 pt-8 shadow-[0_16px_40px_rgba(38,31,22,0.08)] sm:px-9 sm:pb-12 sm:pt-9 print:shadow-none">

      <header className="flex flex-col items-center text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#fff0e2]">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#ffb365]">
            <Check
              aria-hidden="true"
              className="h-7 w-7 text-[#27201a]"
              strokeWidth={3}
            />
          </span>
        </span>

        <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.06em] text-[#66594c]">
          Trámite registrado oficialmente
        </p>

        <h1 className="mt-1 text-2xl font-extrabold leading-tight tracking-tight text-[#26231f] sm:text-[28px]">
          ¡Solicitud enviada con éxito!
        </h1>

        <p className="mt-2 max-w-[480px] text-base leading-relaxed text-[#65574b]">
          Tu solicitud fue registrada correctamente y será
          revisada por el equipo administrativo.
        </p>
      </header>

      <section
        aria-label="Resumen de la solicitud"
        className="mt-5 rounded-xl bg-[#f7f2e9] p-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#f2ede4] px-3 py-3 sm:px-4">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-[#26221d]">
            <ShieldCheck
              aria-hidden="true"
              className="h-[18px] w-[18px] text-[#625243]"
            />
            Resumen de radicación
          </h2>

          <span className="inline-flex items-center gap-2 rounded-full bg-[#e9e2d5] px-3 py-1 text-xs font-semibold text-[#94540e]">
            <span
              aria-hidden="true"
              className="h-2 w-2 rounded-full bg-[#a76912]"
            />

          <span>{status}</span>
          {status === 'Pendiente' && (
            <span>de validación</span>
          )}
        </span>
        </div>

        <dl className="mt-2 px-1 sm:px-2">
          <DetailRow
            label="Nombre del Titulado"
            value={confirmation.nombreCompleto}
          />

          <DetailRow
            label="Documento de Identidad (C.I.)"
            value={confirmation.ci}
          />

          <DetailRow
            label="Tipo de trámite"
            value={DOCUMENT_TYPE_LABELS[documentType]}
          />

          <DetailRow
            label="Fecha y hora"
            value={formatSubmittedAt(confirmation.fechaEnvio)}
          />

          <DetailRow
            label="Correo electrónico"
            value={maskEmail(
              confirmation.correo ??
              confirmation.correoEnmascarado
            )}
          />
        </dl>
      </section>

      <div className="mt-7 flex items-start gap-3 rounded-2xl bg-[#f3f0eb] p-4 sm:p-5">
        <MailCheck
          aria-hidden="true"
          className="mt-0.5 h-5 w-5 shrink-0 text-[#a36a0f]"
        />

        <p className="text-sm font-medium leading-relaxed text-[#302d28]">
          <strong className="font-bold">
            Notificación automática:
          </strong>{' '}
          Recibirás el resultado de tu solicitud y el dictamen
          de verificación directamente en tu correo electrónico.
        </p>
      </div>

      <div className="mt-7 space-y-2 print:hidden">
        <Link
          href="/"
          className="flex min-h-14 w-full items-center justify-center rounded-xl bg-[#ffb365] px-5 text-center text-base font-bold text-[#28221a] transition hover:bg-[#f9a54d]"
        >
          Volver al inicio
        </Link>

        <button
          type="button"
          onClick={handleDownloadReceipt}
          disabled={isDownloading}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#ebe7de] px-4 text-sm font-semibold text-[#53677a] transition hover:bg-[#e1dbcf]"
        >
          <Download
            aria-hidden="true"
            className="h-[18px] w-[18px]"
          />
          Guardar constancia en PDF
        </button>
        {downloadError && (
          <p role="alert" className="text-center text-xs text-red-700">
            {downloadError}
          </p>
        )}
      </div>

      <footer className="mt-9 flex items-center justify-center gap-2 text-sm text-[#928a81]">
        <Landmark
          aria-hidden="true"
          className="h-4 w-4"
        />
        UMSS Cochabamba
      </footer>
    </section>
  );
}