"use client";
import { useEffect, useState } from "react";
import type { OcrJob } from "@umsspira/shared-types";
import { authenticatedFetch } from "@/shared/services/auth-session";
import { ocrRequest } from "../services/ocr-api";
import { readOcrDocument, disposeOcrEngine } from "../services/ocr-browser";
import {
  acknowledgeOcrPriorities,
  pendingOcrPriorities,
  withOcrDeadline,
  withOcrSlot,
} from "../services/ocr-control";

export function useOcrQueue() {
  const [message, setMessage] = useState("Buscando respaldos pendientes…");
  useEffect(() => {
    const lifetime = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    let active: AbortController | undefined;
    let retryMs = 15000;
    let running = false;
    const wake = () => {
      if (document.visibilityState === "hidden") {
        active?.abort(
          new Error(
            "Lectura pausada al ocultar la bandeja; se retomará automáticamente.",
          ),
        );
        disposeOcrEngine();
        return;
      }
      if (!running && !lifetime.signal.aborted) {
        clearTimeout(timer);
        timer = setTimeout(run, 0);
      }
    };
    const run = async () => {
      if (running || lifetime.signal.aborted) return;
      if (document.visibilityState === "hidden") {
        timer = setTimeout(run, 15000);
        return;
      }
      running = true;
      try {
        setMessage("Esperando turno de lectura; una solicitud a la vez…");
        await withOcrSlot(lifetime.signal, processNext);
      } catch {
        if (!lifetime.signal.aborted)
          setMessage("No se pudo iniciar la lectura. Se reintentará.");
      } finally {
        running = false;
        if (!lifetime.signal.aborted)
          timer = setTimeout(run, retryMs);
      }
    };
    const processNext = async () => {
      let job: OcrJob | null = null;
      let heartbeat: ReturnType<typeof setInterval> | undefined;
      let deadline: ReturnType<typeof setTimeout> | undefined;
      try {
        if (document.visibilityState === "hidden" || lifetime.signal.aborted)
          return;
        const priorities = pendingOcrPriorities();
        job = await ocrRequest<OcrJob | null>(
          "ocr/claim",
          { applicationIds: priorities },
          lifetime.signal,
        );
        // Only acknowledge priorities sent in this request; keep any opened during the fetch.
        const selected = job ? priorities.indexOf(job.applicationId) : -1;
        acknowledgeOcrPriorities(
          selected === -1 ? priorities : priorities.slice(0, selected + 1),
        );
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
        let renewing = false;
        heartbeat = setInterval(() => {
          if (renewing || processing.signal.aborted) return;
          renewing = true;
          void ocrRequest(
            `ocr/${reserved.id}/renew`,
            { token: reserved.token },
            processing.signal,
          )
            .catch(() => processing.abort(new Error("Se perdió la reserva.")))
            .finally(() => {
              renewing = false;
            });
        }, 25000);
        deadline = setTimeout(
          () => processing.abort(new Error("Se agotó el tiempo de lectura.")),
          150000,
        );
        const blob = await withOcrDeadline(
          async (signal) => {
            const response = await authenticatedFetch(
              `/api/v1/applications/ocr/${reserved.id}/document`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token: reserved.token }),
                signal,
              },
            );
            if (!response.ok)
              throw new Error("No se pudo descargar el respaldo reservado.");
            return response.blob();
          },
          processing.signal,
          30000,
        );
        const reading = await readOcrDocument(
          blob,
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
        clearInterval(heartbeat);
        active?.abort();
        if (!lifetime.signal.aborted) {
          // A bad document must not pause every other pending request for minutes.
          retryMs = job ? 1000 : Math.min(Math.max(retryMs * 2, 15000), 120000);
          setMessage(
            error instanceof Error
              ? error.message
              : "Lectura no disponible. Continúa con revisión manual.",
          );
          if (job) {
            await ocrRequest(
              `ocr/${job.id}/fail`,
              { token: job.token },
              lifetime.signal,
            ).catch(() => undefined);
            window.dispatchEvent(new Event("umsspira:ocr-updated"));
          }
        }
      } finally {
        clearInterval(heartbeat);
        clearTimeout(deadline);
        if (job && lifetime.signal.aborted)
          await ocrRequest(`ocr/${job.id}/fail`, { token: job.token }).catch(
            () => undefined,
          );
        active = undefined;
      }
    };
    window.addEventListener("umsspira:ocr-priority", wake);
    document.addEventListener("visibilitychange", wake);
    void run();
    return () => {
      lifetime.abort();
      active?.abort();
      disposeOcrEngine();
      clearTimeout(timer);
      window.removeEventListener("umsspira:ocr-priority", wake);
      document.removeEventListener("visibilitychange", wake);
    };
  }, []);
  return message;
}
