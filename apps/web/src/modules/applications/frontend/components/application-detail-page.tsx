"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/shared/components/button";
import {
  fetchApplicationDetail,
  fetchDocumentUrl,
  type BoardDetail,
} from "../services/applications-board.service";
import {
  ApplicationDetail,
  OVERDUE_HOURS,
  STATUS_LABEL,
  hoursSince,
  type Application,
} from "./application-detail";
import { ApproveDialog } from "./approve-dialog";
import { ObserveDialog } from "./observe-dialog";
import { RejectDialog } from "./reject-dialog";
import { btnAccent, btnDanger, btnSecondary } from "./review-ui";
import { ReviewSummaryNotice } from "./review-summary-notice";
import { HistoryTab } from "./history-tab";
import { useOcrRunner } from "../hooks/use-ocr-runner";

export interface ApplicationDetailPageProps {
  applicationId: string;
  backHref?: string;
}

export function ApplicationDetailPage({
  applicationId,
  backHref,
}: ApplicationDetailPageProps) {
  useOcrRunner();
  const searchParams = useSearchParams();
  const [application, setApplication] = useState<Application | null>(null);
  const [reviewData, setReviewData] = useState<BoardDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeDialog, setActiveDialog] = useState<
    "approve" | "observe" | "reject" | null
  >(null);
  const [historyRevision, setHistoryRevision] = useState(0);

  const backUrl = useMemo(() => {
    if (backHref) return backHref;
    const query = searchParams?.toString();
    return query ? `/applications?${query}` : "/applications";
  }, [backHref, searchParams]);

  // silent: recarga sin desmontar la pantalla para conservar lo preparado (CA-14.7).
  const loadData = useCallback(
    async (silent = false) => {
      if (!silent) setIsLoading(true);
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
        ci: [data.ci, data.issuedIn].filter(Boolean).join(" "),
        segipValidated: false,
        institutionalEmail: data.email,
        phone: data.phone,
        sisCode: data.sisCode,
        career: data.career,
        graduationYear: data.graduationYear
          ? `Gestión ${data.graduationYear}`
          : "",
        submittedAt: data.submittedAt,
        procedureType: data.documentFormat
          ? `Documento ${data.documentFormat}`
          : "Documento de respaldo",
        procedureMode: "Original",
        documentName: data.documentName || "documento",
        documentUrl: docResult.ok ? docResult.data.url : "",
        documentFormat: data.documentFormat,
        checklist: [
          { label: "Expediente recibido en la bandeja", checked: true },
        ],
      });
      setIsLoading(false);
    },
    [applicationId],
  );

  useEffect(() => {
    setActiveDialog(null);
    void loadData();
  }, [loadData]);

  const handleReviewed = useCallback(() => {
    setActiveDialog(null);
    setHistoryRevision((revision) => revision + 1);
    void loadData(true);
  }, [loadData]);

  if (needsLogin) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-2xl border border-oatmeal bg-white p-8 text-center">
          <p role="alert" className="text-sm font-medium text-abyssal-blue">
            {error ??
              "Inicia sesión como administrador para ver el expediente."}
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
        <Link
          href={backUrl}
          className="inline-flex items-center text-sm font-semibold text-truffle-trouble hover:underline"
        >
          ← Volver a la bandeja
        </Link>
        <div
          role="alert"
          className="rounded-lg border border-truffle-trouble/40 bg-truffle-trouble/10 p-4 text-sm font-medium text-truffle-trouble"
        >
          {error}
        </div>
      </main>
    );
  }

  if (!application) return null;

  const canReview =
    application.status === "PENDIENTE" ||
    (application.status as string)?.toUpperCase() === "PENDING";
  const overdue = hoursSince(application.submittedAt) > OVERDUE_HOURS;
  const applicantName = `${application.firstName} ${application.lastName}`;

  return (
    <main className="mx-auto w-full max-w-[1600px] space-y-6 px-4 py-6 sm:px-6 xl:px-8">
      <header className="rounded-2xl border border-[#2C3B4D] bg-[#1B2632] p-5 text-white shadow-sm sm:p-7">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <Link
              href={backUrl}
              className="mb-2 inline-flex items-center text-sm font-medium text-[#EEE9DF] hover:text-[#FFB162] hover:underline"
            >
              ← Volver a la bandeja
            </Link>
            <h1 className="break-words text-2xl font-bold tracking-tight text-[#FFB162] sm:text-3xl">
              EXPEDIENTE: {application.code}
            </h1>
            <p className="pt-1 text-base text-[#EEE9DF]">
              Titulado: <strong className="font-semibold text-white">{applicantName}</strong>
            </p>
            <p className="flex flex-wrap items-center gap-2 pt-2 text-xs text-[#C9C1B1]">
              Revisión del expediente y preparación del dictamen
              <span className="rounded-md border border-[#4B5B6E] bg-[#2C3B4D] px-3 py-1 text-xs font-semibold text-white">
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

      <ApplicationDetail
        application={application}
        documentFooter={
          <section
            aria-label="Historial del expediente"
            className="min-w-0"
          >
            <HistoryTab
              key={`${application.id}:${historyRevision}`}
              applicationId={application.id}
              compact
              submittedAt={application.submittedAt}
            />
          </section>
        }
      />

      <footer className="sticky bottom-0 z-20 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-oatmeal bg-white p-4 shadow-sm sm:p-6">
        <p className="text-xs font-medium text-abyssal-blue/70">
          Expediente ID:{" "}
          <strong className="text-abyssal-blue">#{application.code}</strong>
          {overdue && (
            <span className="ml-2 font-semibold text-truffle-trouble">
              • Prioridad: Urgente (&gt;{OVERDUE_HOURS}h)
            </span>
          )}
        </p>
        {canReview && (
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <button
              type="button"
              className={btnDanger}
              onClick={() => setActiveDialog("reject")}
            >
              Rechazar
            </button>
            <button
              type="button"
              className={btnSecondary}
              onClick={() => setActiveDialog("observe")}
              disabled={!reviewData?.reviewSummary?.canObserve}
              title={
                reviewData?.reviewSummary?.canObserve
                  ? undefined
                  : "Consulta el aviso de observaciones del expediente"
              }
            >
              Observar
            </button>
            <button
              type="button"
              className={btnAccent}
              onClick={() => setActiveDialog("approve")}
            >
              Aprobar
            </button>
          </div>
        )}
      </footer>

      <ApproveDialog
        open={activeDialog === "approve"}
        applicationId={application.id}
        expedienteCode={application.code}
        applicantName={applicantName}
        applicantEmail={reviewData?.email}
        currentReviewer={reviewData?.currentReviewer}
        onClose={() => setActiveDialog(null)}
        onSuccess={handleReviewed}
      />
      <ObserveDialog
        open={activeDialog === "observe"}
        applicationId={application.id}
        expedienteCode={application.code}
        applicantName={applicantName}
        onClose={() => setActiveDialog(null)}
        onSuccess={handleReviewed}
      />
      <RejectDialog
        open={activeDialog === "reject"}
        applicationId={application.id}
        expedienteCode={application.code}
        applicantName={applicantName}
        onClose={() => setActiveDialog(null)}
        onSuccess={handleReviewed}
      />
    </main>
  );
}
