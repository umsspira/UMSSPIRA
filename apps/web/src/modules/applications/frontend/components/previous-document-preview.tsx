
"use client";

import { useEffect, useRef, useState } from "react";
import { getPreviousDocument } from "../services/application.service";

type Preview = {
  url: string;
  type: string;
};

type Props = {
  token: string;
  available: boolean;
};

export function PreviousDocumentPreview({
  token,
  available,
}: Props) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!preview) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPreview(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      URL.revokeObjectURL(preview.url);
    };
  }, [preview]);

  async function openDocument() {
    if (loading || !available) return;

    setLoading(true);
    setError(null);

    const result = await getPreviousDocument(token);

    if (!mounted.current) return;

    setLoading(false);

    if (result.status === "invalid-link") {
      setError(
        "El enlace de corrección ya no es válido o el documento no está disponible.",
      );
      return;
    }

    if (result.status === "error") {
      setError(result.message);
      return;
    }

    setPreview({
      url: URL.createObjectURL(result.file),
      type: result.file.type,
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={openDocument}
        disabled={!available || loading}
        className="mt-3 text-xs font-bold underline disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Cargando documento..." : "Ver documento previo"}
      </button>

      {!available && (
        <p className="mt-2 text-xs text-slate-600">
          No hay un documento anterior disponible.
        </p>
      )}

      {error && (
        <p role="alert" className="mt-2 text-xs text-red-700">
          {error}
        </p>
      )}

      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="previous-document-title"
            className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white p-4 shadow-xl"
          >
            <header className="mb-3 flex items-center justify-between gap-3">
              <h2
                id="previous-document-title"
                className="font-bold text-slate-900"
              >
                Documento previo
              </h2>
              <button
                type="button"
                onClick={() => setPreview(null)}
                autoFocus
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold"
              >
                Cerrar
              </button>
            </header>

            {preview.type.startsWith("image/") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview.url}
                alt="Vista previa del documento de respaldo anterior"
                className="max-h-[75vh] w-full object-contain"
              />
            ) : (
              <iframe
                src={preview.url}
                title="Vista previa del documento PDF anterior"
                sandbox="allow-scripts"
                className="h-[75vh] w-full border-0"
              />
            )}
          </section>
        </div>
      )}
    </>
  );
}
