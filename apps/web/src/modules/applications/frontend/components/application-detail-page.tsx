'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/shared/components/button';
import {
  fetchApplicationDetail,
  fetchDocumentUrl,
  type BoardDetail,
} from '../services/applications-board.service';
import {
  ApplicationDetail,
  OVERDUE_HOURS,
  STATUS_LABEL,
  hoursSince,
  type Application,
} from './application-detail';
import { ApproveDialog } from './approve-dialog';
import { ObserveDialog } from './observe-dialog';
import { RejectDialog } from './reject-dialog';
import { ReviewSummaryNotice } from './review-summary-notice';
import { btnAccent, btnDanger, btnSecondary } from './review-ui';

export interface ApplicationDetailPageProps {
  applicationId: string;
  backHref?: string;
}

type ActiveDialog = 'approve' | 'observe' | 'reject' | null;

export function ApplicationDetailPage({ applicationId, backHref }: ApplicationDetailPageProps) {
  const searchParams = useSearchParams();
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);
  const [application, setApplication] = useState<Application | null>(null);
  const [reviewData, setReviewData] = useState<BoardDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const backUrl = useMemo(() => {
    if (backHref) return backHref;
    const query = searchParams?.toString();
    return query ? `/applications?${query}` : '/applications';
  }, [backHref, searchParams]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setNeedsLogin(false);
    const detailResult = await fetchApplicationDetail(applicationId);
    if (!detailResult.ok) {
      setNeedsLogin(detailResult.needsLogin);
      setError(detailResult.message);
      setIsLoading(false);
      return;
    }
    const docResult = await fetchDocumentUrl(applicationId);
    const data = detailResult.data;
    setReviewData(data);
    setApplication({
      id: data.id,
      code: data.code,
      status: data.status,
      firstName: data.firstName,
      lastName: data.lastName,
      ci: [data.ci, data.issuedIn].filter(Boolean).join(' '),
      segipValidated: false,
      institutionalEmail: data.email,
      phone: data.phone,
      sisCode: data.sisCode,
      career: data.career,
      graduationYear: data.graduationYear ? `Gestión ${data.graduationYear}` : '',
      submittedAt: data.submittedAt,
      procedureType: data.documentFormat ? `Documento ${data.documentFormat}` : 'Documento de respaldo',
      procedureMode: 'Original',
      documentName: data.documentName || 'documento',
      documentUrl: docResult.ok ? docResult.data.url : '',
      documentFormat: data.documentFormat,
      checklist: [{ label: 'Expediente recibido en la bandeja', checked: true }],
    });
    setIsLoading(false);
  }, [applicationId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleReviewed = useCallback(() => {
    setActiveDialog(null);
    void loadData();
  }, [loadData]);

  if (needsLogin) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-2xl border border-oatmeal bg-white p-8 text-center">
          <p role="alert" className="text-sm font-medium text-abyssal-blue">
            {error ?? 'Inicia sesión como administrador para ver el expediente.'}
          </p>
          <Link href="/login" className="mt-4 inline-block">
            <Button type="button">Ir al inicio de sesión</Button>
          </Link>
        </div>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <p className="rounded-2xl border border-oatmeal bg-white p-10 text-center text-sm text-abyssal-blue/70">
          Cargando expediente…
        </p>
      </main>
    );
  }

  if (error && !application) {
    return (
      <main className="mx-auto max-w-6xl space-y-4 px-4 py-6">
        <Link href={backUrl} className="inline-flex items-center text-sm font-semibold text-truffle-trouble hover:underline">
          ← Volver a la bandeja
        </Link>
        <div role="alert" className="rounded-lg border border-truffle-trouble/40 bg-truffle-trouble/10 p-4 text-sm font-medium text-truffle-trouble">
          {error}
        </div>
      </main>
    );
  }

  if (!application) return null;

  const canReview = application.status === 'PENDIENTE' || (application.status as string)?.toUpperCase() === 'PENDING';
  const overdue = hoursSince(application.submittedAt) > OVERDUE_HOURS;
  const applicantName = `${application.firstName} ${application.lastName}`;
  const dialogProps = {
    applicationId: application.id,
    expedienteCode: application.code,
    applicantName,
    onClose: () => setActiveDialog(null),
    onSuccess: handleReviewed,
  };

  return (
    <main className="mx-auto max-w-6xl space-y-4 px-4 py-6">
      <header className="rounded-xl border border-oatmeal bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <Link href={backUrl} className="inline-flex items-center text-sm font-semibold text-truffle-trouble hover:underline">
              ← Volver a la bandeja
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-abyssal-blue">EXPEDIENTE: {application.code}</h1>
            <p className="flex flex-wrap items-center gap-2 text-xs text-abyssal-blue/70">
              Revisión de grado y título
              <span className="rounded-full border border-oatmeal bg-palladian px-2.5 py-0.5 text-[11px] font-semibold text-abyssal-blue">
                {STATUS_LABEL[application.status] ?? application.status}
              </span>
            </p>
          </div>
          {overdue && (
            <span className="inline-block self-start rounded-md bg-truffle-trouble px-2.5 py-1 text-xs font-bold text-white sm:self-auto">
              Prioridad: Urgente (&gt;{OVERDUE_HOURS}h)
            </span>
          )}
        </div>
      </header>

      {reviewData?.reviewSummary && (
        <ReviewSummaryNotice
          summary={reviewData.reviewSummary}
          currentReviewer={reviewData.currentReviewer}
          reviewAuthor={reviewData.reviewAuthor}
          pending={canReview}
        />
      )}

      <ApplicationDetail application={application} />

      <footer className="flex flex-col items-stretch justify-between gap-3 rounded-xl border border-oatmeal bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:p-6">
        <p className="text-xs font-medium text-abyssal-blue/70">
          Expediente ID: <strong className="text-abyssal-blue">#{application.code}</strong>
          {overdue && (
            <span className="ml-2 font-semibold text-truffle-trouble">• Prioridad: Urgente (&gt;{OVERDUE_HOURS}h)</span>
          )}
        </p>

        {canReview && (
          <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:gap-3">
            <button type="button" onClick={() => setActiveDialog('reject')} className={btnDanger}>
              Rechazar
            </button>
            <button
              type="button"
              onClick={() => { if (reviewData?.reviewSummary?.canObserve) setActiveDialog('observe'); }}
              disabled={!reviewData?.reviewSummary?.canObserve}
              title={reviewData?.reviewSummary?.canObserve ? undefined : 'Consulta el aviso de observaciones del expediente'}
              className={btnSecondary}
            >
              Observar
            </button>
            <button type="button" onClick={() => setActiveDialog('approve')} className={btnAccent}>
              Aprobar
            </button>
          </div>
        )}
      </footer>

      <ApproveDialog open={activeDialog === 'approve'} {...dialogProps} applicantEmail={reviewData?.email} currentReviewer={reviewData?.currentReviewer} />
      <ObserveDialog open={activeDialog === 'observe'} {...dialogProps} />
      <RejectDialog open={activeDialog === 'reject'} {...dialogProps} />
    </main>
  );
}
