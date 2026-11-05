'use client';

import '@/modules/reports/graduates/pdf/lib/pdf-worker';
import { useEffect, useState } from 'react';
import { Document, Page } from 'react-pdf';
import { Maximize, Minimize, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from 'lucide-react';

type Props = { url: string; fileName: string };

/** Visor institucional del resumen: controles propios sin la barra nativa de Chrome. */
export function InstitutionalPdfPreview({ url, fileName }: Props) {
  const [pages, setPages] = useState(0);
  const [page, setPage] = useState(1);
  const [scale, setScale] = useState(1);
  const [fullScreen, setFullScreen] = useState(false);

  useEffect(() => {
    setPages(0);
    setPage(1);
    setScale(1);
  }, [url]);

  useEffect(() => {
    if (!fullScreen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFullScreen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [fullScreen]);

  return (
    <div
      className={fullScreen
        ? 'fixed inset-0 z-50 flex flex-col bg-[#F5F1E9] p-4'
        : 'w-full min-w-0 overflow-hidden rounded-md bg-[#F5F1E9]'}
      aria-label={`Vista previa de ${fileName}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-oatmeal/70 bg-[#F1EDE5] px-3 py-3">
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-[#53483E]">
          <span className="uppercase tracking-wide">Vista previa institucional</span>
          <span className="rounded bg-white/70 px-2 py-1">Página {page} de {pages || '…'}</span>
          {pages > 1 && (
            <span className="inline-flex items-center gap-1">
              <button type="button" aria-label="Página anterior" disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded p-1 hover:bg-white disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
              <button type="button" aria-label="Página siguiente" disabled={page === pages}
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                className="rounded p-1 hover:bg-white disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-[#53483E]">
          <button type="button" aria-label="Alejar" disabled={scale <= 0.5}
            onClick={() => setScale((s) => Math.max(0.5, +(s - 0.1).toFixed(1)))}
            className="rounded p-1 hover:bg-white disabled:opacity-40"><ZoomOut className="h-4 w-4" /></button>
          <span aria-live="polite" className="min-w-10 text-center">{Math.round(scale * 100)}%</span>
          <button type="button" aria-label="Acercar" disabled={scale >= 2}
            onClick={() => setScale((s) => Math.min(2, +(s + 0.1).toFixed(1)))}
            className="rounded p-1 hover:bg-white disabled:opacity-40"><ZoomIn className="h-4 w-4" /></button>
          <button type="button" onClick={() => setFullScreen((v) => !v)}
            className="inline-flex items-center gap-1 rounded p-1 text-[11px] underline hover:bg-white">
            {fullScreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            {fullScreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          </button>
        </div>
      </div>
      <div className={fullScreen ? 'min-h-0 flex-1 overflow-auto p-4' : 'max-h-[520px] min-h-[280px] overflow-auto p-4'}>
        <Document
          file={url}
          loading={<p role="status" className="text-center text-sm">Cargando PDF...</p>}
          error={<p role="alert" className="text-center text-sm">No se pudo mostrar la vista previa del PDF.</p>}
          onLoadSuccess={({ numPages }) => {
            setPages(numPages);
            setPage((p) => Math.min(p, numPages));
          }}
        >
          <div className="mx-auto w-fit bg-white shadow-sm">
            <Page pageNumber={page} width={600} scale={scale} renderTextLayer={false} renderAnnotationLayer={false} />
          </div>
        </Document>
      </div>
    </div>
  );
}
