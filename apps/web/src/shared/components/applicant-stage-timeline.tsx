
"use client";

import { APPLICANT_STATUSES, ApplicantStatus } from "../types/applicant";

interface ApplicantStageTimelineProps {
  currentStage: ApplicantStatus;
  history: {
    stage: ApplicantStatus;
    changedAt: string;
  }[];
}

const STAGE_LABELS: Record<ApplicantStatus, string> = {
  Postulado: "Postulación recibida",
  "En revisión": "En revisión",
  Preseleccionado: "Preseleccionado",
  Entrevistado: "Entrevista",
  Descartado: "Descartado",
};

function formatTimelineDate(date: string): string {
  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Fecha no disponible";
  }

  return new Intl.DateTimeFormat("es-BO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(parsedDate);
}

export function ApplicantStageTimeline({
  currentStage,
  history,
}: ApplicantStageTimelineProps) {
  const currentIndex = APPLICANT_STATUSES.indexOf(currentStage);

  const isRejected = currentStage === "Descartado";

  const visibleStages = isRejected
    ? [...APPLICANT_STATUSES.slice(0, currentIndex), "Descartado" as const]
    : APPLICANT_STATUSES.slice(0, 4);

  return (
    <section
      aria-labelledby="applicant-timeline-title"
      className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6"
    >
      <h2
        id="applicant-timeline-title"
        className="text-lg font-bold text-[#1B2632]"
      >
        Seguimiento de postulación
      </h2>

      <p className="mt-1 text-sm text-gray-500">
        Avance del candidato en el proceso de selección.
      </p>

      <ol className="mt-6 space-y-5">
        {visibleStages.map((stage, index) => {
          const event = history
            .filter((item) => item.stage === stage)
            .sort(
              (a, b) =>
                new Date(b.changedAt).getTime() -
                new Date(a.changedAt).getTime()
            )[0];

          const isCurrent = stage === currentStage;
          const isCompleted =
            !isRejected && index < currentIndex;

          return (
            <li key={stage} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                    isCurrent
                      ? "bg-blue-600 text-white"
                      : isCompleted
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-400"
                  }`}
                  aria-label={
                    isCurrent
                      ? "Etapa actual"
                      : isCompleted
                        ? "Etapa completada"
                        : "Etapa pendiente"
                  }
                >
                  {isCompleted ? "✓" : index + 1}
                </span>

                {index < visibleStages.length - 1 && (
                  <span className="mt-1 h-full min-h-8 w-px bg-gray-200" />
                )}
              </div>

              <div className="min-w-0 flex-1 pb-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold text-[#1B2632]">
                    {STAGE_LABELS[stage]}
                  </h3>

                  {isCurrent && (
                    <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">
                      Etapa actual
                    </span>
                  )}

                  {isCompleted && (
                    <span className="text-xs font-medium text-green-700">
                      Completada
                    </span>
                  )}
                </div>

                <p className="mt-1 text-sm text-gray-500">
                  {event
                    ? formatTimelineDate(event.changedAt)
                    : isCompleted
                      ? "Fecha no disponible"
                      : isCurrent
                        ? "Fecha no disponible"
                        : "Pendiente"}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
