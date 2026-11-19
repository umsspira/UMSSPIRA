"use client";
import { useEffect, useState } from "react";
import type { OcrJob, OcrFailure } from "@umsspira/shared-types";
import { authenticatedFetch } from "@/shared/services/auth-session";
import { ocrRequest, OcrHttpError } from "../services/ocr-api";
import {
  ocrFailure,
  OcrInterruptedError,
  OcrTimeoutError,
} from "../services/ocr-errors";
import { readOcrDocument, disposeOcrEngine } from "../services/ocr-browser";
import {
  acknowledgeOcrPriorities,
  pendingOcrPriorities,
  withOcrDeadline,
  withOcrSlot,
} from "../services/ocr-control";

function isOcrJob(value: unknown): value is OcrJob {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const job = value as Partial<OcrJob>;
  return (
    [job.id, job.applicationId, job.token].every(
      (field) => typeof field === "string" && field.trim().length > 0,
    ) &&
    typeof job.revision === "number" &&
    Number.isInteger(job.revision) &&
    job.revision > 0 &&
    typeof job.expiresAt === "string" &&
    Number.isFinite(Date.parse(job.expiresAt))
  );
}
const inboxHidden = () => document.visibilityState === "hidden";

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
          new OcrInterruptedError(
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
        if (!lifetime.signal.aborted) timer = setTimeout(run, retryMs);
      }
    };
    const processNext = async () => {
      let job: OcrJob | null = null;
      let heartbeat: ReturnType<typeof setInterval> | undefined;
      let deadline: ReturnType<typeof setTimeout> | undefined;
      let stage: OcrFailure["stage"] = "document";
      let reported = false;
      try {
        if (document.visibilityState === "hidden" || lifetime.signal.aborted)
          return;
        const priorities = pendingOcrPriorities();
        const claimed = await ocrRequest<unknown>(
          "ocr/claim",
          { applicationIds: priorities },
          lifetime.signal,
        );
        if (claimed !== null && !isOcrJob(claimed))
          throw new Error(
            "La reserva OCR recibida no es válida. Se reintentará la consulta.",
          );
        job = claimed;
        // Only acknowledge priorities sent in this request; keep any opened during the fetch.
        const selected = job ? priorities.indexOf(job.applicationId) : -1;
        acknowledgeOcrPriorities(
          selected === -1 ? priorities : priorities.slice(0, selected + 1),
        );
        if (lifetime.signal.aborted) return;
        if (job && inboxHidden())
          throw new OcrInterruptedError(
            "La bandeja se ocultó mientras se reservaba el trabajo.",
          );
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
            .catch((error: unknown) =>
              processing.abort(ocrFailure(error, "renew")),
            )
            .finally(() => {
              renewing = false;
            });
        }, 25000);
        deadline = setTimeout(
          () =>
            processing.abort(
              new OcrTimeoutError("Se agotó el tiempo de lectura."),
            ),
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
            if (!response.ok) throw new OcrHttpError(response.status);
            return response.blob();
          },
          processing.signal,
          30000,
        );
        stage = "engine";
        const reading = await readOcrDocument(
          blob,
          processing.signal,
          setMessage,
        );
        processing.signal.throwIfAborted();
        stage = "complete";
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
        const interrupted =
          lifetime.signal.aborted || error instanceof OcrInterruptedError;
        const failure = ocrFailure(error, stage);
        active?.abort();
        if (!lifetime.signal.aborted) {
          // A bad document must not pause every other pending request for minutes.
          retryMs = job ? 1000 : Math.min(Math.max(retryMs * 2, 15000), 120000);
          setMessage(
            interrupted
              ? "Lectura pausada; se retomará al volver a la bandeja."
              : job
                ? failure.message
                : error instanceof Error
                  ? error.message
                  : failure.message,
          );
        }
        if (job) {
          reported = true;
          await ocrRequest(
            `ocr/${job.id}/${interrupted ? "release" : "fail"}`,
            {
              token: job.token,
              ...(!interrupted ? { failure: failure.failure } : {}),
            },
          ).catch(() => undefined);
          window.dispatchEvent(new Event("umsspira:ocr-updated"));
        }
      } finally {
        clearInterval(heartbeat);
        clearTimeout(deadline);
        if (job && lifetime.signal.aborted && !reported)
          await ocrRequest(`ocr/${job.id}/release`, { token: job.token }).catch(
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
