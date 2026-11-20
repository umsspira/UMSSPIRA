"use client";

import { useEffect, useState } from "react";
import type { OcrAnalysis } from "@umsspira/shared-types";
import {
  fetchApplicationHistory,
  type ApplicationHistoryEvent,
} from "../services/applications-board.service";
import { ocrRequest } from "../services/ocr-api";
import { pollOcr } from "../services/ocr-polling";
import { prioritizeOcr } from "../services/ocr-control";
import { HistoryTimeline } from "./history-timeline";
import { OcrSummaryCard } from "./ocr-summary-card";
import { History, ChevronDown, CalendarDays, ScanLine } from "lucide-react";
import styles from "./history-timeline.module.css";

export function HistoryTab({
  applicationId,
  compact = false,
  submittedAt,
}: {
  applicationId: string;
  compact?: boolean;
  submittedAt?: string;
}) {
  const [events, setEvents] = useState<ApplicationHistoryEvent[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [analyses, setAnalyses] = useState<OcrAnalysis[]>([]);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [ocrLoaded, setOcrLoaded] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    let pending = true;
    let previousOcrState: string | undefined;
    setEvents([]);
    setHistoryError(null);
    setHistoryLoading(true);
    setAnalyses([]);
    setOcrError(null);
    setOcrLoaded(false);
    prioritizeOcr(applicationId);

    const loadHistory = () =>
      fetchApplicationHistory(applicationId)
        .then((result) => {
          if (!active) return;
          if (result.ok) {
            setEvents(result.data.events);
            setHistoryError(null);
          } else {
            setHistoryError(result.message);
          }
          setHistoryLoading(false);
        })
        .catch((error: unknown) => {
          if (!active) return;
          setHistoryError(
            error instanceof Error
              ? error.message
              : "No se pudo consultar el historial del expediente.",
          );
          setHistoryLoading(false);
        });
    void loadHistory();

    const loadOcr = async () => {
      try {
        const data = await ocrRequest<OcrAnalysis[]>(
          `${applicationId}/ocr`,
          undefined,
          controller.signal,
        );
        if (active) {
          setAnalyses(data);
          setOcrError(null);
          setOcrLoaded(true);
          const state = JSON.stringify(
            data.map((analysis) => [
              analysis.id,
              analysis.status,
              analysis.completedAt,
            ]),
          );
          if (previousOcrState !== undefined && previousOcrState !== state) {
            void loadHistory();
          }
          previousOcrState = state;
          const current = data.find((analysis) => analysis.current);
          pending =
            !current || ["PENDIENTE", "EN_CURSO"].includes(current.status);
        }
      } catch (error) {
        if (!controller.signal.aborted && active) {
          setOcrLoaded(true);
          setOcrError(
            error instanceof Error
              ? error.message
              : "No se pudo consultar el análisis OCR.",
          );
        }
        throw error;
      }
    };

    const stopPolling = pollOcr(loadOcr, controller.signal, () =>
      pending ? 3000 : 30000,
    );
    return () => {
      active = false;
      controller.abort();
      stopPolling();
    };
  }, [applicationId]);

  const orderedAnalyses = [...analyses].sort((a, b) => b.revision - a.revision);
  const latestAnalysis =
    orderedAnalyses.find((analysis) => analysis.result) ??
    orderedAnalyses.find((analysis) => analysis.current) ??
    orderedAnalyses[0] ??
    null;

  return (
    <details className={styles.panel} open>
      <summary className={styles.heading}>
        <History size={19} aria-hidden="true" className={styles.headingIcon} />
        <h3>Historial del expediente</h3>
        {!historyLoading && !historyError && (
          <span className={styles.count}>
            {events.length} movimientos registrados
          </span>
        )}
        <ChevronDown size={17} aria-hidden="true" className={styles.chevron} />
      </summary>
      <div className={styles.content}>
        {compact ? (
          <div className={styles.overview}>
            {submittedAt && (
              <p>
                <CalendarDays size={14} aria-hidden="true" />
                <span>
                  <strong>Recepción de la solicitud: </strong>
                  <time dateTime={submittedAt}>
                    {new Date(submittedAt).toLocaleString("es-BO", {
                      timeZone: "America/La_Paz",
                    })}
                  </time>
                </span>
              </p>
            )}
            <p>
              <ScanLine size={14} aria-hidden="true" />
              <span>
                <strong>Último análisis automático OCR: </strong>
                {latestAnalysis?.completedAt ? (
                  <time dateTime={latestAnalysis.completedAt}>
                    {new Date(latestAnalysis.completedAt).toLocaleString(
                      "es-BO",
                      {
                        timeZone: "America/La_Paz",
                      },
                    )}
                  </time>
                ) : ocrLoaded ? (
                  "Sin análisis finalizado"
                ) : (
                  "Consultando…"
                )}
              </span>
            </p>
            {ocrError && <p role="alert">{ocrError}</p>}
          </div>
        ) : (
          <OcrSummaryCard
            analysis={latestAnalysis}
            error={ocrError ?? undefined}
            loading={!ocrLoaded && !ocrError}
          />
        )}
        {historyError ? (
          <p
            role="alert"
            className="rounded-lg border border-[#A35139]/40 bg-white p-4 text-sm text-[#A35139]"
          >
            {historyError}
          </p>
        ) : (
          <HistoryTimeline
            events={events}
            loading={historyLoading}
            showHeading={false}
          />
        )}
        <p className={styles.footnote}>
          Registro de solo lectura. Los movimientos conservan su fecha y autor.
        </p>
      </div>
    </details>
  );
}
