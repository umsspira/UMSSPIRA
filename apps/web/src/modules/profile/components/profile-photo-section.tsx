'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { AlertCircle, Check, Upload } from 'lucide-react';

import {
  PROFILE_PHOTO_ERROR_MESSAGE,
  PROFILE_PHOTO_MIME_TYPE,
  getProfileInitials,
  isValidProfilePhoto,
} from '@/modules/profile/utils/profile-photo-rules';
import { useProfilePhotoStore } from '@/shared/hooks/use-profile-photo-store';

const TOAST_DURATION_MS = 3000;

type ToastKind = 'success' | 'error';

type ProfilePhotoSectionProps = {
  // Nombre del titulado para el avatar con iniciales
  name: string;
};

export function ProfilePhotoSection({ name }: ProfilePhotoSectionProps) {
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const inputRef = useRef<HTMLInputElement>(null);
  const savedPhotoUrl = useProfilePhotoStore((state) => state.photoUrl);
  const loadPhoto = useProfilePhotoStore((state) => state.loadPhoto);
  const savePhoto = useProfilePhotoStore((state) => state.savePhoto);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<ToastKind | null>(null);

  // Foto guardada antes (sobrevive a recargar)
  useEffect(() => {
    void loadPhoto();
  }, [loadPhoto]);

  // Libera la vista previa anterior al cambiarla y al salir de la pantalla
  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  useEffect(() => {
    if (!toast) return;
    const timeoutId = setTimeout(() => setToast(null), TOAST_DURATION_MS);
    return () => clearTimeout(timeoutId);
  }, [toast]);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!isValidProfilePhoto(file)) {
      // Archivo rechazado: no queda elegido ni se muestra como vista previa
      setErrorMessage(PROFILE_PHOTO_ERROR_MESSAGE);
      setSelectedFile(null);
      setPreviewUrl(null);
      event.target.value = '';
      return;
    }
    setErrorMessage(null);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function handleSave() {
    if (!selectedFile) return;
    setIsSaving(true);
    try {
      await savePhoto(selectedFile);
      // La foto elegida pasa a ser la foto actual
      setSelectedFile(null);
      setPreviewUrl(null);
      if (inputRef.current) inputRef.current.value = '';
      setToast('success');
    } catch {
      setToast('error');
    } finally {
      setIsSaving(false);
    }
  }

  const shownPhotoUrl = previewUrl ?? savedPhotoUrl;

  return (
    <section
      aria-labelledby={`${inputId}-title`}
      className="flex flex-col gap-4 rounded-2xl border border-oatmeal bg-white p-5 sm:flex-row sm:items-center sm:gap-6"
    >
      <div className="mx-auto h-24 w-24 shrink-0 overflow-hidden rounded-full border border-oatmeal sm:mx-0">
        {shownPhotoUrl ? (
          // La foto es una URL local (blob:), por eso se usa img y no next/image
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={shownPhotoUrl}
            alt={previewUrl ? 'Vista previa de la foto de perfil' : 'Foto de perfil actual'}
            className="h-full w-full object-cover"
          />
        ) : (
          <span
            role="img"
            aria-label="Avatar con iniciales"
            className="flex h-full w-full items-center justify-center bg-blue-fantastic text-2xl font-semibold text-white"
          >
            {getProfileInitials(name)}
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-2">
        <h2 id={`${inputId}-title`} className="text-lg font-semibold text-blue-fantastic">
          Foto de perfil
        </h2>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={PROFILE_PHOTO_MIME_TYPE}
          aria-labelledby={`${inputId}-title`}
          aria-invalid={errorMessage ? true : undefined}
          aria-describedby={errorMessage ? errorId : undefined}
          onChange={handleFileChange}
          className="sr-only"
        />
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-oatmeal bg-white px-4 py-2 text-sm font-semibold text-blue-fantastic transition hover:bg-palladian sm:w-fit"
          >
            <Upload className="h-4 w-4" aria-hidden="true" />
            Elegir archivo
          </button>
          {selectedFile && (
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex w-full items-center justify-center rounded-lg bg-burning-flame px-4 py-2 text-sm font-bold text-abyssal-blue transition hover:brightness-95 disabled:opacity-60 sm:w-fit"
            >
              {isSaving ? 'Guardando…' : 'Guardar foto'}
            </button>
          )}
        </div>
        {errorMessage && (
          <p
            id={errorId}
            role="alert"
            className="flex items-center gap-1 rounded-md bg-[#FEF2F2] px-2 py-1 text-xs text-[#DC2626]"
          >
            <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {errorMessage}
          </p>
        )}
      </div>

      {toast === 'success' && (
        <div
          role="status"
          className="fixed bottom-6 left-4 right-4 z-50 flex items-center gap-2 rounded-lg border border-oatmeal bg-white px-4 py-3 text-sm font-semibold text-blue-fantastic shadow-lg sm:left-auto sm:right-6"
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-fantastic">
            <Check className="h-3.5 w-3.5 text-white" aria-hidden="true" />
          </span>
          Foto actualizada
        </div>
      )}
      {toast === 'error' && (
        <div
          role="alert"
          className="fixed bottom-6 left-4 right-4 z-50 flex items-center gap-2 rounded-lg bg-burning-flame/15 px-4 py-3 text-sm font-semibold text-blue-fantastic shadow-lg sm:left-auto sm:right-6"
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-truffle-trouble">
            <AlertCircle className="h-3.5 w-3.5 text-white" aria-hidden="true" />
          </span>
          No se pudo guardar la foto. Intenta de nuevo.
        </div>
      )}
    </section>
  );
}