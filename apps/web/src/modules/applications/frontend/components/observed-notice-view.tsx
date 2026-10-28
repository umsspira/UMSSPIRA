"use client";

import { useEffect, useState } from "react";
import { ObservedEditForm } from "./observed-edit-form";
import { ObservedReviewSubmit } from "./observed-review-submit";
import type { CorrectionResult, CorrectionValues } from "../hooks/use-observed-correction";

type Observation = { category: string; note: string };

type ObservedApplication = {
  observedAt: string;
  observations: Observation[];
  form: CorrectionValues;
  document: { name: string; sizeLabel: string; uploadedAt: string; url: string; type: string };
};

type ViewState =
  | { status: "loading" }
  | { status: "valid"; data: ObservedApplication }
  | { status: "invalid" | "expired" | "not-observed" };

// TODO: reemplazar por la llamada real al backend (GET con el token).
// Mapear la respuesta: 200 -> valid, 404 -> invalid, 410 -> expired, 409 -> not-observed.
async function fetchObservedApplication(token: string): Promise<ViewState> {
  await new Promise((r) => setTimeout(r, 400));
  if (token === "invalido") return { status: "invalid" };
  if (token === "vencido") return { status: "expired" };
  if (token === "no-observada") return { status: "not-observed" };
  return {
    status: "valid",
    data: {
      observedAt: "2026-10-22T11:30:00",
      observations: [
        {
          category: "Datos personales y contacto",
          note: "El documento adjunto no es completamente legible. Adjunta una copia más clara de los sellos y firmas de egreso.",
        },
        {
          category: "Documento de respaldo",
          note: "El documento adjunto no es completamente legible. Adjunta una copia más clara de los sellos y firmas de egreso.",
        },
      ],
      form: {
        firstName: "Juan Carlos",
        lastName: "Pérez Mamani",
        birthDate: "1998-05-14",
        ci: "6842109",
        complement: "",
        issuedIn: "CB",
        email: "carlos.perez.m@correo.com",
        phone: "70745821",
        career: "Licenciatura en Ingeniería de Sistemas",
        graduationYear: "2023",
        sisCode: "201804921",
        documentType: "Título en Provisión Nacional",
      },
      document: {
        name: "Certificado_Conclusion_Estudios_JuanPerez.pdf",
        sizeLabel: "4.2 MB",
        uploadedAt: "2026-10-20",
        url: "#",
        type: "Título en Provisión Nacional",
      },
    },
  };
}

const STATUS_MESSAGES = {
  invalid: {
    title: "Enlace no válido",
    text: "Este enlace no corresponde a ninguna solicitud observada. Verifica que lo hayas copiado completo desde tu correo.",
  },
  expired: {
    title: "Enlace vencido",
    text: "Este enlace ya no está vigente. Si tu solicitud sigue observada, puedes pedir que te enviemos uno nuevo al correo verificado.",
  },
  "not-observed": {
    title: "Esta solicitud ya no está observada",
    text: "No es posible editarla desde este enlace porque su estado cambió.",
  },
} as const;

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("es-BO", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusMessage({ kind }: { kind: keyof typeof STATUS_MESSAGES }) {
  const { title, text } = STATUS_MESSAGES[kind];
  return (
    <div
      role="alert"
      className="mx-auto mt-16 max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm"
    >
      <h1 className="text-xl font-bold text-slate-900">{title}</h1>
      <p className="mt-3 text-sm text-slate-600">{text}</p>
      {/* TODO (CA-10.6): botón "Solicitar enlace nuevo" en una rama posterior */}
    </div>
  );
}

export function ObservedNoticeView({ token }: { token: string }) {
  const [state, setState] = useState<ViewState>({ status: "loading" });

  useEffect(() => {
    let active = true;
    fetchObservedApplication(token)
      .then((result) => active && setState(result))
      .catch(() => active && setState({ status: "invalid" }));
    return () => {
      active = false;
    };
  }, [token]);

  return (
    <main className="min-h-screen bg-[#EDE8DE] px-4 py-10">
      <div className="mx-auto max-w-2xl">
        {state.status === "loading" && (
          <p role="status" className="mt-16 text-center text-sm text-slate-600">
            Cargando tu solicitud…
          </p>
        )}

        {(state.status === "invalid" ||
          state.status === "expired" ||
          state.status === "not-observed") && <StatusMessage kind={state.status} />}

        {state.status === "valid" && <ValidView data={state.data} token={token} />}
      </div>
    </main>
  );
}

function ValidView({ data, token }: { data: ObservedApplication; token: string }) {
  const { form, document, observations } = data;
  const [pending, setPending] = useState<CorrectionResult | null>(null);
  return (
    <div className="flex flex-col gap-6">
      <header>
        <span className="inline-block rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-red-800">
          Expediente observado • Subsanación
        </span>
        <h1 className="mt-3 text-3xl font-extrabold text-slate-900">Corrige tu solicitud</h1>
        <p className="mt-2 text-sm text-slate-600">
          Tu solicitud fue revisada y necesita algunas correcciones para continuar con el proceso
          oficial.
        </p>
      </header>

      <section className="rounded-xl border border-slate-200 border-l-4 border-l-[#B5533C] bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
          <span className="rounded bg-[#B5533C] px-2 py-0.5 text-xs font-bold text-white">
            Observaciones
          </span>
          <time className="text-xs text-slate-500" dateTime={data.observedAt}>
            {formatDateTime(data.observedAt)}
          </time>
        </div>
        <ul className="flex flex-col gap-4">
          {observations.map((o, i) => (
            <li key={i}>
              <p className="mb-2 text-sm font-bold text-slate-900">Categoría: {o.category}</p>
              <blockquote className="rounded-lg bg-[#EDE8DE] p-4 text-sm font-medium text-slate-800">
                {o.note}
              </blockquote>
            </li>
          ))}
        </ul>
      </section>

      {pending && (
        <ObservedReviewSubmit
          token={token}
          result={pending}
          currentDocument={document}
          onBack={() => setPending(null)}
        />
      )}
      <div hidden={Boolean(pending)}>
        <ObservedEditForm
          initial={form}
          currentDocument={document}
          onCancel={() => window.history.back()}
          onReview={(result) => setPending(result)}
          onRequireEmailVerification={(result) => {
            // TODO: enviar al paso de verificación (email-verification)
            console.log("verify email", result);
          }}
        />
      </div>

      <p className="rounded-lg border border-slate-200 bg-white/60 p-3 text-center text-xs text-slate-600">
        La corrección de datos se realiza directamente sobre el mismo expediente oficial sin
        generar un trámite duplicado.
      </p>
    </div>
  );
}