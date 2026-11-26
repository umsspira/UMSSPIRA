"use client";

import { useEffect, useId, useState } from "react";
import { ChevronDown, History } from "lucide-react";
import {
  fetchApplicationHistory,
  type ApplicationHistory,
} from "../services/applications-board.service";
import { pollOcr } from "../services/ocr-polling";
import { HistoryTimeline } from "./history-timeline";

export function HistoryTab({ applicationId }: { applicationId: string }) {
  const [history, setHistory] = useState<ApplicationHistory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const timelineId = useId();

  useEffect(() => {
    const controller = new AbortController();
    let pending = true;
    setHistory(null);
    setError(null);
    setLoading(true);
    setExpanded(false);

    const load = async () => {
      try {
        const result = await fetchApplicationHistory(applicationId);
        if (controller.signal.aborted) return;
        if (!result.ok) throw new Error(result.message);
        setHistory(result.data);
        setError(null);
        const latest = result.data.ocr.latestAnalysis;
        pending = !latest || ["PENDIENTE", "EN_CURSO"].includes(latest.status);
      } catch (error) {
        if (controller.signal.aborted) return;
        setError(error instanceof Error ? error.message : "No se pudo consultar el historial del expediente.");
        throw error;
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    // Conserva la actualización de los eventos al terminar el OCR.
    const stopPolling = pollOcr(load, controller.signal, () => pending ? 3000 : 30000);
    return () => {
      controller.abort();
      stopPolling();
    };
  }, [applicationId]);

  const currentHistory = history?.applicationId === applicationId ? history : null;
  const events = currentHistory?.events ?? [];
  const canExpand = events.length > 1 && !error;
  const heading = (
    <>
      <History aria-hidden="true" className="h-4 w-4 shrink-0 text-[#A35139]" />
      <span>Historial de la solicitud</span>
      {currentHistory && (
        <span className="rounded bg-[#EEE9DF] px-2 py-1 text-xs font-semibold">
          {currentHistory.eventCount} {currentHistory.eventCount === 1 ? "movimiento registrado" : "movimientos registrados"}
        </span>
      )}
    </>
  );

  return (
    <section aria-labelledby="application-history-title" className="space-y-4 rounded-lg border border-[#C9C1B1] bg-white p-4">
      <h3 id="application-history-title" className="text-sm font-bold text-[#1B2632]">
        {canExpand ? (
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={timelineId}
            onClick={() => setExpanded(value => !value)}
            className="flex w-full flex-wrap items-center gap-2 rounded text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#A35139]"
          >
            {heading}
            <ChevronDown aria-hidden="true" className={`ml-auto h-4 w-4 shrink-0 ${expanded ? "rotate-180" : ""}`} />
          </button>
        ) : (
          <span className="flex flex-wrap items-center gap-2">{heading}</span>
        )}
      </h3>
      <div id={timelineId}>
        {error ? (
          <p role="alert" className="text-sm text-[#A35139]">{error}</p>
        ) : (
          <HistoryTimeline events={expanded ? events : events.slice(0, 1)} loading={loading} />
        )}
      </div>
      {canExpand && !expanded && (
        <p className="text-xs text-[#2C3B4D]">
          {events.length - 1} {events.length === 2 ? "movimiento anterior disponible" : "movimientos anteriores disponibles"}.
        </p>
      )}
      <p className="text-xs text-[#2C3B4D]">
        Historial de solo lectura. Se muestran los movimientos con fecha registrada;
        los expedientes antiguos pueden tener información incompleta.
      </p>
    </section>
  );
}
