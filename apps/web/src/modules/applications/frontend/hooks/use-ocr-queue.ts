"use client";
import { useEffect, useState } from "react";
import type { OcrJob } from "@umsspira/shared-types";
import { authenticatedFetch } from "@/shared/services/auth-session";
import { ocrRequest } from "../services/ocr-api";
import { readOcrDocument, disposeOcrEngine } from "../services/ocr-browser";

export function useOcrQueue() {
  const [message, setMessage] = useState("Buscando respaldos pendientes…");
  useEffect(() => {
    const lifetime = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    let active: AbortController | undefined;
    let retryMs = 15000;
    const run = async () => {
      let job: OcrJob | null = null;
      let heartbeat: ReturnType<typeof setInterval> | undefined;
      let deadline: ReturnType<typeof setTimeout> | undefined;
      try {
        job = await ocrRequest<OcrJob | null>("ocr/claim", {}, lifetime.signal);
        if (lifetime.signal.aborted) return;
        retryMs = 15000;
        if (!job) {
          setMessage(
            "Análisis automático disponible. Los trabajos pendientes se procesan con la bandeja abierta.",
          );
          return;
        }
        active = new AbortController();
        const processing = active;
        const reserved = job;
        heartbeat = setInterval(() => {
          void ocrRequest(
            `ocr/${reserved.id}/renew`,
            { token: reserved.token },
            processing.signal,
          ).catch(() => processing.abort(new Error("Se perdió la reserva.")));
        }, 25000);
        deadline = setTimeout(
          () => processing.abort(new Error("Se agotó el tiempo de lectura.")),
          240000,
        );
        const response = await authenticatedFetch(
          `/api/v1/applications/ocr/${job.id}/document`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: job.token }),
            signal: processing.signal,
          },
        );
        if (!response.ok)
          throw new Error("No se pudo descargar el respaldo reservado.");
        const reading = await readOcrDocument(
          await response.blob(),
          processing.signal,
          setMessage,
        );
        processing.signal.throwIfAborted();
        await ocrRequest(
          `ocr/${job.id}/complete`,
          { token: job.token, reading },
          processing.signal,
        );
        setMessage(
          "Análisis compartido guardado. Buscando el siguiente respaldo…",
        );
        retryMs = 1000;
        window.dispatchEvent(new Event("umsspira:ocr-updated"));
      } catch (error) {
        if (!lifetime.signal.aborted) {
          retryMs = Math.min(Math.max(retryMs * 2, 30000), 120000);
          setMessage(
            error instanceof Error
              ? error.message
              : "Lectura no disponible. Continúa con revisión manual.",
          );
          if (job)
            await ocrRequest(
              `ocr/${job.id}/fail`,
              { token: job.token },
              lifetime.signal,
            ).catch(() => undefined);
        }
      } finally {
        clearInterval(heartbeat);
        clearTimeout(deadline);
        active = undefined;
        if (!lifetime.signal.aborted) timer = setTimeout(run, retryMs);
      }
    };
    void run();
    return () => {
      lifetime.abort();
      active?.abort();
      disposeOcrEngine();
      clearTimeout(timer);
    };
  }, []);
  return message;
}
