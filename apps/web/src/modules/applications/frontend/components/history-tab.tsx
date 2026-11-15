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

export function HistoryTab({
  applicationId,
}: {
  applicationId: string;
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
    setEvents([]);
    setHistoryError(null);
    setHistoryLoading(true);
    setAnalyses([]);
    setOcrError(null);
    setOcrLoaded(false);
    prioritizeOcr(applicationId);

    void fetchApplicationHistory(applicationId).then((result) => {
      if (!active) return;
      if (result.ok) {
        setEvents(result.data);
      } else {
        setHistoryError(result.message);
      }
      setHistoryLoading(false);
    }).catch((error: unknown) => {
      if (!active) return;
      setHistoryError(
        error instanceof Error
          ? error.message
          : "No se pudo consultar el historial del expediente.",
      );
      setHistoryLoading(false);
    });

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
          const current = data.find((analysis) => analysis.current);
          pending = !current || ["PENDIENTE", "EN_CURSO"].includes(current.status);
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

  const orderedAnalyses = [...analyses].sort(
    (a, b) => b.revision - a.revision,
  );
  const latestAnalysis =
    orderedAnalyses.find((analysis) => analysis.result) ??
    orderedAnalyses.find((analysis) => analysis.current) ??
    orderedAnalyses[0] ??
    null;

  return (
    <div className="space-y-6">
      <OcrSummaryCard
        analysis={latestAnalysis}
        error={ocrError ?? undefined}
        loading={!ocrLoaded && !ocrError}
      />
      {historyError ? (
        <p role="alert" className="rounded-lg border border-[#A35139]/40 bg-white p-4 text-sm text-[#A35139]">
          {historyError}
        </p>
      ) : (
        <HistoryTimeline events={events} loading={historyLoading} />
      )}
      <p className="text-xs text-[#2C3B4D]">
        Historial de solo lectura. Las acciones registradas no se pueden editar desde esta vista.
      </p>
    </div>
  );
}
