"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { getPreviewKind } from "@/modules/documents/frontend/validation/document-file";

const InstitutionalPdfPreview = dynamic(
  () => import("@/modules/registration/frontend/components/institutional-pdf-preview")
    .then((module) => module.InstitutionalPdfPreview),
  { ssr: false, loading: () => <p role="status">Cargando vista previa...</p> },
);

export function CorrectionDocumentPreview({ file }: { file: File }) {
  const [preview, setPreview] = useState<{ file: File; url: string } | null>(null);
  const kind = getPreviewKind(file);

  useEffect(() => {
    if (!kind) return;
    const blob = kind === "pdf" && !file.type ? file.slice(0, file.size, "application/pdf") : file;
    const url = URL.createObjectURL(blob);
    setPreview({ file, url });
    return () => URL.revokeObjectURL(url);
  }, [file, kind]);

  const url = preview?.file === file ? preview.url : null;

  return (
    <figure className="mt-3 overflow-hidden rounded-lg border border-oatmeal bg-white">
      <figcaption className="border-b border-oatmeal bg-palladian/50 px-3 py-2 text-sm font-semibold text-abyssal-blue">
        Vista previa del nuevo documento
      </figcaption>
      {!kind ? (
        <p role="alert" className="p-3 text-sm">No se puede visualizar este formato de archivo.</p>
      ) : !url ? (
        <p role="status" className="p-3 text-sm">Cargando vista previa...</p>
      ) : kind === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element -- Vista previa local (blob:).
        <img src={url} alt={`Vista previa de ${file.name}`} className="mx-auto max-h-[520px] w-auto max-w-full object-contain" />
      ) : (
        <div className="p-2">
          <InstitutionalPdfPreview url={url} fileName={file.name} />
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block text-sm font-semibold text-truffle-trouble underline"
          >
            Abrir PDF en otra pestaña
          </a>
        </div>
      )}
    </figure>
  );
}
