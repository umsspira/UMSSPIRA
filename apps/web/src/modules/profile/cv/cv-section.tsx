'use client';

import { AlertCircle, CheckCircle2, Eye, Lock, Plus } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { CvUploadError, NO_CV, getMyCvUrl, loadCv, uploadCv, type CvInfo } from './cv-service';
import { QueDatosVeEmpresaModal } from './que-datos-ve-empresa-modal';

const MAX_BYTES = 5 * 1024 * 1024;

export const CV_MESSAGES = {
  notPdf: 'El CV debe ser un archivo PDF',
  tooBig: 'El archivo supera el tamaño máximo de 5 MB',
  success: 'Tu CV se subió correctamente',
  failure: 'No se pudo subir el CV. Inténtalo nuevamente.',
  viewFailure: 'No se pudo abrir el CV. Inténtalo nuevamente.',
  privacy: 'Tu CV solo lo verán las empresas de las vacantes a las que postules',
} as const;

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${date.getFullYear()}`;
}

function formatSize(bytes: number | null): string {
  if (bytes === null) return '';
  return bytes >= 1024 * 1024
    ? ` · ${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`
    : ` · ${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** Mensaje del CA según la respuesta de la API (código INVALID_CV_TYPE o CV_TOO_LARGE, o 413). */
function uploadErrorMessage(reason: unknown): string {
  if (!(reason instanceof CvUploadError)) return CV_MESSAGES.failure;
  if (reason.code === 'INVALID_CV_TYPE' || reason.status === 415) return CV_MESSAGES.notPdf;
  if (reason.code === 'CV_TOO_LARGE' || reason.status === 413) return CV_MESSAGES.tooBig;
  return CV_MESSAGES.failure;
}

export function CvSection() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [cv, setCv] = useState<CvInfo>(NO_CV);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [opening, setOpening] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setCv(await loadCv());
    } catch {
      setCv(NO_CV);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    setError(null);
    setSuccess(null);
    if (!file) return;

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      setError(CV_MESSAGES.notPdf);
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(CV_MESSAGES.tooBig);
      return;
    }

    setUploading(true);
    try {
      await uploadCv(file);
      await refresh();
      setSuccess(CV_MESSAGES.success);
    } catch (reason) {
      setError(uploadErrorMessage(reason));
    } finally {
      setUploading(false);
    }
  }

  async function handleView() {
    if (opening) return;
    setError(null);
    setOpening(true);
    // La pestaña se abre antes de pedir el archivo para que el navegador no la bloquee
    const tab = window.open('', '_blank');
    try {
      const url = await getMyCvUrl();
      if (tab) {
        tab.location.href = url;
      } else {
        window.location.assign(url);
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      tab?.close();
      setError(CV_MESSAGES.viewFailure);
    } finally {
      setOpening(false);
    }
  }

  return (
    <section className="min-w-0 rounded-xl border border-oatmeal bg-white p-4 sm:p-6">
      {success && (
        <p
          role="status"
          className="mb-4 flex items-center gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800"
        >
          <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span>{success}</span>
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-abyssal-blue">Currículum (CV)</h2>
          <p className="mt-1 text-sm text-abyssal-blue/70">Formato PDF, hasta 5 MB</p>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-burning-flame px-4 text-sm font-bold text-abyssal-blue hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
          {uploading ? 'Subiendo…' : cv.hasFile ? 'Reemplazar CV' : 'Subir CV'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          data-testid="cv-file-input"
          onChange={handleChange}
        />
      </div>

      {error && (
        <p role="alert" className="mt-3 flex items-center gap-2 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}

      {cv.hasFile && (
        <div className="mt-4 flex min-w-0 flex-col gap-3 rounded-lg border border-oatmeal p-3 text-sm text-abyssal-blue sm:flex-row sm:items-center">
          <div className="flex min-w-0 items-center gap-3">
            <span className="shrink-0 rounded-md bg-red-50 px-2 py-1 text-xs font-bold text-red-700">PDF</span>
            <div className="min-w-0">
              <p className="break-all font-semibold">{cv.name}</p>
              <p className="text-abyssal-blue/70">
                Subido el {formatDate(cv.uploadedAt)}
                {formatSize(cv.sizeBytes)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleView}
            disabled={opening}
            className="inline-flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-md border border-oatmeal bg-white px-4 text-sm font-bold text-abyssal-blue hover:bg-palladian disabled:cursor-wait disabled:opacity-60 sm:ml-auto sm:h-9 sm:w-auto"
          >
            <Eye className="h-4 w-4 shrink-0" aria-hidden="true" />
            Ver CV
          </button>
        </div>
      )}

      <p className="mt-4 flex items-center gap-2 rounded-md bg-palladian p-3 text-sm text-abyssal-blue">
        <Lock className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{CV_MESSAGES.privacy}</span>
      </p>

      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="mt-3 text-sm font-semibold text-abyssal-blue underline"
      >
        ¿Qué datos ve la empresa?
      </button>

      <QueDatosVeEmpresaModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </section>
  );
}
