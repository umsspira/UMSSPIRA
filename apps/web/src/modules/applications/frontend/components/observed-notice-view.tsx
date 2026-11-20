
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ObservedApplicationDetail } from "@umsspira/shared-types";
import { ObservedEditForm } from "./observed-edit-form";
import { ObservedReviewSubmit } from "./observed-review-submit";
import { RequestCorrectionLinkForm } from "./request-correction-link-form";
import type { CorrectionResult, CorrectionValues } from "../hooks/use-observed-correction";
import { getObservedApplication } from "../services/application.service";
import { leaveCorrection } from "../lib/cancel-destination";

type ViewState =
  | { status: "loading" }
  | { status: "valid"; data: ObservedApplicationDetail }
  | { status: "invalid" }
  | { status: "error"; message: string };

const OBSERVATION_REASON_LABELS: Record<string, string> = {
  documento_ilegible: "Documento ilegible o borroso",
  datos_no_coinciden: "Datos declarados no coinciden con el respaldo",
  documento_incompleto: "Documento de respaldo incompleto o formato no válido",
  otro_motivo: "Otro motivo",
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("es-BO", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function InvalidCorrectionLinkMessage() {
  return (
    <div
      role="alert"
      className="mx-auto mt-16 max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm"
    >
      <h1 className="text-xl font-bold text-slate-900">
        Enlace no válido o vencido
      </h1>
      <p className="mt-3 text-sm text-slate-600">
        Este enlace no corresponde a ninguna solicitud observada o ya ha vencido.
      </p>
      <RequestCorrectionLinkForm />
    </div>
  );
}

function NetworkErrorMessage({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      className="mx-auto mt-16 max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm"
    >
      <h1 className="text-xl font-bold text-slate-900">
        Error de conexión
      </h1>
      <p className="mt-3 text-sm text-slate-600">{message}</p>
      <div className="mt-6">
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg bg-[#B5533C] px-4 py-2 text-sm font-bold text-white hover:bg-[#9c432f]"
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}

export function ObservedNoticeView({ token }: { token: string }) {
  const [state, setState] = useState<ViewState>({ status: "loading" });

  const loadData = useCallback(() => {
    setState({ status: "loading" });

    getObservedApplication(token)
      .then((result) => {
        if (result.status === "success") {
          setState({ status: "valid", data: result.data });
        } else if (result.status === "invalid-link") {
          setState({ status: "invalid" });
        } else {
          setState({ status: "error", message: result.message });
        }
      })
      .catch(() => {
        setState({
          status: "error",
          message: "No fue posible conectar con el servidor. Intenta nuevamente.",
        });
      });
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <main className="min-h-screen bg-[#EDE8DE] px-4 py-10">
      <div className="mx-auto max-w-2xl">
        {state.status === "loading" && (
          <p role="status" className="mt-16 text-center text-sm text-slate-600">
            Cargando tu solicitud…
          </p>
        )}

        {state.status === "invalid" && <InvalidCorrectionLinkMessage />}

        {state.status === "error" && (
          <NetworkErrorMessage message={state.message} onRetry={loadData} />
        )}

        {state.status === "valid" && (
          <ValidView data={state.data} token={token} />
        )}
      </div>
    </main>
  );
}

function ValidView({
  data,
  token,
}: {
  data: ObservedApplicationDetail;
  token: string;
}) {
  const [pending, setPending] = useState<CorrectionResult | null>(null);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const router = useRouter();

  function handleCancel() {
    setIsCancelDialogOpen(true);
  }

  function confirmCancel() {
    setIsCancelDialogOpen(false);

    leaveCorrection(router, {
      historyLength: window.history.length,
      referrer: globalThis.document.referrer,
      origin: window.location.origin,
    });
  }

  const form: CorrectionValues = {
    firstName: data.nombres,
    lastName: data.apellidos,
    ci: data.ci,
    complement: data.complementoCi ?? "",
    issuedIn: data.expedidoEn,
    email: data.correo,
    phone: data.telefono,
    career: data.carreraId,
    graduationYear: String(data.anioEgreso || ""),
    sisCode: data.codigoSis,
    documentType:
      data.documento?.tipoDocumento ?? "Título en Provisión Nacional",
  };

  const document = data.documento
    ? {
        name: data.documento.nombre,
        sizeLabel: `${(data.documento.sizeBytes / (1024 * 1024)).toFixed(1)} MB`,
        uploadedAt: data.observacion?.fecha
          ? new Date(data.observacion.fecha).toLocaleDateString("es-BO")
          : "Reciente",
        url: "#",
        type: data.documento.tipoDocumento,
      }
    : {
        name: "Documento previo",
        sizeLabel: "0 MB",
        uploadedAt: "-",
        url: "#",
        type: "Título en Provisión Nacional",
      };

  const motivos = Array.isArray(data.observacion?.motivos)
    ? Array.from(new Set(data.observacion.motivos))
    : [];

  const tieneMotivos = motivos.length > 0;

  const justificacion = data.observacion?.justificacion?.trim();

  return (
    <div className="flex flex-col gap-6">
      <header>
        <span className="inline-block rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-red-800">
          Expediente observado • Subsanación
        </span>
        <h1 className="mt-3 text-3xl font-extrabold text-slate-900">
          Corrige tu solicitud
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Tu solicitud fue revisada y necesita algunas correcciones para
          continuar con el proceso oficial.
        </p>
      </header>

      <section
        aria-labelledby="observation-title"
        className="rounded-xl border border-slate-200 border-l-4 border-l-[#B5533C] bg-white p-6 shadow-sm"
      >
        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
          <h2
            id="observation-title"
            className="rounded bg-[#B5533C] px-2 py-0.5 text-xs font-bold text-white"
          >
            Observación
          </h2>

          {data.observacion?.fecha && (
            <time
              className="text-xs text-slate-500"
              dateTime={data.observacion.fecha}
            >
              {formatDateTime(data.observacion.fecha)}
            </time>
          )}
        </div>

        <div className="flex flex-col gap-4">
          {tieneMotivos ? (
            <div>
              <h3 className="mb-2 text-sm font-bold text-slate-900">
                Motivos de la observación
              </h3>

              <ul className="list-disc space-y-2 pl-5 text-sm text-slate-800">
                {motivos.map((codigo) => (
                  <li key={codigo}>
                    {OBSERVATION_REASON_LABELS[codigo] ?? codigo}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            data.observacion?.categoria && (
              <p className="text-sm font-bold text-slate-900">
                Categoría: {data.observacion.categoria}
              </p>
            )
          )}

          <div>
            <h3 className="mb-2 text-sm font-bold text-slate-900">
              ¿Qué debes corregir?
            </h3>

            <blockquote className="rounded-lg bg-[#EDE8DE] p-4 text-sm font-medium whitespace-pre-wrap text-slate-800">
              {justificacion || "Sin justificación registrada."}
            </blockquote>
          </div>
        </div>
      </section>

      {pending && (
        <ObservedReviewSubmit
          token={token}
          version={data.version}
          result={pending}
          currentDocument={document}
          onBack={() => setPending(null)}
        />
      )}

      <div hidden={Boolean(pending)}>
        <ObservedEditForm
          token={token}
          hasPreviousDocument={Boolean(data.documento)}
          initial={form}
          currentDocument={document}
          onCancel={handleCancel}
          onReview={(result) => setPending(result)}
          onRequireEmailVerification={() => {
            // Se procesará en el flujo de correo.
          }}
        />
      </div>

      <p className="rounded-lg border border-slate-200 bg-white/60 p-3 text-center text-xs text-slate-600">
        La corrección de datos se realiza directamente sobre el mismo
        expediente oficial sin generar un trámite duplicado.
      </p>

      {isCancelDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="cancel-dialog-title"
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-lg"
          >
            <h2
              id="cancel-dialog-title"
              className="text-lg font-bold text-slate-900"
            >
              ¿Descartar cambios?
            </h2>

            <p className="mt-2 text-sm text-slate-600">
              Si sales ahora, perderás los datos que hayas modificado. Puedes
              seguir editando para conservarlos.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsCancelDialogOpen(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                Seguir editando
              </button>

              <button
                type="button"
                onClick={confirmCancel}
                className="rounded-lg bg-[#B5533C] px-4 py-2 text-sm font-bold text-white hover:bg-[#9c432f]"
              >
                Descartar y salir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
