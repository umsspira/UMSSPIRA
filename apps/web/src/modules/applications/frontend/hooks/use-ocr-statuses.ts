import { useEffect, useState } from "react";

import type { OcrAnalysis } from "@umsspira/shared-types";

import { ocrRequest } from "../services/ocr-api";
import { pollOcr } from "../services/ocr-polling";

export const OCR_STATUS_LABELS: Record<OcrAnalysis["status"], string> = {
  PENDIENTE: "OCR pendiente",
  EN_CURSO: "OCR en curso",
  COMPLETADO: "OCR completado",
  FALLIDO: "Revisión manual",
  DESCARTADO: "OCR anterior",
};

export function useOcrStatuses(ids: string[]) {
  const key = ids.join(",");

  const [statuses, setStatuses] = useState<
    Record<string, OcrAnalysis["status"]>
  >({});

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      if (!key) {
        setStatuses({});
        return;
      }

      return ocrRequest<
        { applicationId: string; status: OcrAnalysis["status"] }[]
      >("ocr/statuses", { ids: key.split(",") }, controller.signal)
        .then((rows) => {
          if (!controller.signal.aborted)
            setStatuses(
              Object.fromEntries(
                rows.map((row) => [row.applicationId, row.status]),
              ),
            );
        })

        .catch((error: unknown) => {
          throw error;
        });
    };

    const stop = pollOcr(load, controller.signal);

    return () => {
      controller.abort();
      stop();
    };
  }, [key]);

  return statuses;
}
